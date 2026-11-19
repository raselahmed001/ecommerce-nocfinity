<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Product photos taken from the Figma template, stored in public/seed-images.
     * Products that are not in the design reuse the photo of the same kind of garment.
     * Hoodies have no photo in the design and keep a placeholder.
     *
     * @var array<string, list<string>>
     */
    private const PHOTOS = [
        'one-life-graphic-t-shirt' => ['one-life-graphic-t-shirt', 'one-life-graphic-t-shirt-back', 'one-life-graphic-t-shirt-model'],
        'cargo-shorts' => ['loose-fit-bermuda-shorts'],
        'classic-oxford-shirt' => ['checkered-shirt'],
        'slim-fit-dress-shirt' => ['vertical-striped-shirt'],
        'slim-fit-dark-jeans' => ['faded-skinny-jeans'],
        'sequin-party-shirt' => ['checkered-shirt'],
        'satin-party-t-shirt' => ['black-striped-t-shirt'],
        'performance-gym-t-shirt' => ['sleeve-striped-t-shirt'],
        'training-shorts' => ['loose-fit-bermuda-shorts'],
        'compression-tee' => ['t-shirt-with-tape-details'],
    ];

    private const SIZES = ['Small', 'Medium', 'Large', 'X-Large'];

    private const COLORS = ['Green', 'Red', 'Yellow', 'Orange', 'Cyan', 'Blue', 'Purple', 'Pink', 'White', 'Black'];

    /**
     * [name, category slug, price, discount price|null, stock, featured, rating]
     * Includes 2 out-of-stock (stock 0) and 2 low-stock (below 5) products.
     * "featured" products are the ones shown as "Top selling" on the home page.
     */
    private const PRODUCTS = [
        ['T-shirt with Tape Details', 'casual-t-shirts', 120, null, 60, false, 4.5],
        ['Skinny Fit Jeans', 'casual-jeans', 260, 240, 35, false, 3.5],
        ['Checkered Shirt', 'casual-shirts', 180, null, 40, false, 4.5],
        ['Sleeve Striped T-shirt', 'casual-t-shirts', 160, 130, 50, false, 4.5],
        ['Vertical Striped Shirt', 'casual-shirts', 232, 212, 25, true, 5.0],
        ['Courage Graphic T-shirt', 'casual-t-shirts', 145, null, 70, true, 4.0],
        ['Loose Fit Bermuda Shorts', 'casual-shorts', 80, null, 45, true, 3.0],
        ['Faded Skinny Jeans', 'casual-jeans', 210, null, 30, true, 4.5],
        ['Gradient Graphic T-shirt', 'casual-t-shirts', 145, null, 80, false, 3.5],
        ['Polo with Tipping Details', 'casual-t-shirts', 180, null, 55, false, 4.5],
        ['Black Striped T-shirt', 'casual-t-shirts', 150, 120, 65, false, 5.0],
        ['One Life Graphic T-shirt', 'casual-t-shirts', 300, 260, 20, true, 4.5],
        ['Hooded Zip Sweatshirt', 'casual-hoodie', 129, null, 0, false, 4.0],
        ['Cargo Shorts', 'casual-shorts', 60, null, 3, false, 3.5],

        ['Classic Oxford Shirt', 'formal-shirts', 95, null, 40, false, 4.5],
        ['Slim Fit Dress Shirt', 'formal-shirts', 110, 99, 30, false, 4.0],
        ['Slim Fit Dark Jeans', 'formal-jeans', 130, null, 28, false, 4.0],

        ['Polo with Contrast Trims', 'party-shirts', 242, 212, 22, false, 4.0],
        ['Sequin Party Shirt', 'party-shirts', 150, 120, 18, false, 4.0],
        ['Satin Party T-shirt', 'party-t-shirts', 70, null, 4, false, 4.5],

        ['Performance Gym T-shirt', 'gym-t-shirts', 45, 35, 90, false, 4.5],
        ['Training Shorts', 'gym-shorts', 40, null, 75, false, 4.0],
        ['Pro Gym Hoodie', 'gym-hoodie', 85, 70, 32, false, 4.5],
        ['Compression Tee', 'gym-t-shirts', 38, null, 0, false, 4.0],
    ];

    public function run(): void
    {
        $categories = Category::pluck('id', 'slug');

        foreach (self::PRODUCTS as $i => [$name, $categorySlug, $price, $discount, $stock, $featured, $rating]) {
            $slug = Str::slug($name);

            $product = Product::updateOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $categories[$categorySlug],
                    'name' => $name,
                    'sku' => sprintf('SKU-%04d', $i + 1),
                    'description' => "{$name}. Made from soft, breathable fabric with a comfortable fit that suits every day. "
                        .'A sample product used to demo the storefront and admin panel.',
                    'price' => $price,
                    'discount_price' => $discount,
                    'stock' => $stock,
                    'low_stock_threshold' => 5,
                    'sizes' => self::SIZES,
                    // 3 colors per product, rotating through the palette so the color filter has variety.
                    'colors' => array_map(fn ($k) => self::COLORS[($i + $k) % count(self::COLORS)], [0, 3, 6]),
                    'rating' => $rating,
                    'is_active' => true,
                    'is_featured' => $featured,
                ],
            );

            // The first products of the list are the newest ("New arrivals" shows the design's first four).
            $product->forceFill(['created_at' => now()->subMinutes($i)])->saveQuietly();

            $product->images()->delete();
            foreach ($this->imagePaths($slug) as $n => $path) {
                $product->images()->create(['path' => $path, 'is_primary' => $n === 0, 'sort_order' => $n + 1]);
            }
        }
    }

    /** @return list<string> image URLs of a product */
    private function imagePaths(string $slug): array
    {
        $files = self::PHOTOS[$slug] ?? (is_file(public_path("seed-images/{$slug}.jpg")) ? [$slug] : []);

        if ($files === []) {
            return array_map(fn ($n) => "https://picsum.photos/seed/{$slug}-{$n}/800/800", [1, 2, 3]);
        }

        return array_map(fn ($file) => rtrim(config('app.url'), '/')."/seed-images/{$file}.jpg", $files);
    }
}
