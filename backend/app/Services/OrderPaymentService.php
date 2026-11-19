<?php

namespace App\Services;

use App\Events\OrderStatusChanged;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Services\Payment\PaymentGateway;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Throwable;

/**
 * Finishes an order after Stripe reports a successful payment.
 * Called from the confirm endpoint and from the webhook, so it must be safe to
 * run twice for the same payment (it is: the order row is locked and its status checked).
 */
class OrderPaymentService
{
    public function __construct(private readonly PaymentGateway $gateway) {}

    /**
     * Ask Stripe for the real state of the payment and finish the order if it succeeded.
     * Returns true when the order is paid, false when the payment is not completed.
     *
     * @throws ConflictHttpException when items sold out while the customer was paying
     */
    public function confirm(Order $order): bool
    {
        $payment = $order->payments()->latest('id')->first();
        if (! $payment) {
            return false;
        }

        $intent = $this->gateway->retrieveIntent($payment->stripe_payment_intent_id);

        if ($intent['status'] !== 'succeeded') {
            $this->recordStatus($payment, $intent['status'], $intent['failure_message'] ?? null);

            return false;
        }

        return $this->markPaid($order->id, $intent);
    }

    /** Webhook entry point: payment_intent.succeeded */
    public function handleSucceeded(array $intent): void
    {
        $payment = Payment::where('stripe_payment_intent_id', $intent['id'])->first();
        if (! $payment) {
            return; // not one of our payments
        }

        // Webhook payloads are trusted only after signature verification, but we
        // still re-read the intent from Stripe so the amount and status are real.
        $real = $this->gateway->retrieveIntent($intent['id']);
        if ($real['status'] === 'succeeded') {
            $this->markPaid($payment->order_id, $real);
        }
    }

    /** Webhook entry point: payment_intent.payment_failed. The order stays pending. */
    public function handleFailed(array $intent): void
    {
        $payment = Payment::where('stripe_payment_intent_id', $intent['id'])->first();

        if ($payment) {
            $this->recordStatus($payment, 'failed', $intent['failure_message'] ?? 'Payment failed.');
        }
    }

    /**
     * Mark the order paid and take the stock, all or nothing.
     *
     * Overselling protection: the order row and every product row are locked
     * (SELECT ... FOR UPDATE, always in id order so two checkouts cannot deadlock).
     * Stock is read again under the lock, so a stale add-to-cart check cannot cause an oversell.
     */
    private function markPaid(int $orderId, array $intent): bool
    {
        $soldOut = [];
        $refund = false;
        $paidNow = false;

        $order = DB::transaction(function () use ($orderId, $intent, &$soldOut, &$refund, &$paidNow) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $payment = $order->payments()->where('stripe_payment_intent_id', $intent['id'])->firstOrFail();

            if ($order->status === Order::PAID || in_array($order->status, [Order::PROCESSING, Order::SHIPPED, Order::DELIVERED], true)) {
                return $order; // already finished, nothing to do (idempotent)
            }

            if ($order->status === Order::CANCELLED) {
                // Money arrived for an order we already cancelled: give it back.
                $payment->update(['status' => 'refund_pending']);
                $refund = true;

                return $order;
            }

            // Never trust that "succeeded" is for the right amount.
            if ($intent['amount'] !== Money::toCents($order->total) || strtolower($intent['currency']) !== strtolower(config('shop.currency'))) {
                Log::warning('Payment amount does not match the order.', ['order_id' => $order->id, 'intent' => $intent['id']]);

                return $order;
            }

            $items = $order->items()->get();
            $products = Product::query()
                ->whereIn('id', $items->pluck('product_id')->filter())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // One product can appear on several lines (other size / color): check the total.
            $wanted = $items->groupBy('product_id')->map(fn ($rows) => $rows->sum('quantity'));

            foreach ($items->unique('product_id') as $item) {
                $product = $products->get($item->product_id);

                if (! $product || ! $product->is_active || $product->stock < $wanted[$item->product_id]) {
                    $soldOut[] = $item->product_name;
                }
            }

            if ($soldOut) {
                $order->update(['status' => Order::CANCELLED, 'cancelled_at' => now()]);
                $payment->update(['status' => 'refund_pending']);
                $refund = true;

                return $order;
            }

            foreach ($wanted as $productId => $quantity) {
                $products[$productId]->decrement('stock', $quantity);
            }

            if ($order->coupon_id) {
                Coupon::whereKey($order->coupon_id)->increment('used_count');
            }

            $order->update(['status' => Order::PAID, 'paid_at' => now()]);
            $payment->update(['status' => 'succeeded', 'failure_message' => null]);

            // The purchase is done: empty the customer's cart.
            $cart = Cart::where('user_id', $order->user_id)->first();
            $cart?->items()->delete();
            $cart?->update(['coupon_id' => null]);

            $paidNow = true;

            return $order;
        });

        if ($refund) {
            $this->refundPayment($order, $intent['id']);

            if ($soldOut) {
                OrderStatusChanged::dispatch($order, Order::PENDING, Order::CANCELLED);

                throw new ConflictHttpException(
                    'Sorry, these items sold out while you were paying: '.implode(', ', $soldOut)
                    .'. Your payment has been refunded.'
                );
            }

            return false;
        }

        if ($paidNow) {
            OrderStatusChanged::dispatch($order, Order::PENDING, Order::PAID);
        }

        return $order->fresh()->status !== Order::PENDING;
    }

    private function refundPayment(Order $order, string $intentId): void
    {
        try {
            $this->gateway->refund($intentId);
            Payment::where('stripe_payment_intent_id', $intentId)->update(['status' => 'refunded']);
        } catch (Throwable $e) {
            // Keep the payment flagged so staff can refund it by hand.
            Payment::where('stripe_payment_intent_id', $intentId)->update(['status' => 'refund_failed']);
            Log::critical('Refund failed. Refund this payment manually.', [
                'order' => $order->order_number, 'intent' => $intentId, 'error' => $e->getMessage(),
            ]);
        }
    }

    private function recordStatus(Payment $payment, string $status, ?string $failureMessage): void
    {
        // A finished payment is never moved back to a lower status.
        if (in_array($payment->status, ['succeeded', 'refunded', 'refund_pending', 'refund_failed'], true)) {
            return;
        }

        $payment->update(['status' => $status, 'failure_message' => $failureMessage ? mb_substr($failureMessage, 0, 250) : null]);
    }
}
