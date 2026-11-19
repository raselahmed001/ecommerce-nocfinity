<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_site_content_is_public_and_comes_from_the_database(): void
    {
        SiteSetting::create(['key' => 'name', 'value' => 'My Shop']);
        SiteSetting::create(['key' => 'brands', 'value' => [['name' => 'A'], ['name' => 'B']]]);
        SiteSetting::create(['key' => 'hero', 'value' => [
            'title' => 'Hello',
            'image' => 'seed-images/hero.jpg',
            'stats' => [
                ['source' => 'brands', 'label' => 'Brands'],
                ['source' => 'products', 'label' => 'Products'],
                ['source' => 'customers', 'label' => 'Customers'],
                ['source' => 'unknown', 'label' => 'Ignored'],
            ],
        ]]);

        $category = Category::create(['name' => 'Casual', 'slug' => 'casual']);
        Product::create(['category_id' => $category->id, 'name' => 'Tee', 'slug' => 'tee', 'sku' => 'T-1', 'price' => '120.00', 'discount_price' => '99.00', 'stock' => 5]);
        Product::create(['category_id' => $category->id, 'name' => 'Hidden', 'slug' => 'hidden', 'sku' => 'T-2', 'price' => '10.00', 'stock' => 5, 'is_active' => false]);
        User::factory()->count(2)->create(); // customers
        User::factory()->create(['is_staff' => true]); // staff are not customers

        $response = $this->getJson('/api/v1/site')->assertOk();

        $response->assertJsonPath('data.name', 'My Shop');
        $response->assertJsonPath('data.hero.title', 'Hello');
        // The picture becomes a full URL and the numbers are counted, not typed in.
        $this->assertStringEndsWith('/seed-images/hero.jpg', $response->json('data.hero.image'));
        $this->assertSame(
            [['value' => 2, 'label' => 'Brands'], ['value' => 1, 'label' => 'Products'], ['value' => 2, 'label' => 'Customers']],
            $response->json('data.hero.stats'),
        );
        // The slider ends at the dearest active product (99.00 after discount), rounded up to 50.
        $response->assertJsonPath('data.filters.price_max', 100);
    }

    public function test_the_site_content_has_safe_defaults_when_nothing_is_saved(): void
    {
        $this->getJson('/api/v1/site')
            ->assertOk()
            ->assertJsonPath('data.brands', [])
            ->assertJsonPath('data.filters.sizes', [])
            ->assertJsonPath('data.filters.price_max', 50);
    }
}
