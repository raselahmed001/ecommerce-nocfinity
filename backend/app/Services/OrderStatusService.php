<?php

namespace App\Services;

use App\Events\OrderStatusChanged;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Services\Payment\PaymentGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Staff-driven order lifecycle:
 *   pending -> paid -> processing -> shipped -> delivered      (plus cancelled)
 *
 * "paid" is set only by a real payment (OrderPaymentService), never by staff.
 * Cancelling a paid order puts the stock back and refunds the payment.
 */
class OrderStatusService
{
    /** What staff may change an order to, from each status. */
    public const TRANSITIONS = [
        Order::PENDING => [Order::CANCELLED],
        Order::PAID => [Order::PROCESSING, Order::CANCELLED],
        Order::PROCESSING => [Order::SHIPPED, Order::CANCELLED],
        Order::SHIPPED => [Order::DELIVERED],
        Order::DELIVERED => [],
        Order::CANCELLED => [],
    ];

    /** Statuses in which stock has already been taken for the order. */
    private const STOCK_TAKEN = [Order::PAID, Order::PROCESSING];

    public function __construct(private readonly PaymentGateway $gateway) {}

    public function allowedNext(Order $order): array
    {
        return self::TRANSITIONS[$order->status] ?? [];
    }

    public function change(Order $order, string $to): Order
    {
        $refundIntent = null;
        $from = null;

        $order = DB::transaction(function () use ($order, $to, &$refundIntent, &$from) {
            $locked = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $locked->status;

            if (! in_array($to, self::TRANSITIONS[$from] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => ["An order that is {$from} cannot be changed to {$to}."],
                ]);
            }

            if ($to === Order::CANCELLED) {
                $refundIntent = $this->cancel($locked, $from);
            }

            $locked->status = $to;
            $locked->save();

            return $locked;
        });

        if ($refundIntent) {
            $this->refund($order, $refundIntent);
        }

        OrderStatusChanged::dispatch($order, $from, $to);

        app(\App\Services\ActivityLogger::class)->log('order.status_changed', "Order {$order->order_number}: {$from} to {$to}", $order, ['from' => $from, 'to' => $to]);

        return $order;
    }

    /**
     * Cancel inside the transaction: restore stock and the coupon use when the
     * order had been paid. Returns the Stripe intent id to refund (if any).
     */
    private function cancel(Order $order, string $from): ?string
    {
        $order->cancelled_at = now();

        if (! in_array($from, self::STOCK_TAKEN, true)) {
            return null; // a pending order never took stock or a coupon use
        }

        $items = $order->items()->get();

        // Lock products in id order (same order as checkout) to avoid deadlocks.
        $products = Product::withTrashed()
            ->whereIn('id', $items->pluck('product_id')->filter())
            ->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        foreach ($items as $item) {
            $products->get($item->product_id)?->increment('stock', $item->quantity);
        }

        if ($order->coupon_id) {
            Coupon::whereKey($order->coupon_id)->where('used_count', '>', 0)->decrement('used_count');
        }

        $payment = $order->payments()->where('status', 'succeeded')->latest('id')->first();
        $payment?->update(['status' => 'refund_pending']);

        return $payment?->stripe_payment_intent_id;
    }

    private function refund(Order $order, string $intentId): void
    {
        try {
            $this->gateway->refund($intentId);
            Payment::where('stripe_payment_intent_id', $intentId)->update(['status' => 'refunded']);
        } catch (Throwable $e) {
            Payment::where('stripe_payment_intent_id', $intentId)->update(['status' => 'refund_failed']);
            Log::critical('Refund failed. Refund this payment manually.', [
                'order' => $order->order_number, 'intent' => $intentId, 'error' => $e->getMessage(),
            ]);
        }
    }
}
