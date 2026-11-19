<?php

namespace Tests\Feature;

use App\Mail\OrderStatusMail;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderStatusService;
use App\Services\Payment\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakePaymentGateway;
use Tests\TestCase;

class OrderStatusTest extends TestCase
{
    use RefreshDatabase;

    private FakePaymentGateway $stripe;
    private Product $product;
    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->stripe = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->stripe);

        $category = Category::create(['name' => 'Phones', 'slug' => 'phones']);
        $this->product = Product::create([
            'category_id' => $category->id, 'name' => 'Phone', 'slug' => 'phone', 'sku' => 'P-1',
            'price' => '100.00', 'stock' => 10,
        ]);
        $this->customer = User::factory()->create();
        Sanctum::actingAs($this->customer, ['customer']);
    }

    /** Buy 2 units and pay, through the real API. */
    private function paidOrder(?Coupon $coupon = null): Order
    {
        $this->postJson('/api/v1/cart/items', ['product_id' => $this->product->id, 'quantity' => 2])->assertCreated();
        if ($coupon) {
            $this->postJson('/api/v1/cart/coupon', ['code' => $coupon->code])->assertOk();
        }
        $number = $this->postJson('/api/v1/checkout', [
            'name' => 'Rahim', 'phone' => '01711000001', 'address_line1' => 'Road 1',
            'city' => 'Dhaka', 'postal_code' => '1212', 'country' => 'BD',
        ])->assertCreated()->json('data.order_number');

        $this->stripe->succeed($this->stripe->lastIntentId());
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $number])->assertOk();

        return Order::where('order_number', $number)->first();
    }

    public function test_full_lifecycle_sends_an_email_for_every_step(): void
    {
        Mail::fake();
        $service = app(OrderStatusService::class);

        $order = $this->paidOrder();
        Mail::assertSent(OrderStatusMail::class, fn ($m) => $m->status === 'paid' && $m->hasTo($this->customer->email));

        foreach (['processing', 'shipped', 'delivered'] as $status) {
            $service->change($order, $status);
            Mail::assertSent(OrderStatusMail::class, fn ($m) => $m->status === $status && $m->hasTo($this->customer->email));
        }

        $this->assertSame('delivered', $order->fresh()->status);
        $this->assertSame(8, $this->product->fresh()->stock, 'delivered orders keep their stock deducted');
    }

    public function test_cancelling_a_paid_order_restores_stock_coupon_use_and_refunds(): void
    {
        Mail::fake();
        $coupon = Coupon::create(['code' => 'SAVE10', 'type' => 'percentage', 'value' => 10, 'is_active' => true, 'usage_limit' => 5]);
        $order = $this->paidOrder($coupon);

        $this->assertSame(8, $this->product->fresh()->stock);
        $this->assertSame(1, $coupon->fresh()->used_count);

        app(OrderStatusService::class)->change($order, 'cancelled');

        $order->refresh();
        $this->assertSame('cancelled', $order->status);
        $this->assertNotNull($order->cancelled_at);
        $this->assertSame(10, $this->product->fresh()->stock, 'stock is restored');
        $this->assertSame(0, $coupon->fresh()->used_count, 'coupon use is given back');
        $this->assertSame('refunded', $order->payments()->first()->status);
        $this->assertCount(1, $this->stripe->refunded);
        Mail::assertSent(OrderStatusMail::class, fn ($m) => $m->status === 'cancelled');
    }

    public function test_cancelling_a_pending_order_does_not_change_stock(): void
    {
        $this->postJson('/api/v1/cart/items', ['product_id' => $this->product->id, 'quantity' => 2])->assertCreated();
        $number = $this->postJson('/api/v1/checkout', [
            'name' => 'Rahim', 'phone' => '01711000001', 'address_line1' => 'Road 1',
            'city' => 'Dhaka', 'postal_code' => '1212', 'country' => 'BD',
        ])->json('data.order_number');
        $order = Order::where('order_number', $number)->first();

        app(OrderStatusService::class)->change($order, 'cancelled');

        $this->assertSame(10, $this->product->fresh()->stock, 'stock was never taken, so it must not grow');
        $this->assertSame([], $this->stripe->refunded);
    }

    public function test_a_cancelled_order_cannot_be_cancelled_twice(): void
    {
        $order = $this->paidOrder();
        $service = app(OrderStatusService::class);
        $service->change($order, 'cancelled');

        $this->expectException(ValidationException::class);
        try {
            $service->change($order->fresh(), 'cancelled');
        } finally {
            $this->assertSame(10, $this->product->fresh()->stock, 'stock must not be restored twice');
        }
    }

    public function test_invalid_transitions_are_rejected(): void
    {
        $order = $this->paidOrder();
        $service = app(OrderStatusService::class);

        foreach (['delivered', 'shipped', 'pending', 'paid'] as $bad) {
            try {
                $service->change($order->fresh(), $bad);
                $this->fail("paid -> $bad should not be allowed");
            } catch (ValidationException) {
                $this->assertSame('paid', $order->fresh()->status);
            }
        }
    }

    public function test_shipped_and_delivered_orders_cannot_be_cancelled(): void
    {
        $order = $this->paidOrder();
        $service = app(OrderStatusService::class);
        $service->change($order, 'processing');
        $service->change($order->fresh(), 'shipped');

        $this->expectException(ValidationException::class);
        $service->change($order->fresh(), 'cancelled');
    }

    public function test_a_failing_mail_server_does_not_break_the_status_change(): void
    {
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => '127.0.0.1', 'mail.mailers.smtp.port' => 1]); // nothing listens here
        $order = $this->paidOrder();

        $this->assertSame('paid', $order->status);
        app(OrderStatusService::class)->change($order, 'processing');
        $this->assertSame('processing', $order->fresh()->status);
    }

    public function test_unpaid_orders_expire_but_recent_and_paid_ones_stay(): void
    {
        $paid = $this->paidOrder();

        $this->postJson('/api/v1/cart/items', ['product_id' => $this->product->id, 'quantity' => 1])->assertCreated();
        $address = ['name' => 'Rahim', 'phone' => '01711000001', 'address_line1' => 'Road 1', 'city' => 'Dhaka', 'postal_code' => '1212', 'country' => 'BD'];
        $old = Order::where('order_number', $this->postJson('/api/v1/checkout', $address)->assertCreated()->json('data.order_number'))->first();
        $old->forceFill(['created_at' => now()->subHours(30)])->save();

        $this->postJson('/api/v1/cart/items', ['product_id' => $this->product->id, 'quantity' => 1])->assertCreated();
        $recent = Order::where('order_number', $this->postJson('/api/v1/checkout', $address)->assertCreated()->json('data.order_number'))->first();

        $stockBefore = $this->product->fresh()->stock;
        $this->artisan('orders:expire-pending')->expectsOutput('Cancelled 1 unpaid order(s).')->assertSuccessful();

        $this->assertSame('cancelled', $old->fresh()->status);
        $this->assertSame('pending', $recent->fresh()->status);
        $this->assertSame('paid', $paid->fresh()->status);
        $this->assertSame($stockBefore, $this->product->fresh()->stock, 'a pending order never took stock, so nothing is restored');
    }
}
