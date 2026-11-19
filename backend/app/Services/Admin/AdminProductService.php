<?php

namespace App\Services\Admin;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminProductService
{
    public const MAX_IMAGES = 8;

    /** @param  array<string, mixed>  $filters  q, category_id, status (active|inactive), stock (low|out), per_page */
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Product::query()->with(['category:id,name,slug', 'images']);

        if (! empty($filters['q'])) {
            $like = '%'.addcslashes(trim($filters['q']), '%_\\').'%';
            $query->where(fn (Builder $q) => $q->where('name', 'like', $like)->orWhere('sku', 'like', $like));
        }
        if (! empty($filters['category_id'])) {
            $ids = Category::where('parent_id', $filters['category_id'])->pluck('id')->push((int) $filters['category_id']);
            $query->whereIn('category_id', $ids);
        }
        match ($filters['status'] ?? null) {
            'active' => $query->where('is_active', true),
            'inactive' => $query->where('is_active', false),
            default => null,
        };
        match ($filters['stock'] ?? null) {
            'low' => $query->where('stock', '>', 0)->whereColumn('stock', '<=', 'low_stock_threshold'),
            'out' => $query->where('stock', 0),
            default => null,
        };

        return $query->orderByDesc('id')->paginate((int) ($filters['per_page'] ?? 15));
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $images
     */
    public function create(array $data, array $images = []): Product
    {
        $data['slug'] = $this->uniqueSlug($data['name']);

        return DB::transaction(function () use ($data, $images) {
            $product = Product::create($data);
            $this->storeImages($product, $images);

            return $product->load(['category:id,name,slug', 'images']);
        });
    }

    /** @param  array<string, mixed>  $data */
    public function update(Product $product, array $data): Product
    {
        $product->update($data); // the slug stays the same so existing links keep working

        return $product->load(['category:id,name,slug', 'images']);
    }

    public function delete(Product $product): void
    {
        $product->delete(); // soft delete: old orders keep their reference
    }

    /** @param  list<UploadedFile>  $files */
    public function addImages(Product $product, array $files): Product
    {
        DB::transaction(fn () => $this->storeImages($product, $files));

        return $product->load(['category:id,name,slug', 'images']);
    }

    public function deleteImage(Product $product, int $imageId): Product
    {
        $image = $product->images()->findOrFail($imageId); // only this product's images

        DB::transaction(function () use ($product, $image) {
            $wasPrimary = $image->is_primary;
            $this->deleteFile($image);
            $image->delete();

            if ($wasPrimary) {
                $product->images()->orderBy('sort_order')->first()?->update(['is_primary' => true]);
            }
        });

        return $product->load(['category:id,name,slug', 'images']);
    }

    public function setPrimaryImage(Product $product, int $imageId): Product
    {
        $image = $product->images()->findOrFail($imageId);

        DB::transaction(function () use ($product, $image) {
            $product->images()->update(['is_primary' => false]);
            $image->update(['is_primary' => true]);
        });

        return $product->load(['category:id,name,slug', 'images']);
    }

    /** @param  list<UploadedFile>  $files */
    private function storeImages(Product $product, array $files): void
    {
        if (! $files) {
            return;
        }

        $existing = $product->images()->count();
        if ($existing + count($files) > self::MAX_IMAGES) {
            throw ValidationException::withMessages(['images' => ['A product can have at most '.self::MAX_IMAGES.' images.']]);
        }

        foreach (array_values($files) as $i => $file) {
            $product->images()->create([
                // hashName() gives a random file name, so the client's file name is never used.
                'path' => $file->storePublicly("products/{$product->id}", 'public'),
                'is_primary' => $existing === 0 && $i === 0,
                'sort_order' => $existing + $i + 1,
            ]);
        }
    }

    private function deleteFile(ProductImage $image): void
    {
        if (! str_starts_with($image->path, 'http')) { // seeded demo images are remote URLs
            Storage::disk('public')->delete($image->path);
        }
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'product';
        $slug = $base;

        for ($i = 2; Product::withTrashed()->where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }
}
