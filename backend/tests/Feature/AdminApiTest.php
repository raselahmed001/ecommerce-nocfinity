<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\FakePaymentGateway;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->app->instance(\App\Services\Payment\PaymentGateway::class, new FakePaymentGateway());
        $this->category = Category::create(['name' => 'Phones', 'slug' => 'phones']);
    }

    private function staff(string $role): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_staff' => true])->save();
        $user->assignRole($role);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    private function product(array $override = []): Product
    {
        static $n = 0;
        $n++;

        return Product::create($override + [
            'category_id' => $this->category->id, 'name' => "Product $n", 'slug' => "product-$n",
            'sku' => "SKU-$n", 'price' => '100.00', 'stock' => 10,
        ]);
    }

    private function order(string $status = 'paid', ?User $customer = null): Order
    {
        $customer ??= User::factory()->create();
        $order = Order::create([
            'order_number' => 'TEMP-'.uniqid(), 'user_id' => $customer->id, 'status' => $status,
            'subtotal' => '100.00', 'discount_total' => '0.00', 'shipping_total' => '5.00', 'total' => '105.00',
            'shipping_name' => 'Rahim', 'shipping_phone' => '0171', 'shipping_address_line1' => 'Road 1',
            'shipping_city' => 'Dhaka', 'shipping_postal_code' => '1212', 'shipping_country' => 'BD',
            'paid_at' => $status === 'pending' ? null : now(),
        ]);
        $order->update(['order_number' => Order::makeNumber($order->id)]);

        return $order;
    }

    // ---------------- RBAC ----------------

    public function test_admin_routes_need_a_staff_token(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(), ['customer']); // a customer token
        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
        $this->getJson('/api/v1/admin/products')->assertForbidden();
    }

    #[DataProvider('rolePermissionMatrix')]
    public function test_each_role_reaches_only_what_its_permissions_allow(string $role, array $allowed, array $denied): void
    {
        $this->staff($role);

        foreach ($allowed as $path) {
            $this->assertNotSame(403, $this->getJson("/api/v1/admin/$path")->status(), "$role should reach $path");
        }
        foreach ($denied as $path) {
            $this->getJson("/api/v1/admin/$path")->assertForbidden();
        }
    }

    public static function rolePermissionMatrix(): array
    {
        $all = ['dashboard', 'products', 'categories', 'orders', 'coupons', 'customers', 'roles', 'permissions'];

        return [
            'Super Admin' => ['Super Admin', $all, []],
            'Admin' => ['Admin', ['dashboard', 'products', 'categories', 'orders', 'coupons', 'customers'], ['roles', 'permissions']],
            'Product Manager' => ['Product Manager', ['products', 'categories'], ['dashboard', 'orders', 'coupons', 'customers', 'roles']],
            'Order Manager' => ['Order Manager', ['dashboard', 'orders', 'customers'], ['products', 'coupons', 'roles']],
            'Support' => ['Support', ['orders', 'customers', 'products'], ['dashboard', 'coupons', 'roles']],
        ];
    }

    public function test_write_actions_are_checked_per_permission_not_just_per_page(): void
    {
        $this->staff('Support'); // can view products and orders, nothing more

        $this->postJson('/api/v1/admin/products', [])->assertForbidden();
        $this->putJson('/api/v1/admin/products/'.$this->product()->id, [])->assertForbidden();
        $this->deleteJson('/api/v1/admin/products/'.$this->product()->id)->assertForbidden();
        $this->patchJson('/api/v1/admin/orders/'.$this->order()->id.'/status', ['status' => 'processing'])->assertForbidden();
        $this->postJson('/api/v1/admin/categories', ['name' => 'X'])->assertForbidden();
    }

    // ---------------- Dashboard ----------------

    public function test_dashboard_returns_stats_a_30_day_chart_and_recent_orders(): void
    {
        $this->staff('Admin');
        $this->product(['stock' => 2, 'low_stock_threshold' => 5]); // low stock
        $this->product(['stock' => 50]);
        $this->order('paid');
        $this->order('pending'); // not a sale
        $this->order('cancelled'); // not a sale

        $data = $this->getJson('/api/v1/admin/dashboard')->assertOk()->json('data');

        $this->assertSame(1, $data['stats']['todays_orders']);
        $this->assertSame('105.00', $data['stats']['todays_revenue']);
        $this->assertSame(1, $data['stats']['low_stock_count']);
        $this->assertGreaterThanOrEqual(3, $data['stats']['total_customers']);
        $this->assertCount(30, $data['sales_chart']);
        $this->assertSame('105.00', end($data['sales_chart'])['revenue']);
        $this->assertCount(3, $data['recent_orders']);
    }

    // ---------------- Products ----------------

    public function test_product_create_with_images_and_validation(): void
    {
        Storage::fake('public');
        $this->staff('Product Manager');

        $payload = [
            'category_id' => $this->category->id, 'name' => '<b>Nova</b> Phone', 'sku' => 'NOVA-1',
            'description' => 'Great <script>alert(1)</script>phone', 'price' => '499.00', 'discount_price' => '449.00', 'stock' => 12,
            'images' => [UploadedFile::fake()->image('a.jpg', 600, 600), UploadedFile::fake()->image('b.png', 600, 600)],
        ];

        $response = $this->post('/api/v1/admin/products', $payload, ['Accept' => 'application/json'])->assertCreated();

        $product = Product::first();
        $this->assertSame('Nova Phone', $product->name, 'HTML is stripped from the name');
        $this->assertStringNotContainsString('<script>', $product->description);
        $this->assertSame('nova-phone', $product->slug);
        $this->assertCount(2, $response->json('data.images'));
        $this->assertTrue($response->json('data.images.0.is_primary'));
        $this->assertFalse($response->json('data.images.1.is_primary'));
        Storage::disk('public')->assertExists($product->images()->first()->path);
    }

    public function test_product_validation_rules(): void
    {
        Storage::fake('public');
        $this->staff('Product Manager');
        $this->product(['sku' => 'TAKEN']);

        $base = ['category_id' => $this->category->id, 'name' => 'Phone', 'sku' => 'NEW-1', 'price' => '100.00', 'stock' => 1];

        $this->postJson('/api/v1/admin/products', $base + ['discount_price' => '100.00'])->assertJsonValidationErrors('discount_price');
        $this->postJson('/api/v1/admin/products', array_merge($base, ['sku' => 'TAKEN']))->assertJsonValidationErrors('sku');
        $this->postJson('/api/v1/admin/products', array_merge($base, ['price' => '-5']))->assertJsonValidationErrors('price');
        $this->postJson('/api/v1/admin/products', array_merge($base, ['stock' => -1]))->assertJsonValidationErrors('stock');
        $this->postJson('/api/v1/admin/products', array_merge($base, ['category_id' => 9999]))->assertJsonValidationErrors('category_id');

        // A text file renamed to .jpg is not an image.
        $fake = UploadedFile::fake()->create('evil.jpg', 10, 'text/plain');
        $this->post('/api/v1/admin/products', $base + ['images' => [$fake]], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('images.0');
    }

    public function test_product_update_delete_and_image_management(): void
    {
        Storage::fake('public');
        $this->staff('Product Manager');
        $product = $this->product(['name' => 'Old', 'sku' => 'OLD-1']);

        $this->putJson("/api/v1/admin/products/{$product->id}", [
            'category_id' => $this->category->id, 'name' => 'New name', 'sku' => 'OLD-1', 'price' => '120.00', 'stock' => 7, 'is_active' => false,
        ])->assertOk()->assertJsonPath('data.name', 'New name')->assertJsonPath('data.slug', $product->slug)->assertJsonPath('data.is_active', false);

        $this->post("/api/v1/admin/products/{$product->id}/images", [
            'images' => [UploadedFile::fake()->image('1.jpg'), UploadedFile::fake()->image('2.jpg')],
        ], ['Accept' => 'application/json'])->assertCreated();

        $images = $product->images()->get();
        $this->assertCount(2, $images);
        $this->assertTrue($images[0]->is_primary);

        $this->patchJson("/api/v1/admin/products/{$product->id}/images/{$images[1]->id}/primary")->assertOk();
        $this->assertSame(1, $product->images()->where('is_primary', true)->count());
        $this->assertTrue($images[1]->fresh()->is_primary);

        // deleting the primary image promotes another one and removes the file
        $path = $images[1]->path;
        $this->deleteJson("/api/v1/admin/products/{$product->id}/images/{$images[1]->id}")->assertOk();
        Storage::disk('public')->assertMissing($path);
        $this->assertTrue($images[0]->fresh()->is_primary);

        // an image id from another product cannot be touched
        $other = $this->product();
        $foreign = $other->images()->create(['path' => 'x.jpg', 'is_primary' => true, 'sort_order' => 1]);
        $this->deleteJson("/api/v1/admin/products/{$product->id}/images/{$foreign->id}")->assertNotFound();

        $this->deleteJson("/api/v1/admin/products/{$product->id}")->assertOk();
        $this->assertSoftDeleted($product);
        $this->getJson("/api/v1/admin/products/{$product->id}")->assertNotFound();
    }

    public function test_product_list_filters(): void
    {
        $this->staff('Admin');
        $this->product(['name' => 'Alpha Phone', 'sku' => 'A-1']);
        $this->product(['name' => 'Beta Laptop', 'sku' => 'B-1', 'is_active' => false]);
        $this->product(['name' => 'Gamma', 'sku' => 'G-1', 'stock' => 0]);

        $this->getJson('/api/v1/admin/products?q=alpha')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/admin/products?q=B-1')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/admin/products?status=inactive')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/admin/products?stock=out')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/admin/products?category_id='.$this->category->id)->assertJsonPath('meta.total', 3);
        $this->getJson('/api/v1/admin/products?per_page=2')->assertJsonCount(2, 'data')->assertJsonPath('meta.last_page', 2);
    }

    // ---------------- Categories ----------------

    public function test_categories_keep_two_levels_and_protect_used_ones(): void
    {
        $this->staff('Product Manager');

        $parent = $this->postJson('/api/v1/admin/categories', ['name' => 'Electronics'])->assertCreated()->json('data');
        $child = $this->postJson('/api/v1/admin/categories', ['name' => 'Laptops', 'parent_id' => $parent['id']])->assertCreated()->json('data');

        $this->postJson('/api/v1/admin/categories', ['name' => 'Gaming', 'parent_id' => $child['id']])->assertJsonValidationErrors('parent_id'); // 3rd level
        $this->putJson("/api/v1/admin/categories/{$parent['id']}", ['name' => 'Electronics', 'parent_id' => $parent['id']])->assertJsonValidationErrors('parent_id');
        $this->putJson("/api/v1/admin/categories/{$parent['id']}", ['name' => 'Electronics', 'parent_id' => $this->category->id])->assertJsonValidationErrors('parent_id'); // has children

        $this->deleteJson("/api/v1/admin/categories/{$parent['id']}")->assertStatus(409); // has children
        $this->product(['category_id' => $child['id']]);
        $this->deleteJson("/api/v1/admin/categories/{$child['id']}")->assertStatus(409); // has products

        $tree = $this->getJson('/api/v1/admin/categories')->assertOk()->json('data');
        $this->assertSame('Laptops', collect($tree)->firstWhere('name', 'Electronics')['children'][0]['name']);
    }

    // ---------------- Orders ----------------

    public function test_orders_list_filter_search_and_detail(): void
    {
        $this->staff('Order Manager');
        $ann = User::factory()->create(['name' => 'Ann Example', 'email' => 'ann@example.com']);
        $a = $this->order('paid', $ann);
        $this->order('pending');
        $this->order('shipped');

        $this->getJson('/api/v1/admin/orders')->assertJsonPath('meta.total', 3);
        $this->getJson('/api/v1/admin/orders?status=paid')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/admin/orders?status=bogus')->assertStatus(422);
        $this->getJson('/api/v1/admin/orders?q=ann@example')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/admin/orders?q='.$a->order_number)->assertJsonPath('meta.total', 1);

        $a->items()->create(['product_name' => 'Phone', 'sku' => 'P', 'unit_price' => '100.00', 'quantity' => 1, 'line_total' => '100.00']);
        $this->getJson("/api/v1/admin/orders/{$a->id}")->assertOk()
            ->assertJsonPath('data.customer.email', 'ann@example.com')
            ->assertJsonPath('data.allowed_next_statuses', ['processing', 'cancelled'])
            ->assertJsonCount(1, 'data.items');
    }

    public function test_order_status_updates_follow_the_lifecycle_and_email_the_customer(): void
    {
        Mail::fake();
        $this->staff('Order Manager');
        $order = $this->order('paid');

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'delivered'])->assertStatus(422); // skipping steps
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'paid'])->assertStatus(422);
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'nonsense'])->assertStatus(422);

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'processing'])
            ->assertOk()->assertJsonPath('data.status', 'processing')->assertJsonPath('data.allowed_next_statuses', ['shipped', 'cancelled']);
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'shipped'])->assertOk();

        Mail::assertSent(\App\Mail\OrderStatusMail::class, 2);
    }

    // ---------------- Coupons ----------------

    public function test_coupon_crud_and_validation(): void
    {
        $this->staff('Admin');

        $created = $this->postJson('/api/v1/admin/coupons', [
            'code' => 'summer25', 'type' => 'percentage', 'value' => 25, 'min_order_amount' => 50, 'usage_limit' => 10,
            'starts_at' => now()->toDateTimeString(), 'expires_at' => now()->addMonth()->toDateTimeString(),
        ])->assertCreated()->assertJsonPath('data.code', 'SUMMER25')->json('data');

        $this->postJson('/api/v1/admin/coupons', ['code' => 'SUMMER25', 'type' => 'fixed', 'value' => 5])->assertJsonValidationErrors('code');
        $this->postJson('/api/v1/admin/coupons', ['code' => 'BIG', 'type' => 'percentage', 'value' => 150])->assertJsonValidationErrors('value');
        $this->postJson('/api/v1/admin/coupons', ['code' => 'NEG', 'type' => 'fixed', 'value' => -5])->assertJsonValidationErrors('value');
        $this->postJson('/api/v1/admin/coupons', ['code' => 'DATES', 'type' => 'fixed', 'value' => 5,
            'starts_at' => now()->addDay()->toDateTimeString(), 'expires_at' => now()->toDateTimeString()])->assertJsonValidationErrors('expires_at');
        $this->postJson('/api/v1/admin/coupons', ['code' => 'BAD CODE!', 'type' => 'fixed', 'value' => 5])->assertJsonValidationErrors('code');

        $this->putJson("/api/v1/admin/coupons/{$created['id']}", ['code' => 'SUMMER25', 'type' => 'fixed', 'value' => 10])
            ->assertOk()->assertJsonPath('data.type', 'fixed');
        $this->getJson('/api/v1/admin/coupons')->assertJsonPath('meta.total', 1);
        $this->deleteJson("/api/v1/admin/coupons/{$created['id']}")->assertOk();
        $this->assertSame(0, Coupon::count());
    }

    // ---------------- Customers ----------------

    public function test_customers_list_excludes_staff_and_shows_order_history(): void
    {
        $admin = $this->staff('Admin');
        $customer = User::factory()->create(['name' => 'Cara Customer']);
        $this->order('paid', $customer);
        $this->order('cancelled', $customer);

        $list = $this->getJson('/api/v1/admin/customers')->assertOk()->json('data');
        $this->assertSame(['Cara Customer'], array_column($list, 'name'), 'staff must not appear');
        $this->assertSame(2, $list[0]['orders_count']);
        $this->assertSame('105.00', $list[0]['total_spent'], 'cancelled orders do not count');

        $this->getJson("/api/v1/admin/customers/{$customer->id}")->assertOk()->assertJsonPath('data.orders_count', 2);
        $this->getJson("/api/v1/admin/customers/{$customer->id}/orders")->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 2);
        $this->getJson("/api/v1/admin/customers/{$admin->id}/orders")->assertNotFound(); // a staff id
        $this->getJson("/api/v1/admin/customers/{$admin->id}")->assertNotFound(); // a staff id
        $this->getJson('/api/v1/admin/customers?q=cara')->assertJsonPath('meta.total', 1);
    }

    // ---------------- Profile ----------------

    public function test_staff_can_update_own_name_and_password_only_with_the_current_password(): void
    {
        $user = $this->staff('Support');
        $user->update(['password' => 'Old@Pass123']);
        $user->createToken('other-device', ['admin']);

        $this->putJson('/api/v1/admin/profile', ['name' => '<i>Sam</i> Support'])->assertOk()->assertJsonPath('data.name', 'Sam Support');

        $this->putJson('/api/v1/admin/profile', ['name' => 'Sam', 'password' => 'New@Pass456', 'password_confirmation' => 'New@Pass456'])
            ->assertJsonValidationErrors('current_password');
        $this->putJson('/api/v1/admin/profile', ['name' => 'Sam', 'current_password' => 'wrong', 'password' => 'New@Pass456', 'password_confirmation' => 'New@Pass456'])
            ->assertJsonValidationErrors('current_password');
        $this->putJson('/api/v1/admin/profile', ['name' => 'Sam', 'current_password' => 'Old@Pass123', 'password' => 'weak', 'password_confirmation' => 'weak'])
            ->assertJsonValidationErrors('password');

        $this->putJson('/api/v1/admin/profile', ['name' => 'Sam', 'current_password' => 'Old@Pass123', 'password' => 'New@Pass456', 'password_confirmation' => 'New@Pass456'])
            ->assertOk();
        $this->assertTrue(\Hash::check('New@Pass456', $user->fresh()->password));

        // email, roles and flags cannot be changed through the profile endpoint
        $this->putJson('/api/v1/admin/profile', ['name' => 'Sam', 'email' => 'hacker@evil.test', 'is_staff' => false])->assertOk();
        $this->assertNotSame('hacker@evil.test', $user->fresh()->email);
        $this->assertTrue($user->fresh()->is_staff);
    }

    public function test_every_admin_list_can_be_paged(): void
    {
        $this->staff('Super Admin');

        // Categories: 12 top-level ones, 5 per page. Without page parameters the whole tree comes back (for dropdowns).
        foreach (range(1, 12) as $i) {
            Category::create(['name' => "Cat $i", 'slug' => "cat-$i", 'sort_order' => $i]);
        }
        $page = $this->getJson('/api/v1/admin/categories?page=2&per_page=5')->assertOk();
        $this->assertCount(5, $page->json('data'));
        $page->assertJsonPath('meta.current_page', 2)->assertJsonPath('meta.total', 13); // 12 + "Phones"
        $this->assertCount(13, $this->getJson('/api/v1/admin/categories')->assertOk()->json('data'));
        $this->getJson('/api/v1/admin/categories?per_page=500')->assertStatus(422);

        // A customer's order history: 12 orders, 10 per page.
        $customer = User::factory()->create();
        foreach (range(1, 12) as $i) {
            $this->order('paid', $customer);
        }
        $orders = $this->getJson("/api/v1/admin/customers/{$customer->id}/orders")->assertOk();
        $this->assertCount(10, $orders->json('data'));
        $orders->assertJsonPath('meta.last_page', 2);
        $this->assertCount(2, $this->getJson("/api/v1/admin/customers/{$customer->id}/orders?page=2")->json('data'));
    }

    public function test_product_sizes_colors_and_rating_can_be_saved_and_validated(): void
    {
        $this->staff('Product Manager');
        $base = [
            'category_id' => $this->category->id, 'name' => 'Tee', 'sku' => 'TEE-1', 'price' => '20.00', 'stock' => 5,
        ];

        $created = $this->postJson('/api/v1/admin/products', $base + [
            'sizes' => ['Small', 'Large'], 'colors' => ['Red', 'Blue'], 'rating' => '4.5',
        ])->assertCreated()
            ->assertJsonPath('data.sizes', ['Small', 'Large'])
            ->assertJsonPath('data.colors', ['Red', 'Blue'])
            ->assertJsonPath('data.rating', '4.5');
        $id = $created->json('data.id');

        // The storefront shows the same options.
        $this->getJson('/api/v1/products/'.$created->json('data.slug'))->assertJsonPath('data.product.sizes', ['Small', 'Large']);

        // An empty list clears the options.
        $this->putJson("/api/v1/admin/products/$id", $base + ['sizes' => [], 'colors' => []])->assertOk()->assertJsonPath('data.sizes', []);

        // Bad input is rejected.
        $this->putJson("/api/v1/admin/products/$id", $base + ['rating' => 6])->assertStatus(422)->assertJsonValidationErrors(['rating']);
        $this->putJson("/api/v1/admin/products/$id", $base + ['sizes' => ['<b>XL</b>']])->assertStatus(422)->assertJsonValidationErrors(['sizes.0']);
        $this->putJson("/api/v1/admin/products/$id", $base + ['colors' => ['Red', 'Red']])->assertStatus(422)->assertJsonValidationErrors(['colors.0']);
    }
}
