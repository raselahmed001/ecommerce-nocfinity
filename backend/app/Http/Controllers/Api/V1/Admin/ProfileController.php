<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\Admin\ProfileService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(private readonly ProfileService $profiles) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success(new UserResource($request->user()));
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->profiles->update($request->user(), $request->validated());

        return ApiResponse::success(new UserResource($user), 'Profile updated.');
    }
}
