<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Services\ReviewService;
use Illuminate\Database\Seeder;

/** A few reviews, only from customers whose paid order contains the product (like real rules). */
class ReviewSeeder extends Seeder
{
    private const REVIEWS = [
        [5, 'Love it', 'Great quality and it fits perfectly. Arrived earlier than expected.'],
        [4, 'Very good', 'Nice material and a good price. The color is slightly different from the photo.'],
        [5, 'Worth every penny', 'I bought a second one for a friend. Highly recommended.'],
        [3, 'It is okay', 'Decent for the price, but the stitching could be better.'],
        [4, 'Happy with it', 'Comfortable and looks good. Delivery was quick.'],
        [5, 'Perfect', 'Exactly what I was looking for. Will order again.'],
        [2, 'Not what I expected', 'The size runs small. Customer support helped me, though.'],
    ];

    public function run(): void
    {
        if (Review::exists()) {
            return;
        }

        $service = app(ReviewService::class);
        $orders = Order::with('items')
            ->whereIn('status', [Order::DELIVERED, Order::SHIPPED, Order::PROCESSING, Order::PAID])
            ->orderBy('id')
            ->get();

        $i = 0;
        foreach ($orders as $order) {
            foreach ($order->items->take(2) as $item) {
                $exists = Review::where('user_id', $order->user_id)->where('product_id', $item->product_id)->exists();

                if ($exists || ! Product::whereKey($item->product_id)->exists()) {
                    continue;
                }

                [$rating, $title, $body] = self::REVIEWS[$i++ % count(self::REVIEWS)];

                Review::create([
                    'user_id' => $order->user_id,
                    'product_id' => $item->product_id,
                    'rating' => $rating,
                    'title' => $title,
                    'body' => $body,
                ]);
            }
        }

        Product::whereIn('id', Review::pluck('product_id')->unique())->get()->each(fn (Product $p) => $service->refreshProduct($p));
    }
}
