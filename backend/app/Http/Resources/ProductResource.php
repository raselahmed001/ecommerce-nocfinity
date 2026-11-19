<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Product card used in lists. Internal fields (low-stock threshold, timestamps)
 * are not exposed to customers.
 *
 * @mixin \App\Models\Product
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'price' => $this->price,
            'discount_price' => $this->discount_price,
            'current_price' => $this->currentPrice(),
            'stock' => $this->stock,
            'in_stock' => $this->stock > 0,
            'is_featured' => $this->is_featured,
            'rating' => $this->rating,
            'reviews_count' => $this->reviews_count,
            'sizes' => $this->sizes ?? [],
            'colors' => $this->colors ?? [],
            'image' => $this->whenLoaded('images', fn () => $this->primaryImageUrl()),
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ]),
        ];
    }
}
