<?php

namespace App\Services;

use App\Models\Product;
use App\Models\SiteSetting;
use App\Models\User;

/** Everything the storefront shows that is not a product: texts, brands, footer, filter options, counters. */
class SiteContentService
{
    /** The slider's upper end is the most expensive active product, rounded up to a multiple of this. */
    private const PRICE_STEP = 50;

    /** @return array<string, mixed> */
    public function content(): array
    {
        $settings = SiteSetting::all()->pluck('value', 'key');

        $hero = $settings['hero'] ?? [];
        if (! empty($hero['image']) && ! str_starts_with($hero['image'], 'http')) {
            $hero['image'] = rtrim(config('app.url'), '/').'/'.ltrim($hero['image'], '/');
        }
        $hero['stats'] = $this->stats($hero['stats'] ?? [], count($settings['brands'] ?? []));

        return [
            'name' => $settings['name'] ?? config('app.name'),
            'announcement' => $settings['announcement'] ?? null,
            'hero' => $hero,
            'brands' => $settings['brands'] ?? [],
            'testimonials' => $settings['testimonials'] ?? [],
            'newsletter' => $settings['newsletter'] ?? null,
            'footer' => $settings['footer'] ?? ['about' => '', 'columns' => [], 'socials' => []],
            'payments' => $settings['payments'] ?? [],
            'filters' => [
                'sizes' => $settings['sizes'] ?? [],
                'colors' => $settings['colors'] ?? [],
                'price_max' => $this->priceMax(),
            ],
        ];
    }

    /**
     * Each stat is {source, label}; the number comes from the database, not from the text.
     *
     * @param  list<array{source: string, label: string}>  $stats
     * @return list<array{value: int, label: string}>
     */
    private function stats(array $stats, int $brandCount): array
    {
        $values = [
            'brands' => $brandCount,
            'products' => Product::where('is_active', true)->count(),
            'customers' => User::where('is_staff', false)->where('is_active', true)->count(),
        ];

        return collect($stats)
            ->filter(fn ($stat) => isset($values[$stat['source'] ?? '']))
            ->map(fn ($stat) => ['value' => $values[$stat['source']], 'label' => $stat['label']])
            ->values()
            ->all();
    }

    private function priceMax(): int
    {
        $max = (float) Product::where('is_active', true)->selectRaw('MAX(COALESCE(discount_price, price)) as top')->value('top');

        return max(self::PRICE_STEP, (int) (ceil($max / self::PRICE_STEP) * self::PRICE_STEP));
    }
}
