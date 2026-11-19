<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class ProductService
{
    /** What the customer really pays: the discount price when there is one. */
    private const PRICE_SQL = 'COALESCE(discount_price, price)';

    private const DEFAULT_PER_PAGE = 12;
    private const RELATED_LIMIT = 4;

    /**
     * Storefront product list. Only active products are shown.
     * Every user value goes in as a bound parameter, never into the SQL text.
     *
     * @param  array{q?: ?string, category?: ?string, min_price?: mixed, max_price?: mixed,
     *               sort?: ?string, featured?: mixed, on_sale?: mixed, size?: ?string, color?: ?string, per_page?: mixed}  $filters
     */
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Product::query()
            ->where('is_active', true)
            ->with(['category:id,name,slug', 'images']); // eager load: no N+1

        $this->applySearch($query, $filters['q'] ?? null);
        $this->applyCategory($query, $filters['category'] ?? null);

        if (isset($filters['min_price'])) {
            $query->whereRaw(self::PRICE_SQL.' >= ?', [$filters['min_price']]);
        }
        if (isset($filters['max_price'])) {
            $query->whereRaw(self::PRICE_SQL.' <= ?', [$filters['max_price']]);
        }
        if (! empty($filters['featured'])) {
            $query->where('is_featured', true);
        }
        if (! empty($filters['on_sale'])) {
            $query->whereNotNull('discount_price');
        }
        // sizes / colors are JSON lists; the value is a bound parameter.
        if (! empty($filters['size'])) {
            $query->whereJsonContains('sizes', $filters['size']);
        }
        if (! empty($filters['color'])) {
            $query->whereJsonContains('colors', $filters['color']);
        }

        $this->applySort($query, $filters['sort'] ?? 'newest');

        return $query->paginate((int) ($filters['per_page'] ?? self::DEFAULT_PER_PAGE))->withQueryString();
    }

    /** One active product with its images and category. 404 when missing or inactive. */
    public function findActiveBySlug(string $slug): Product
    {
        return Product::query()
            ->where('is_active', true)
            ->where('slug', $slug)
            ->with(['category:id,name,slug', 'images'])
            ->firstOrFail();
    }

    /** Other active products from the same category. */
    public function related(Product $product): Collection
    {
        return Product::query()
            ->where('is_active', true)
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->id)
            ->with(['category:id,name,slug', 'images'])
            ->orderByDesc('is_featured')
            ->orderByDesc('id')
            ->limit(self::RELATED_LIMIT)
            ->get();
    }

    private function applySearch(Builder $query, ?string $term): void
    {
        if ($term === null || trim($term) === '') {
            return;
        }

        // Escape LIKE wildcards so "50%" or "a_b" are searched literally.
        $like = '%'.addcslashes(trim($term), '%_\\').'%';

        $query->where(function (Builder $q) use ($like) {
            $q->where('name', 'like', $like)
                ->orWhere('sku', 'like', $like)
                ->orWhere('description', 'like', $like);
        });
    }

    /** A parent category also includes the products of its sub-categories. */
    private function applyCategory(Builder $query, ?string $slug): void
    {
        if ($slug === null || $slug === '') {
            return;
        }

        $category = Category::where('slug', $slug)->where('is_active', true)->first();

        if (! $category) {
            $query->whereRaw('1 = 0'); // unknown or inactive category: no results
            return;
        }

        $ids = Category::where('parent_id', $category->id)->pluck('id')->push($category->id);
        $query->whereIn('category_id', $ids);
    }

    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'price_asc' => $query->orderByRaw(self::PRICE_SQL.' asc')->orderBy('id'),
            'price_desc' => $query->orderByRaw(self::PRICE_SQL.' desc')->orderBy('id'),
            'popular' => $query->orderByDesc('is_featured')->orderByDesc('rating')->orderByDesc('id'),
            default => $query->orderByDesc('created_at')->orderByDesc('id'), // newest
        };
    }
}
