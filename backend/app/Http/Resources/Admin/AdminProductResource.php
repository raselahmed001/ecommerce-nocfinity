<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Product */
class AdminProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'description' => $this->description,
            'price' => $this->price,
            'discount_price' => $this->discount_price,
            'stock' => $this->stock,
            'low_stock_threshold' => $this->low_stock_threshold,
            'is_low_stock' => $this->stock <= $this->low_stock_threshold,
            'is_active' => $this->is_active,
            'is_featured' => $this->is_featured,
            'sizes' => $this->sizes ?? [],
            'colors' => $this->colors ?? [],
            'rating' => $this->rating,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ]),
            'image' => $this->whenLoaded('images', fn () => $this->primaryImageUrl()),
            'images' => $this->whenLoaded('images', fn () => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => $image->url,
                'is_primary' => $image->is_primary,
            ])->values()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
