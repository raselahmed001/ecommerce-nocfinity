<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TotpService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Password@123';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    private function staff(bool $twoFactor = false): User
    {
        $user = User::factory()->create(['password' => Hash::make(self::PASSWORD)]);
        $user->forceFill(['is_staff' => true])->save();
        $user->assignRole('Admin');

        if ($twoFactor) {
            $user->forceFill([
                'two_factor_secret' => (new TotpService())->generateSecret(),
                'two_factor_confirmed_at' => now(),
            ])->save();
        }

        return $user->refresh();
    }

    private function currentCode(User $user): string
    {
        return (new TotpService())->codeAt($user->two_factor_secret, intdiv(time(), 30));
    }

    private function wrongCode(User $user): string
    {
        return $this->currentCode($user) === '000000' ? '111111' : '000000';
    }

    public function test_totp_matches_the_rfc_6238_test_vector(): void
    {
        // RFC 6238, secret "12345678901234567890", time 59s: 94287082 (8 digits), so 287082 with 6.
        $secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
        $totp = new TotpService();

        $this->assertSame('287082', $totp->codeAt($secret, intdiv(59, 30)));
        $this->assertSame(1, $totp->verify($secret, '287082', 59));
        $this->assertNull($totp->verify($secret, '287082', 59 + 120)); // too old
        $this->assertNull($totp->verify($secret, '12345', 59)); // not 6 digits
    }

    public function test_staff_without_2fa_log_in_with_just_a_password(): void
    {
        $user = $this->staff();

        $this->postJson('/api/v1/admin/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.user.two_factor_enabled', false)
            ->assertJsonStructure(['data' => ['token']]);
    }

    public function test_staff_with_2fa_get_no_token_until_the_code_is_sent(): void
    {
        $user = $this->staff(twoFactor: true);

        $login = $this->postJson('/api/v1/admin/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.two_factor_required', true)
            ->assertJsonMissingPath('data.token');

        $challenge = $login->json('data.challenge');

        $this->postJson('/api/v1/admin/auth/two-factor-challenge', ['challenge' => $challenge, 'code' => $this->currentCode($user)])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user']]);

        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_a_wrong_code_gives_no_token_and_the_challenge_dies_after_five_tries(): void
    {
        $user = $this->staff(twoFactor: true);
        $challenge = $this->postJson('/api/v1/admin/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])->json('data.challenge');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/admin/auth/two-factor-challenge', ['challenge' => $challenge, 'code' => $this->wrongCode($user)])
                ->assertStatus(422);
        }

        // Even the right code is refused now: the challenge is gone.
        $this->postJson('/api/v1/admin/auth/two-factor-challenge', ['challenge' => $challenge, 'code' => $this->currentCode($user)])
            ->assertStatus(422);

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_a_wrong_password_never_starts_a_challenge(): void
    {
        $user = $this->staff(twoFactor: true);

        $this->postJson('/api/v1/admin/auth/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertUnauthorized()
            ->assertJsonMissingPath('data.challenge');
    }

    public function test_a_code_cannot_be_used_twice(): void
    {
        $user = $this->staff(twoFactor: true);
        $code = $this->currentCode($user);

        foreach ([200, 422] as $expected) {
            $challenge = $this->postJson('/api/v1/admin/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])->json('data.challenge');
            $this->postJson('/api/v1/admin/auth/two-factor-challenge', ['challenge' => $challenge, 'code' => $code])->assertStatus($expected);
        }
    }

    public function test_staff_can_turn_2fa_on_and_off(): void
    {
        $user = $this->staff();
        Sanctum::actingAs($user, ['admin']);

        $setup = $this->postJson('/api/v1/admin/two-factor/setup')->assertOk();
        $this->assertStringStartsWith('otpauth://totp/', $setup->json('data.otpauth_uri'));

        // Not active until a code is confirmed.
        $this->assertFalse($user->refresh()->hasTwoFactorEnabled());
        $this->postJson('/api/v1/admin/two-factor/confirm', ['code' => $this->wrongCode($user)])->assertStatus(422);

        $this->postJson('/api/v1/admin/two-factor/confirm', ['code' => $this->currentCode($user)])
            ->assertOk()
            ->assertJsonPath('data.two_factor_enabled', true);

        $this->assertNotSame($setup->json('data.secret'), $user->getRawOriginal('two_factor_secret'), 'secret must be stored encrypted');

        // Turning off needs the password and a code from a later time step (the first was used).
        $this->travel(31)->seconds();
        $this->postJson('/api/v1/admin/two-factor/disable', ['password' => 'wrong', 'code' => $this->currentCode($user)])->assertStatus(422);
        $this->postJson('/api/v1/admin/two-factor/disable', ['password' => self::PASSWORD, 'code' => $this->currentCode($user)])
            ->assertOk()
            ->assertJsonPath('data.two_factor_enabled', false);
    }

    public function test_the_secret_is_never_in_an_api_response(): void
    {
        $user = $this->staff(twoFactor: true);
        Sanctum::actingAs($user, ['admin']);

        $body = $this->getJson('/api/v1/admin/auth/me')->assertOk()->getContent();

        $this->assertStringNotContainsString($user->two_factor_secret, $body);
        $this->assertStringNotContainsString('two_factor_secret', $body);
    }
}
