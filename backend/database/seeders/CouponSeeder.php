<?php

namespace Database\Seeders;

use App\Models\Coupon;
use Illuminate\Database\Seeder;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        $coupons = [
            // 10% off orders of 50 or more.
            ['code' => 'WELCOME20', 'type' => 'percentage', 'value' => 20, 'min_order_amount' => 50,
                'usage_limit' => 100, 'starts_at' => now()->subMonth(), 'expires_at' => now()->addMonths(6)],
            // 20 off orders of 100 or more.
            ['code' => 'FLAT20', 'type' => 'fixed', 'value' => 20, 'min_order_amount' => 100,
                'usage_limit' => null, 'starts_at' => now()->subMonth(), 'expires_at' => now()->addMonths(3)],
            // Already expired, useful for testing that expired coupons are rejected.
            ['code' => 'EXPIRED50', 'type' => 'percentage', 'value' => 50, 'min_order_amount' => 0,
                'usage_limit' => 10, 'starts_at' => now()->subMonths(3), 'expires_at' => now()->subMonth()],
        ];

        foreach ($coupons as $data) {
            Coupon::updateOrCreate(['code' => $data['code']], $data + ['is_active' => true]);
        }
    }
}
