<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Console\Command;

/**
 * Cancels orders that were started but never paid. A pending order holds no stock and no coupon use,
 * so cancelling only closes it (the customer gets the usual "cancelled" email). If the customer pays
 * later anyway, the payment code refunds it because the order is already cancelled.
 */
class ExpirePendingOrders extends Command
{
    protected $signature = 'orders:expire-pending';

    protected $description = 'Cancel pending orders that stayed unpaid for too long';

    public function handle(OrderStatusService $statuses): int
    {
        $before = now()->subHours(config('shop.pending_order_hours'));
        $count = 0;

        Order::where('status', Order::PENDING)->where('created_at', '<', $before)->orderBy('id')
            ->each(function (Order $order) use ($statuses, &$count) {
                $statuses->change($order, Order::CANCELLED);
                $count++;
            });

        $this->info("Cancelled {$count} unpaid order(s).");

        return self::SUCCESS;
    }
}
