<?php

namespace App\Services\Admin;

use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class AdminOrderService
{
    /** @param  array<string, mixed>  $filters  status, q (order number / customer name / email), per_page */
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Order::query()->with('user:id,name,email')->withCount('items');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['q'])) {
            $like = '%'.addcslashes(trim($filters['q']), '%_\\').'%';

            $query->where(function (Builder $q) use ($like) {
                $q->where('order_number', 'like', $like)
                    ->orWhere('shipping_name', 'like', $like)
                    ->orWhereHas('user', fn (Builder $u) => $u->where('email', 'like', $like)->orWhere('name', 'like', $like));
            });
        }

        return $query->orderByDesc('id')->paginate((int) ($filters['per_page'] ?? 15));
    }

    public function load(Order $order): Order
    {
        return $order->load(['user:id,name,email', 'items', 'payments']);
    }
}
