<?php

namespace Database\Seeders;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrderSeeder extends Seeder
{
    /** Flat demo shipping fee. */
    private const SHIPPING = 5.00;

    /** Statuses where stock has already been taken out. */
    private const STOCK_TAKEN = [Order::PAID, Order::PROCESSING, Order::SHIPPED, Order::DELIVERED];

    /** [status, days ago] — spread over 30 days so the dashboard chart has data. */
    private const PLAN = [
        [Order::PAID, 0], [Order::PENDING, 0], [Order::PROCESSING, 1],
        [Order::PAID, 2], [Order::DELIVERED, 4], [Order::SHIPPED, 5],
        [Order::DELIVERED, 8], [Order::CANCELLED, 10], [Order::DELIVERED, 12],
        [Order::PROCESSING, 15], [Order::DELIVERED, 19], [Order::PENDING, 22],
        [Order::CANCELLED, 25], [Order::SHIPPED, 28],
    ];

    public function run(): void
    {
        if (Order::exists()) {
            return; // orders are not idempotent; use migrate:fresh --seed to reset
        }

        mt_srand(42); // same demo data on every run

        $customers = User::where('is_staff', false)->orderBy('id')->get();
        $products = Product::where('is_active', true)->where('stock', '>', 20)->get();
        $welcome = Coupon::where('code', 'WELCOME20')->first();

        foreach (self::PLAN as $i => [$status, $daysAgo]) {
            DB::transaction(function () use ($i, $status, $daysAgo, $customers, $products, $welcome) {
                $customer = $customers[$i % $customers->count()];
                $date = now()->subDays($daysAgo)->subMinutes(mt_rand(5, 600));

                // Pick 1-3 different products with a small quantity each.
                $picked = $products->shuffle()->take(mt_rand(1, 3));
                $lines = $picked->map(fn (Product $p) => [
                    'product' => $p,
                    'qty' => mt_rand(1, 2),
                    'unit' => (float) $p->currentPrice(),
                ]);

                $subtotal = round($lines->sum(fn ($l) => $l['unit'] * $l['qty']), 2);
                $coupon = ($i % 3 === 0 && $subtotal >= 50) ? $welcome : null;
                $discount = $coupon ? round($subtotal * 0.10, 2) : 0.00;
                $total = round($subtotal - $discount + self::SHIPPING, 2);

                $order = new Order([
                    'order_number' => 'TEMP-'.uniqid(), // replaced below once the id is known
                    'user_id' => $customer->id,
                    'status' => $status,
                    'subtotal' => $subtotal,
                    'discount_total' => $discount,
                    'shipping_total' => self::SHIPPING,
                    'total' => $total,
                    'coupon_id' => $coupon?->id,
                    'coupon_code' => $coupon?->code,
                    'shipping_name' => $customer->name,
                    'shipping_phone' => $customer->phone,
                    'shipping_address_line1' => 'House '.(10 + $i).', Road '.(1 + $i % 7),
                    'shipping_address_line2' => null,
                    'shipping_city' => 'Dhaka',
                    'shipping_state' => 'Dhaka',
                    'shipping_postal_code' => '1212',
                    'shipping_country' => 'BD',
                    'paid_at' => $status === Order::PENDING ? null : $date->copy()->addMinutes(3),
                    'cancelled_at' => $status === Order::CANCELLED ? $date->copy()->addHours(2) : null,
                ]);
                $order->created_at = $date;
                $order->updated_at = $date;
                $order->save();

                $order->order_number = Order::makeNumber($order->id, $date->year);
                $order->save();

                foreach ($lines as $line) {
                    $order->items()->create([
                        'product_id' => $line['product']->id,
                        'product_name' => $line['product']->name,
                        'sku' => $line['product']->sku,
                        'unit_price' => $line['unit'],
                        'quantity' => $line['qty'],
                        'line_total' => round($line['unit'] * $line['qty'], 2),
                    ]);

                    if (in_array($status, self::STOCK_TAKEN, true)) {
                        $line['product']->decrement('stock', $line['qty']);
                    }
                }

                if ($status !== Order::PENDING) {
                    // Fake Stripe ids, only for demo data.
                    $order->payments()->create([
                        'stripe_payment_intent_id' => 'pi_seed_'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
                        'amount' => $total,
                        'currency' => 'usd',
                        'status' => 'succeeded',
                    ]);
                }

                if ($coupon && $status !== Order::PENDING && $status !== Order::CANCELLED) {
                    $coupon->increment('used_count');
                }
            });
        }
    }
}
