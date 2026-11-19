<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CouponRequest;
use App\Http\Resources\Admin\AdminCouponResource;
use App\Models\Coupon;
use App\Services\Admin\AdminCouponService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    public function __construct(private readonly AdminCouponService $coupons) {}

    public function index(): JsonResponse
    {
        return ApiResponse::paginated($this->coupons->paginate(), AdminCouponResource::class);
    }

    public function show(Coupon $coupon): JsonResponse
    {
        return ApiResponse::success(new AdminCouponResource($coupon));
    }

    public function store(CouponRequest $request): JsonResponse
    {
        return ApiResponse::success(new AdminCouponResource($this->coupons->create($request->validated())), 'Coupon created.', 201);
    }

    public function update(CouponRequest $request, Coupon $coupon): JsonResponse
    {
        return ApiResponse::success(new AdminCouponResource($this->coupons->update($coupon, $request->validated())), 'Coupon updated.');
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $this->coupons->delete($coupon);

        return ApiResponse::success(null, 'Coupon deleted.');
    }
}
