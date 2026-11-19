<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\TwoFactorService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TwoFactorController extends Controller
{
    public function __construct(private readonly TwoFactorService $twoFactor) {}

    public function setup(Request $request): JsonResponse
    {
        return ApiResponse::success($this->twoFactor->beginSetup($request->user()), 'Scan the QR code, then enter a code to finish.');
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);
        $this->twoFactor->confirmSetup($request->user(), $data['code']);

        return ApiResponse::success(new UserResource($request->user()->refresh()), 'Two-factor authentication is on.');
    }

    public function disable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
            'code' => ['required', 'string', 'max:10'],
        ]);
        $this->twoFactor->disable($request->user(), $data['password'], $data['code']);

        return ApiResponse::success(new UserResource($request->user()->refresh()), 'Two-factor authentication is off.');
    }
}
