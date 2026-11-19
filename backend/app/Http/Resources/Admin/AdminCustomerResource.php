<?php

namespace App\Http\Resources\Admin;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class AdminCustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            'orders_count' => $this->whenCounted('orders'),
            'total_spent' => Money::format(Money::toCents($this->total_spent ?? 0)),
            'joined_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
