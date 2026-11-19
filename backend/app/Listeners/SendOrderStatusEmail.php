<?php

namespace App\Listeners;

use App\Events\OrderStatusChanged;
use App\Mail\OrderStatusMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/** Emails the customer whenever their order changes status. */
class SendOrderStatusEmail
{
    public function handle(OrderStatusChanged $event): void
    {
        if (! OrderStatusMail::supports($event->to)) {
            return;
        }

        try {
            $order = $event->order->loadMissing(['user', 'items']);

            Mail::to($order->user->email)->send(new OrderStatusMail($order, $event->to));
        } catch (Throwable $e) {
            // A mail problem must never undo a paid order or a status change.
            Log::error('Order status email failed.', [
                'order' => $event->order->order_number, 'status' => $event->to, 'error' => $e->getMessage(),
            ]);
        }
    }
}
