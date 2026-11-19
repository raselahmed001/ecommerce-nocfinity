<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/** Product page: the card fields plus description and the full image gallery. */
class ProductDetailResource extends ProductResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            // Plain text. The frontend must render it escaped (React does by default).
            'description' => $this->description,
            'images' => $this->whenLoaded('images', fn () => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => $image->url,
                'is_primary' => $image->is_primary,
            ])->values()),
        ]);
    }
}
