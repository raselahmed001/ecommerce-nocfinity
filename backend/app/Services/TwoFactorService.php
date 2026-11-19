<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Enable / disable 2FA for staff and finish a login that needs a code. */
class TwoFactorService
{
    private const CHALLENGE_MINUTES = 5;
    private const MAX_CODE_TRIES = 5;

    public function __construct(private readonly TotpService $totp, private readonly AuthService $auth) {}

    /** Step 1 of enabling: make a secret. It is not active until a code is confirmed. */
    public function beginSetup(User $user): array
    {
        $this->ensureNotEnabled($user);

        $secret = $this->totp->generateSecret();
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null])->save();

        return [
            'secret' => $secret,
            'otpauth_uri' => $this->totp->uri($secret, $user->email, config('app.name')),
        ];
    }

    /** Step 2: the first valid code proves the app is set up, and turns 2FA on. */
    public function confirmSetup(User $user, string $code): void
    {
        $this->ensureNotEnabled($user);

        if (! $user->two_factor_secret || $this->totp->verify($user->two_factor_secret, $code) === null) {
            throw ValidationException::withMessages(['code' => ['The code is not correct.']]);
        }

        $user->forceFill(['two_factor_confirmed_at' => now()])->save();
        app(\App\Services\ActivityLogger::class)->log('auth.two_factor_enabled', 'Turned on two-factor authentication', null, [], $user);
    }

    /** Turning 2FA off needs the password and a current code. */
    public function disable(User $user, string $password, string $code): void
    {
        if (! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages(['password' => ['The password is not correct.']]);
        }

        if (! $user->hasTwoFactorEnabled() || ! $this->codeIsValid($user, $code)) {
            throw ValidationException::withMessages(['code' => ['The code is not correct.']]);
        }

        $user->forceFill(['two_factor_secret' => null, 'two_factor_confirmed_at' => null])->save();
        app(\App\Services\ActivityLogger::class)->log('auth.two_factor_disabled', 'Turned off two-factor authentication', null, [], $user);
    }

    /** Password was right but a code is still needed: hand out a short-lived challenge id. */
    public function startChallenge(User $user): string
    {
        $id = Str::random(40);
        Cache::put($this->challengeKey($id), ['user' => $user->id, 'tries' => 0], now()->addMinutes(self::CHALLENGE_MINUTES));

        return $id;
    }

    /**
     * @return array{0: User, 1: string} user and plain-text admin token
     */
    public function completeChallenge(string $challengeId, string $code): array
    {
        $key = $this->challengeKey($challengeId);
        $challenge = Cache::get($key);
        $user = $challenge ? User::find($challenge['user']) : null;

        if (! $user || ! $user->is_staff || ! $user->is_active || ! $user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages(['code' => ['This sign-in has expired. Please start again.']]);
        }

        if (! $this->codeIsValid($user, $code)) {
            // Too many wrong codes ends the challenge, so the 6 digits cannot be guessed.
            if (++$challenge['tries'] >= self::MAX_CODE_TRIES) {
                Cache::forget($key);
                throw ValidationException::withMessages(['code' => ['Too many wrong codes. Please sign in again.']]);
            }

            Cache::put($key, $challenge, now()->addMinutes(self::CHALLENGE_MINUTES));
            throw ValidationException::withMessages(['code' => ['The code is not correct.']]);
        }

        Cache::forget($key);

        return [$user, $this->auth->issueToken($user, AuthService::ABILITY_ADMIN)];
    }

    /** A code is valid once: the matched time step is remembered, so a replay is refused. */
    private function codeIsValid(User $user, string $code): bool
    {
        $step = $this->totp->verify((string) $user->two_factor_secret, $code);

        if ($step === null) {
            return false;
        }

        return Cache::add("2fa-used:{$user->id}:{$step}", true, now()->addMinutes(2));
    }

    private function ensureNotEnabled(User $user): void
    {
        if ($user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages(['code' => ['Two-factor authentication is already on.']]);
        }
    }

    private function challengeKey(string $id): string
    {
        return '2fa-challenge:'.hash('sha256', $id);
    }
}
