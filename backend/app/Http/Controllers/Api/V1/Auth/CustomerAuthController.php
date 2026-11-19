<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use App\Services\CartService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerAuthController extends Controller
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly CartService $carts,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        [$user, $token] = $this->auth->registerCustomer($request->validated());
        $this->carts->mergeGuestCart($user, $request->header('X-Cart-Token'));

        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $token,
        ], 'Registration successful.', 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        [$user, $token] = $this->auth->login(
            $request->validated('email'),
            $request->validated('password'),
            staff: false,
            throttleKey: $request->throttleKey(),
        );
        // A cart built as a guest is merged into the customer's own cart.
        $this->carts->mergeGuestCart($user, $request->header('X-Cart-Token'));

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
