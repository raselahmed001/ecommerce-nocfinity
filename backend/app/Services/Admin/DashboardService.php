<?php

namespace App\Services\Admin;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Collection;

class DashboardService
{
    /** Orders that count as real sales (payment received, not cancelled). */
    public const SALE_STATUSES = [Order::PAID, Order::PROCESSING, Order::SHIPPED, Order::DELIVERED];

    private const CHART_DAYS = 30;
    private const RECENT_ORDERS = 10;

    /** @return array<string, mixed> */
    public function overview(): array
    {
        $today = Order::whereIn('status', self::SALE_STATUSES)
            ->where('paid_at', '>=', now()->startOfDay())
            ->selectRaw('COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue')
            ->first();

        return [
            'stats' => [
                'todays_orders' => (int) $today->orders,
                'todays_revenue' => Money::format(Money::toCents($today->revenue)),
                'total_customers' => User::where('is_staff', false)->count(),
                'low_stock_count' => Product::where('is_active', true)
                    ->whereColumn('stock', '<=', 'low_stock_threshold')->count(),
            ],
            'sales_chart' => $this->salesChart(),
            'recent_orders' => Order::with('user:id,name,email')
                ->withCount('items')->orderByDesc('id')->limit(self::RECENT_ORDERS)->get(),
        ];
    }

    /** One entry per day for the last 30 days, with zeros on days without sales. */
    private function salesChart(): Collection
    {
        $from = now()->subDays(self::CHART_DAYS - 1)->startOfDay();

        $rows = Order::whereIn('status', self::SALE_STATUSES)
            ->where('paid_at', '>=', $from)
            ->selectRaw('DATE(paid_at) AS day, COUNT(*) AS orders, SUM(total) AS revenue')
            ->groupBy('day')->get()->keyBy('day');

        return collect(range(0, self::CHART_DAYS - 1))->map(function (int $i) use ($from, $rows) {
            $day = $from->copy()->addDays($i)->toDateString();
            $row = $rows->get($day);

            return [
                'date' => $day,
                'orders' => (int) ($row->orders ?? 0),
                'revenue' => Money::format(Money::toCents($row->revenue ?? 0)),
            ];
        });
    }
}
