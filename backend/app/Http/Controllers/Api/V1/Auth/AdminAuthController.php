<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Http\Requests\Auth\TwoFactorChallengeRequest;
use App\Services\ActivityLogger;
use App\Services\AuthService;
use App\Services\TwoFactorService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuthController extends Controller
{
    public function __construct(private readonly AuthService $auth, private readonly TwoFactorService $twoFactor, private readonly ActivityLogger $log) {}

    public function login(LoginRequest $request): JsonResponse
    {
        [$user, $token] = $this->auth->login(
            $request->validated('email'),
            $request->validated('password'),
            staff: true,
            throttleKey: $request->throttleKey(),
        );

        // Password was right but this account uses 2FA: no token yet, only a challenge.
        if ($token === null) {
            return ApiResponse::success([
                'two_factor_required' => true,
                'challenge' => $this->twoFactor->startChallenge($user),
            ], 'Enter the code from your authenticator app.');
        }

        $this->log->log('auth.login', 'Signed in', null, [], $user);

        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $token,
        ], 'Login successful.');
    }

    public function twoFactorChallenge(TwoFactorChallengeRequest $request): JsonResponse
    {
        [$user, $token] = $this->twoFactor->completeChallenge(
            $request->validated('challenge'),
            $request->validated('code'),
        );

        $this->log->log('auth.login', 'Signed in with a two-factor code', null, [], $user);

        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $token,
        ], 'Login successful.');
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user());

        return ApiResponse::success(null, 'Logged out.');
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(new UserResource($request->user()));
    }
}
