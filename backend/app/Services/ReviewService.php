<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class ReviewService
{
    /** Order statuses that count as "bought it" (the order was paid for and not cancelled). */
    private const PURCHASED = [Order::PAID, Order::PROCESSING, Order::SHIPPED, Order::DELIVERED];

    public function paginate(Product $product, int $perPage = 10): LengthAwarePaginator
    {
        return $product->reviews()->with('user:id,name')->latest('id')->paginate($perPage);
    }

    /** Average, count and how many reviews gave each star. */
    public function summary(Product $product): array
    {
        $counts = $product->reviews()->selectRaw('rating, COUNT(*) as total')->groupBy('rating')->pluck('total', 'rating');

        return [
            'average' => $product->rating,
            'count' => (int) $product->reviews_count,
            'distribution' => collect(range(5, 1))->mapWithKeys(fn ($star) => [$star => (int) ($counts[$star] ?? 0)])->all(),
        ];
    }

    public function hasPurchased(User $user, Product $product): bool
    {
        return Order::where('user_id', $user->id)
            ->whereIn('status', self::PURCHASED)
            ->whereHas('items', fn ($q) => $q->where('product_id', $product->id))
            ->exists();
    }

    public function mine(User $user, Product $product): ?Review
    {
        return Review::where('user_id', $user->id)->where('product_id', $product->id)->first();
    }

    /** Only customers who bought the product can review it; a second review replaces the first. */
    public function save(User $user, Product $product, array $data): Review
    {
        if (! $this->hasPurchased($user, $product)) {
            throw new AccessDeniedHttpException('Only customers who bought this product can review it.');
        }

        return DB::transaction(function () use ($user, $product, $data) {
            $review = Review::updateOrCreate(
                ['user_id' => $user->id, 'product_id' => $product->id],
                ['rating' => $data['rating'], 'title' => $data['title'] ?? null, 'body' => $data['body']],
            );

            $this->refreshProduct($product);

            return $review;
        });
    }

    public function delete(Review $review): void
    {
        DB::transaction(function () use ($review) {
            $product = $review->product;
            $review->delete();
            $this->refreshProduct($product);
        });
    }

    /** Keep the numbers shown on product cards in step with the reviews. */
    public function refreshProduct(Product $product): void
    {
        $stats = $product->reviews()->selectRaw('COUNT(*) as total, AVG(rating) as average')->first();
        $count = (int) $stats->total;

        // With no reviews left the rating is cleared, so the card shows no stars.
        $product->forceFill([
            'reviews_count' => $count,
            'rating' => $count > 0 ? round((float) $stats->average, 1) : null,
        ])->saveQuietly();
    }
}
