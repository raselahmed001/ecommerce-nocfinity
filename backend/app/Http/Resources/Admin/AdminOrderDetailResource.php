<?php

namespace App\Http\Resources\Admin;

use App\Services\OrderStatusService;
use Illuminate\Http\Request;

/** @mixin \App\Models\Order */
class AdminOrderDetailResource extends AdminOrderResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'subtotal' => $this->subtotal,
            'discount_total' => $this->discount_total,
            'shipping_total' => $this->shipping_total,
            'coupon_code' => $this->coupon_code,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            // The admin UI shows only these as action buttons.
            'allowed_next_statuses' => OrderStatusService::TRANSITIONS[$this->status] ?? [],
            'shipping_address' => [
                'name' => $this->shipping_name,
                'phone' => $this->shipping_phone,
                'address_line1' => $this->shipping_address_line1,
                'address_line2' => $this->shipping_address_line2,
                'city' => $this->shipping_city,
                'state' => $this->shipping_state,
                'postal_code' => $this->shipping_postal_code,
                'country' => $this->shipping_country,
            ],
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'product_name' => $item->product_name,
                'sku' => $item->sku,
                'size' => $item->size,
                'color' => $item->color,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
            ])->values()),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn ($payment) => [
                'provider' => $payment->provider,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'failure_message' => $payment->failure_message,
                'created_at' => $payment->created_at?->toIso8601String(),
            ])->values()),
        ]);
    }
}
