<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PasswordResetController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $this->auth->sendPasswordResetLink($request->validated('email'));

        // Same answer for known and unknown emails.
        return ApiResponse::success(null, 'If that email is registered, a reset link has been sent.');
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $this->auth->resetPassword($request->validated());

        return ApiResponse::success(null, 'Your password has been reset.');
    }
}
