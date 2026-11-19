<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\Payment\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakePaymentGateway;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private FakePaymentGateway $stripe;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->stripe = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->stripe);
        $this->category = Category::create(['name' => 'Phones', 'slug' => 'phones']);
    }

    private function product(int $stock = 5, string $price = '100.00', ?string $discount = null): Product
    {
        static $n = 0;
        $n++;

        return Product::create([
            'category_id' => $this->category->id, 'name' => "Product $n", 'slug' => "product-$n",
            'sku' => "SKU-$n", 'price' => $price, 'discount_price' => $discount, 'stock' => $stock,
        ]);
    }

    private function customer(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['customer']);

        return $user;
    }

    private function address(array $override = []): array
    {
        return array_merge([
            'name' => 'Rahim Uddin', 'phone' => '01711000001', 'address_line1' => 'House 1, Road 2',
            'city' => 'Dhaka', 'postal_code' => '1212', 'country' => 'BD',
        ], $override);
    }

    private function addToCart(Product $p, int $qty = 1): void
    {
        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => $qty])->assertCreated();
    }

    /** Checkout + pretend the customer paid at Stripe. Returns the order number. */
    private function startCheckout(array $extra = []): string
    {
        $response = $this->postJson('/api/v1/checkout', $this->address() + $extra)->assertCreated();

        return $response->json('data.order_number');
    }

    public function test_checkout_creates_a_pending_order_and_does_not_touch_stock(): void
    {
        $p = $this->product(stock: 5, price: '100.00');
        $this->customer();
        $this->addToCart($p, 2);

        $number = $this->startCheckout();

        $order = Order::where('order_number', $number)->first();
        $this->assertSame('pending', $order->status);
        $this->assertSame('205.00', $order->total); // 2 x 100 + 5 shipping
        $this->assertSame(5, $p->fresh()->stock, 'stock must not change before payment');
        $this->assertMatchesRegularExpression('/^ORD-\d{4}-\d{6}$/', $number);
    }

    public function test_client_sent_prices_and_totals_are_ignored(): void
    {
        $p = $this->product(price: '100.00');
        $this->customer();
        $this->addToCart($p, 1);

        $number = $this->startCheckout(['total' => '0.01', 'subtotal' => '0.01', 'price' => '0.01', 'status' => 'paid']);

        $order = Order::where('order_number', $number)->first();
        $this->assertSame('105.00', $order->total);
        $this->assertSame('pending', $order->status);
        $this->assertSame(10500, $this->stripe->intents[$this->stripe->lastIntentId()]['amount']);
    }

    public function test_successful_payment_marks_paid_decrements_stock_and_clears_the_cart(): void
    {
        $p = $this->product(stock: 5);
        $this->customer();
        $this->addToCart($p, 2);
        $number = $this->startCheckout();

        $this->stripe->succeed($this->stripe->lastIntentId());
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $number])
            ->assertOk()->assertJsonPath('data.status', 'paid');

        $this->assertSame(3, $p->fresh()->stock);
        $this->getJson('/api/v1/cart')->assertJsonPath('data.item_count', 0);
        $this->assertSame('succeeded', Order::where('order_number', $number)->first()->payments()->first()->status);
    }

    public function test_failed_payment_does_not_create_a_paid_order(): void
    {
        $p = $this->product(stock: 5);
        $this->customer();
        $this->addToCart($p, 1);
        $number = $this->startCheckout();

        $this->stripe->fail($this->stripe->lastIntentId());
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $number])->assertStatus(402);

        $order = Order::where('order_number', $number)->first();
        $this->assertSame('pending', $order->status);
        $this->assertNull($order->paid_at);
        $this->assertSame(5, $p->fresh()->stock);
        $this->assertSame('Your card was declined.', $order->payments()->first()->failure_message);
    }

    public function test_overselling_is_rejected_and_the_payment_is_refunded(): void
    {
        $p = $this->product(stock: 2);

        // Customer A checks out and pays for the last 2 units...
        $this->customer();
        $this->addToCart($p, 2);
        $numberA = $this->startCheckout();
        $intentA = $this->stripe->lastIntentId();

        // ...but customer B buys them first.
        $this->customer();
        $this->addToCart($p, 2);
        $numberB = $this->startCheckout();
        $this->stripe->succeed($this->stripe->lastIntentId());
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $numberB])->assertOk();
        $this->assertSame(0, $p->fresh()->stock);

        // A's payment now arrives: must be rejected with a clear message.
        $a = Order::where('order_number', $numberA)->first()->user;
        Sanctum::actingAs($a, ['customer']);
        $this->stripe->succeed($intentA);
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $numberA])
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sold out') && str_contains($m, 'refunded'));

        $orderA = Order::where('order_number', $numberA)->first();
        $this->assertSame('cancelled', $orderA->status);
        $this->assertSame(0, $p->fresh()->stock, 'stock must never go negative');
        $this->assertContains($intentA, $this->stripe->refunded);
        $this->assertSame('refunded', $orderA->payments()->first()->status);
    }

    public function test_checkout_rejects_an_out_of_stock_cart(): void
    {
        $p = $this->product(stock: 3);
        $this->customer();
        $this->addToCart($p, 3);
        $p->update(['stock' => 0]); // sold out after it was added to the cart

        $this->postJson('/api/v1/checkout', $this->address())
            ->assertStatus(422)->assertJsonValidationErrors('cart');
        $this->assertSame(0, Order::count());
    }

    public function test_an_expired_coupon_is_rejected_at_checkout(): void
    {
        $p = $this->product(price: '100.00');
        $coupon = Coupon::create(['code' => 'SAVE10', 'type' => 'percentage', 'value' => 10, 'is_active' => true,
            'expires_at' => now()->addDay()]);
        $this->customer();
        $this->addToCart($p, 1);
        $this->postJson('/api/v1/cart/coupon', ['code' => 'SAVE10'])->assertOk()->assertJsonPath('data.total', '95.00');

        $coupon->update(['expires_at' => now()->subMinute()]); // expires between cart and checkout

        $this->postJson('/api/v1/checkout', $this->address())
            ->assertStatus(422)->assertJsonValidationErrors('coupon');
        $this->assertSame(0, Order::count());
    }

    public function test_coupon_usage_is_counted_only_after_payment(): void
    {
        $p = $this->product(price: '100.00');
        $coupon = Coupon::create(['code' => 'SAVE10', 'type' => 'percentage', 'value' => 10, 'is_active' => true, 'usage_limit' => 5]);
        $this->customer();
        $this->addToCart($p, 1);
        $this->postJson('/api/v1/cart/coupon', ['code' => 'SAVE10'])->assertOk();
        $number = $this->startCheckout();

        $this->assertSame(0, $coupon->fresh()->used_count);

        $this->stripe->succeed($this->stripe->lastIntentId());
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $number])->assertOk();

        $this->assertSame(1, $coupon->fresh()->used_count);
        $this->assertSame('95.00', Order::where('order_number', $number)->first()->total);
    }

    public function test_a_payment_for_the_wrong_amount_does_not_mark_the_order_paid(): void
    {
        $p = $this->product(stock: 5, price: '100.00');
        $this->customer();
        $this->addToCart($p, 1);
        $number = $this->startCheckout();

        $id = $this->stripe->lastIntentId();
        $this->stripe->intents[$id]['amount'] = 100; // someone paid $1.00
        $this->stripe->succeed($id);

        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $number])->assertStatus(402);
        $this->assertSame('pending', Order::where('order_number', $number)->first()->status);
        $this->assertSame(5, $p->fresh()->stock);
    }

    public function test_customers_can_only_see_their_own_orders(): void
    {
        $p = $this->product();
        $owner = $this->customer();
        $this->addToCart($p, 1);
        $number = $this->startCheckout();

        $this->getJson("/api/v1/orders/$number")->assertOk()->assertJsonPath('data.order_number', $number);

        $this->customer(); // a different customer
        $this->getJson("/api/v1/orders/$number")->assertNotFound();
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $number])->assertNotFound();
        $this->getJson('/api/v1/orders')->assertOk()->assertJsonPath('meta.total', 0);

        Sanctum::actingAs($owner, ['customer']);
        $this->getJson('/api/v1/orders')->assertJsonPath('meta.total', 1);
    }

    public function test_order_responses_do_not_leak_payment_or_user_internals(): void
    {
        $p = $this->product();
        $this->customer();
        $this->addToCart($p, 1);
        $number = $this->startCheckout();

        $body = $this->getJson("/api/v1/orders/$number")->assertOk()->getContent();

        foreach (['pi_fake', 'client_secret', 'password', 'stripe', 'user_id'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }
    }

    public function test_checkout_strips_html_from_the_address(): void
    {
        $p = $this->product();
        $this->customer();
        $this->addToCart($p, 1);

        $number = $this->startCheckout(['name' => '<script>alert(1)</script>Rahim', 'city' => '<b>Dhaka</b>']);

        $order = Order::where('order_number', $number)->first();
        $this->assertStringNotContainsString('<', $order->shipping_name);
        $this->assertSame('Dhaka', $order->shipping_city);
    }

    public function test_checkout_needs_a_customer_login_and_a_valid_address(): void
    {
        $this->postJson('/api/v1/checkout', $this->address())->assertUnauthorized();

        $this->customer();
        $this->postJson('/api/v1/checkout', $this->address())->assertStatus(422); // empty cart
        $this->postJson('/api/v1/checkout', ['name' => 'X'])->assertStatus(422)->assertJsonValidationErrors(['phone', 'city']);
    }

    public function test_webhook_needs_a_valid_signature_and_is_idempotent(): void
    {
        $p = $this->product(stock: 5);
        $this->customer();
        $this->addToCart($p, 2);
        $number = $this->startCheckout();
        $id = $this->stripe->lastIntentId();
        $this->stripe->succeed($id);

        $payload = ['type' => 'payment_intent.succeeded', 'intent' => ['id' => $id]];

        $this->postJson('/api/v1/webhooks/stripe', $payload, ['Stripe-Signature' => 'forged'])->assertStatus(400);
        $this->assertSame('pending', Order::where('order_number', $number)->first()->status);

        // Stripe sends the same event twice: stock must only be taken once.
        $this->postJson('/api/v1/webhooks/stripe', $payload, ['Stripe-Signature' => 'valid-signature'])->assertOk();
        $this->postJson('/api/v1/webhooks/stripe', $payload, ['Stripe-Signature' => 'valid-signature'])->assertOk();

        $this->assertSame('paid', Order::where('order_number', $number)->first()->status);
        $this->assertSame(3, $p->fresh()->stock);
    }

    public function test_a_product_with_sizes_needs_a_valid_size_and_color(): void
    {
        $p = $this->product(stock: 10);
        $p->update(['sizes' => ['Small', 'Large'], 'colors' => ['Red', 'Blue']]);
        $this->customer();

        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 1])
            ->assertStatus(422)->assertJsonValidationErrors(['size']);
        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 1, 'size' => 'Huge', 'color' => 'Red'])
            ->assertStatus(422)->assertJsonValidationErrors(['size']);
        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 1, 'size' => 'Large', 'color' => 'Pink'])
            ->assertStatus(422)->assertJsonValidationErrors(['color']);

        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 1, 'size' => 'Large', 'color' => 'Red'])
            ->assertCreated()
            ->assertJsonPath('data.items.0.size', 'Large')
            ->assertJsonPath('data.items.0.color', 'Red');
    }

    public function test_the_same_product_in_two_sizes_shares_one_stock(): void
    {
        $p = $this->product(stock: 3);
        $p->update(['sizes' => ['Small', 'Large']]);
        $this->customer();

        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 2, 'size' => 'Small'])->assertCreated();
        // 2 Small + 2 Large = 4 but only 3 exist.
        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 2, 'size' => 'Large'])
            ->assertStatus(422)->assertJsonValidationErrors(['quantity']);
        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 1, 'size' => 'Large'])->assertCreated();

        $cart = $this->getJson('/api/v1/cart')->assertJsonPath('data.item_count', 3);
        $this->assertCount(2, $cart->json('data.items'));
    }

    public function test_order_items_keep_the_size_and_color_and_stock_is_taken_once_per_product(): void
    {
        $p = $this->product(stock: 5);
        $p->update(['sizes' => ['Small', 'Large'], 'colors' => ['Red']]);
        $this->customer();
        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 2, 'size' => 'Small', 'color' => 'Red'])->assertCreated();
        $this->postJson('/api/v1/cart/items', ['product_id' => $p->id, 'quantity' => 1, 'size' => 'Large', 'color' => 'Red'])->assertCreated();
        $number = $this->startCheckout();

        $this->stripe->succeed($this->stripe->lastIntentId());
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $number])->assertOk()->assertJsonPath('data.status', 'paid');

        $this->assertSame(2, $p->fresh()->stock); // 5 - (2 + 1)
        $items = $this->getJson("/api/v1/orders/$number")->json('data.items');
        $this->assertEqualsCanonicalizing(['Small', 'Large'], array_column($items, 'size'));
        $this->assertSame(['Red', 'Red'], array_column($items, 'color'));
    }
}
