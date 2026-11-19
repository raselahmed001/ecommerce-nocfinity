<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/**
 * Order page for the customer. No payment provider ids or internal fields.
 *
 * @mixin \App\Models\Order
 */
class OrderDetailResource extends OrderResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
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
                'product_name' => $item->product_name,
                'sku' => $item->sku,
                'size' => $item->size,
                'color' => $item->color,
                'slug' => $item->product?->slug,
                'image' => $item->product?->primaryImageUrl(),
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
            ])->values()),
            'payment_status' => $this->whenLoaded('payments', fn () => $this->payments->sortByDesc('id')->first()?->status),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
        ]);
    }
}
