<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class AuthService
{
    public const MAX_LOGIN_ATTEMPTS = 5;
    private const LOCKOUT_SECONDS = 60;

    // Token abilities. Routes check these, so a customer token never works on admin routes.
    public const ABILITY_CUSTOMER = 'customer';
    public const ABILITY_ADMIN = 'admin';

    /**
     * @param  array{name: string, email: string, phone?: ?string, password: string}  $data
     * @return array{0: User, 1: string} user and plain-text token
     */
    public function registerCustomer(array $data): array
    {
        // is_staff is not mass assignable, so a customer can never register as staff.
        $user = User::create($data)->refresh(); // refresh loads DB defaults such as is_staff = false

        return [$user, $this->issueToken($user, self::ABILITY_CUSTOMER)];
    }

    /**
     * Log in a customer (staff = false) or a staff member (staff = true).
     * A wrong email, wrong password, wrong user type and inactive account
     * all give the same generic error.
     *
     * The token is null when the staff member has 2FA on: they must still send a code.
     *
     * @return array{0: User, 1: ?string}
     */
    public function login(string $email, string $password, bool $staff, string $throttleKey): array
    {
        $this->ensureNotRateLimited($throttleKey);

        $user = User::where('email', $email)->first();

        // Always run one hash check, so response time does not reveal if the email exists.
        $hash = $user?->password ?? Hash::make(Str::random(16));
        $passwordOk = Hash::check($password, $hash);

        if (! $user || ! $passwordOk || $user->is_staff !== $staff || ! $user->is_active) {
            RateLimiter::hit($throttleKey, self::LOCKOUT_SECONDS);

            throw new AuthenticationException('Invalid credentials.');
        }

        RateLimiter::clear($throttleKey);

        if ($staff && $user->hasTwoFactorEnabled()) {
            return [$user, null];
        }

        $ability = $staff ? self::ABILITY_ADMIN : self::ABILITY_CUSTOMER;

        return [$user, $this->issueToken($user, $ability)];
    }

    /** Revoke only the token used for this request. */
    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    /**
     * Always behaves the same whether or not the email exists,
     * so the endpoint cannot be used to find registered emails.
     */
    public function sendPasswordResetLink(string $email): void
    {
        Password::sendResetLink(['email' => $email]);
    }

    /** @param  array{token: string, email: string, password: string}  $data */
    public function resetPassword(array $data): void
    {
        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => $password])->save(); // hashed by the model cast
            $user->tokens()->delete(); // sign out everywhere after a reset

            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['This password reset link is invalid or has expired.'],
            ]);
        }
    }

    public function issueToken(User $user, string $ability): string
    {
        return $user->createToken($ability, [$ability])->plainTextToken;
    }

    private function ensureNotRateLimited(string $key): void
    {
        if (! RateLimiter::tooManyAttempts($key, self::MAX_LOGIN_ATTEMPTS)) {
            return;
        }

        $seconds = RateLimiter::availableIn($key);

        throw new TooManyRequestsHttpException(
            $seconds,
            "Too many login attempts. Please try again in {$seconds} seconds."
        );
    }
}
