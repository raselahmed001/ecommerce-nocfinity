<?php

namespace App\Services\Admin;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

/** Customers only: staff accounts are never listed here. */
class AdminCustomerService
{
    public function paginate(?string $search, int $perPage = 15): LengthAwarePaginator
    {
        $query = User::query()
            ->where('is_staff', false)
            ->withCount('orders')
            ->withSum(['orders as total_spent' => fn (Builder $q) => $q->whereIn('status', DashboardService::SALE_STATUSES)], 'total');

        if ($search !== null && trim($search) !== '') {
            $like = '%'.addcslashes(trim($search), '%_\\').'%';
            $query->where(fn (Builder $q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('phone', 'like', $like));
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }

    /** A customer with order count and total spent. 404 for staff ids. */
    public function find(int $id): User
    {
        return User::where('is_staff', false)
            ->withCount('orders')
            ->withSum(['orders as total_spent' => fn (Builder $q) => $q->whereIn('status', DashboardService::SALE_STATUSES)], 'total')
            ->findOrFail($id);
    }

    /** One page of a customer's order history. 404 for staff ids. */
    public function orders(int $id, int $perPage = 10): LengthAwarePaginator
    {
        User::where('is_staff', false)->findOrFail($id);

        return Order::where('user_id', $id)->withCount('items')->orderByDesc('id')->paginate($perPage);
    }
}
