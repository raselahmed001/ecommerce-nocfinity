<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\Payment\PaymentGateway;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakePaymentGateway;
use Tests\TestCase;

/** Email verification, product reviews and the staff activity log. */
class ReviewsVerificationAndLogsTest extends TestCase
{
    use RefreshDatabase;

    private FakePaymentGateway $stripe;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->stripe = new FakePaymentGateway();
        $this->app->instance(PaymentGateway::class, $this->stripe);

        $category = Category::create(['name' => 'Phones', 'slug' => 'phones']);
        $this->product = Product::create([
            'category_id' => $category->id, 'name' => 'Phone', 'slug' => 'phone', 'sku' => 'P-1',
            'price' => '100.00', 'stock' => 10,
        ]);
    }

    private function customer(bool $verified = true): User
    {
        $user = $verified ? User::factory()->create() : User::factory()->unverified()->create();
        Sanctum::actingAs($user, ['customer']);

        return $user;
    }

    private function staff(string $role = 'Admin'): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_staff' => true])->save();
        $user->assignRole($role);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    /** Buy and pay for the product through the real API. */
    private function buy(): void
    {
        $this->postJson('/api/v1/cart/items', ['product_id' => $this->product->id, 'quantity' => 1])->assertCreated();
        $number = $this->postJson('/api/v1/checkout', [
            'name' => 'Rahim', 'phone' => '01711000001', 'address_line1' => 'Road 1',
            'city' => 'Dhaka', 'postal_code' => '1212', 'country' => 'BD',
        ])->assertCreated()->json('data.order_number');

        $this->stripe->succeed($this->stripe->lastIntentId());
        $this->postJson('/api/v1/checkout/confirm', ['order_number' => $number])->assertOk();
    }

    // ---------- email verification ----------

    public function test_registering_sends_a_verification_email_and_starts_unverified(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'New Person', 'email' => 'new@example.com',
            'password' => 'Password@123', 'password_confirmation' => 'Password@123',
        ])->assertCreated()->assertJsonPath('data.user.email_verified', false);

        Notification::assertSentTo(User::where('email', 'new@example.com')->first(), VerifyEmail::class);
    }

    public function test_the_signed_link_verifies_the_email_and_a_tampered_link_does_not(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);

        $this->get($url.'x')->assertForbidden(); // signature broken
        $this->assertFalse($user->fresh()->hasVerifiedEmail());

        $this->get($url)->assertRedirect(config('app.frontend_url').'/login?verified=1');
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_a_link_for_another_email_is_refused(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1('someone@else.com')]);

        $this->get($url)->assertRedirect(config('app.frontend_url').'/login?verified=invalid');
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_an_expired_link_is_refused(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->subMinute(), ['id' => $user->id, 'hash' => sha1($user->email)]);

        $this->get($url)->assertForbidden();
    }

    public function test_unverified_customers_cannot_check_out_but_can_ask_for_a_new_email(): void
    {
        Notification::fake();
        $user = $this->customer(verified: false);

        $this->postJson('/api/v1/cart/items', ['product_id' => $this->product->id, 'quantity' => 1])->assertCreated();
        $this->postJson('/api/v1/checkout', ['name' => 'X'])->assertForbidden();

        $this->postJson('/api/v1/auth/email/resend')->assertOk();
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    // ---------- reviews ----------

    public function test_only_buyers_can_review_and_the_product_rating_follows(): void
    {
        $this->customer();

        $this->postJson('/api/v1/products/phone/reviews', ['rating' => 5, 'body' => 'Great'])->assertForbidden();

        $this->buy();
        $this->postJson('/api/v1/products/phone/reviews', ['rating' => 5, 'title' => 'Nice', 'body' => 'Great phone'])->assertCreated();

        $this->assertSame(1, $this->product->fresh()->reviews_count);
        $this->assertEquals(5.0, (float) $this->product->fresh()->rating);

        // A second review from the same customer replaces the first.
        $this->postJson('/api/v1/products/phone/reviews', ['rating' => 3, 'body' => 'Changed my mind'])->assertCreated();
        $this->assertSame(1, Review::count());
        $this->assertEquals(3.0, (float) $this->product->fresh()->rating);

        $this->deleteJson('/api/v1/products/phone/reviews')->assertOk();
        $this->assertSame(0, $this->product->fresh()->reviews_count);
        $this->assertNull($this->product->fresh()->rating);
    }

    public function test_review_input_is_validated_and_html_is_removed(): void
    {
        $this->customer();
        $this->buy();

        $this->postJson('/api/v1/products/phone/reviews', ['rating' => 6, 'body' => 'x'])->assertJsonValidationErrors(['rating', 'body']);
        $this->postJson('/api/v1/products/phone/reviews', ['rating' => 4, 'body' => '<script>alert(1)</script>Fine phone'])->assertCreated();

        $this->assertSame('alert(1)Fine phone', Review::first()->body);
    }

    public function test_review_list_is_public_and_hides_full_names_and_emails(): void
    {
        $buyer = $this->customer();
        $buyer->forceFill(['name' => 'Rahim Uddin'])->save();
        $this->buy();
        $this->postJson('/api/v1/products/phone/reviews', ['rating' => 4, 'body' => 'Good'])->assertCreated();

        $this->app['auth']->forgetGuards();
        $response = $this->withHeaders([])->getJson('/api/v1/products/phone/reviews')->assertOk();

        $this->assertSame('Rahim U.', $response->json('data.0.author'));
        $this->assertStringNotContainsString($buyer->email, $response->getContent());
        $response->assertJsonPath('summary.count', 1)->assertJsonPath('summary.distribution.4', 1);
    }

    public function test_an_unverified_buyer_cannot_review(): void
    {
        $this->customer();
        $this->buy();
        auth()->user()->forceFill(['email_verified_at' => null])->save();

        $this->postJson('/api/v1/products/phone/reviews', ['rating' => 5, 'body' => 'Great'])->assertForbidden();
    }

    public function test_staff_can_delete_a_review_and_it_is_logged(): void
    {
        $this->customer();
        $this->buy();
        $this->postJson('/api/v1/products/phone/reviews', ['rating' => 1, 'body' => 'Bad'])->assertCreated();
        $review = Review::first();

        $this->staff('Support');
        $this->getJson('/api/v1/admin/reviews')->assertOk()->assertJsonPath('meta.total', 1);
        $this->deleteJson("/api/v1/admin/reviews/{$review->id}")->assertOk();

        $this->assertSame(0, Review::count());
        $this->assertSame(0, $this->product->fresh()->reviews_count);
        $this->assertDatabaseHas('activity_logs', ['action' => 'review.deleted']);
    }

    public function test_a_role_without_the_permission_cannot_moderate_reviews(): void
    {
        $this->staff('Order Manager');

        $this->getJson('/api/v1/admin/reviews')->assertForbidden();
    }

    // ---------- activity log ----------

    public function test_staff_changes_are_logged_with_who_what_and_where(): void
    {
        $admin = $this->staff('Admin');

        $this->postJson('/api/v1/admin/categories', ['name' => 'Laptops'])->assertCreated();

        $log = ActivityLog::where('action', 'category.created')->first();
        $this->assertNotNull($log);
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('category', $log->subject_type);
        $this->assertNotNull($log->ip_address);
    }

    public function test_customer_actions_and_seeding_are_not_logged(): void
    {
        $this->customer();
        $this->buy(); // updates product stock as a customer

        $this->assertSame(0, ActivityLog::count());
    }

    public function test_staff_login_is_logged_and_the_log_is_read_only_and_permission_protected(): void
    {
        $staff = User::factory()->create(['password' => 'Password@123']);
        $staff->forceFill(['is_staff' => true])->save();
        $staff->assignRole('Admin');

        $this->postJson('/api/v1/admin/auth/login', ['email' => $staff->email, 'password' => 'Password@123'])->assertOk();
        $this->assertDatabaseHas('activity_logs', ['action' => 'auth.login', 'user_id' => $staff->id]);

        Sanctum::actingAs($staff, ['admin']);
        $this->getJson('/api/v1/admin/activity-logs')->assertOk()->assertJsonPath('data.0.action', 'auth.login');
        $this->deleteJson('/api/v1/admin/activity-logs/1')->assertNotFound(); // no delete or edit route exists

        $this->staff('Product Manager');
        $this->getJson('/api/v1/admin/activity-logs')->assertForbidden();
    }

    public function test_changing_an_order_status_is_logged(): void
    {
        $this->customer();
        $this->buy();
        $order = Order::first();

        $this->staff('Order Manager');
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'processing'])->assertOk();

        $log = ActivityLog::where('action', 'order.status_changed')->first();
        $this->assertEquals(['from' => 'paid', 'to' => 'processing'], $log->properties);
    }
}
