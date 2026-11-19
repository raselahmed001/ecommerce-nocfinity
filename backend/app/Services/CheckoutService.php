<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Services\Payment\PaymentGateway;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Turns a cart into a PENDING order and a Stripe payment intent.
 * Totals are calculated here from the database, never taken from the request.
 * Stock is NOT taken yet: that happens only when payment succeeds (OrderPaymentService).
 */
class CheckoutService
{
    public function __construct(
        private readonly CartPricingService $pricing,
        private readonly PaymentGateway $gateway,
    ) {}

    /**
     * @param  array<string, mixed>  $shipping  validated shipping fields
     * @return array{order: Order, client_secret: string, payment_intent_id: string}
     */
    public function start(User $user, array $shipping): array
    {
        $cart = Cart::where('user_id', $user->id)->with(['items.product', 'coupon'])->first();

        if (! $cart || $cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => ['Your cart is empty.']]);
        }

        $priced = $this->pricing->calculate($cart);

        if ($priced['has_issues']) {
            $problems = collect($priced['lines'])
                ->filter(fn ($line) => $line['issue'])
                ->map(fn ($line) => ($line['item']->product?->name ?? 'A product').': '.$line['issue'])
                ->values()->all();

            throw ValidationException::withMessages(['cart' => $problems]);
        }

        // A coupon that expired or hit its limit since it was applied is rejected here.
        if ($priced['coupon'] && $priced['coupon_error']) {
            throw ValidationException::withMessages(['coupon' => [$priced['coupon_error']]]);
        }

        $order = $this->createPendingOrder($user, $shipping, $priced);

        try {
            $intent = $this->gateway->createIntent(
                $priced['total_cents'],
                config('shop.currency'),
                ['order_id' => (string) $order->id, 'order_number' => $order->order_number],
                'order-'.$order->id,
            );
        } catch (Throwable $e) {
            Log::error('Could not create the payment intent.', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            $order->delete(); // nothing was charged and no stock was touched
            throw new HttpException(502, 'The payment service is unavailable. Please try again later.');
        }

        Payment::create([
            'order_id' => $order->id,
            'provider' => 'stripe',
            'stripe_payment_intent_id' => $intent['id'],
            'amount' => Money::format($priced['total_cents']),
            'currency' => config('shop.currency'),
            'status' => $intent['status'],
        ]);

        return ['order' => $order, 'client_secret' => $intent['client_secret'], 'payment_intent_id' => $intent['id']];
    }

    private function createPendingOrder(User $user, array $shipping, array $priced): Order
    {
        return DB::transaction(function () use ($user, $shipping, $priced) {
            $coupon = $priced['coupon'];

            $order = Order::create([
                'order_number' => 'TEMP-'.uniqid(), // replaced once the id is known
                'user_id' => $user->id,
                'status' => Order::PENDING,
                'subtotal' => Money::format($priced['subtotal_cents']),
                'discount_total' => Money::format($priced['discount_cents']),
                'shipping_total' => Money::format($priced['shipping_cents']),
                'total' => Money::format($priced['total_cents']),
                'coupon_id' => $coupon?->id,
                'coupon_code' => $coupon?->code,
                'shipping_name' => $shipping['name'],
                'shipping_phone' => $shipping['phone'],
                'shipping_address_line1' => $shipping['address_line1'],
                'shipping_address_line2' => $shipping['address_line2'] ?? null,
                'shipping_city' => $shipping['city'],
                'shipping_state' => $shipping['state'] ?? null,
                'shipping_postal_code' => $shipping['postal_code'],
                'shipping_country' => strtoupper($shipping['country']),
            ]);

            $order->update(['order_number' => Order::makeNumber($order->id)]);

            foreach ($priced['lines'] as $line) {
                $product = $line['item']->product;

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku,
                    'size' => $line['item']->size ?: null,
                    'color' => $line['item']->color ?: null,
                    'unit_price' => Money::format($line['unit_cents']),
                    'quantity' => $line['item']->quantity,
                    'line_total' => Money::format($line['line_cents']),
                ]);
            }

            return $order;
        });
    }
}
