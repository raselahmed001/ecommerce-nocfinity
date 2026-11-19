<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** @mixin \App\Models\Review */
class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            // First name and last initial only: no full names or emails are shown publicly.
            'author' => $this->whenLoaded('user', fn () => $this->authorName()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    private function authorName(): string
    {
        $parts = preg_split('/\s+/', trim($this->user->name));
        $initial = count($parts) > 1 ? ' '.Str::upper(Str::substr(end($parts), 0, 1)).'.' : '';

        return $parts[0].$initial;
    }
}
