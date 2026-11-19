<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

/** Order lookups for customers. Every query is limited to the owner. */
class OrderService
{
    public function paginateForUser(User $user, int $perPage = 10): LengthAwarePaginator
    {
        return Order::where('user_id', $user->id)
            ->withCount('items')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    /**
     * IDOR protection: the owner is part of the query, so another customer's order
     * simply is not found. The answer is 404 (not 403), so order numbers cannot be probed.
     */
    public function findForUser(User $user, string $orderNumber): Order
    {
        return Order::where('user_id', $user->id)
            ->where('order_number', $orderNumber)
            ->with(['items.product.images', 'payments'])
            ->firstOrFail();
    }
}
