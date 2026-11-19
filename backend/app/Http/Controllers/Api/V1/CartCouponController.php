<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\ApplyCouponRequest;
use App\Services\AuthService;
use App\Services\CartService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartCouponController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    public function apply(ApplyCouponRequest $request): JsonResponse
    {
        $cart = $this->carts->cartFor(...$this->owner($request), create: false);

        if (! $cart) {
            return ApiResponse::error('Your cart is empty.', 422, ['code' => ['Add items to your cart before applying a coupon.']]);
        }

        $this->carts->applyCoupon($cart, $request->validated('code'));

        return ApiResponse::success($this->carts->summary($cart), 'Coupon applied.');
    }

    public function remove(Request $request): JsonResponse
    {
        $cart = $this->carts->cartFor(...$this->owner($request), create: false);

        if ($cart) {
            $this->carts->removeCoupon($cart);
        }

        return ApiResponse::success($this->carts->summary($cart), 'Coupon removed.');
    }

    /** @return array{0: ?\App\Models\User, 1: ?string} */
    private function owner(Request $request): array
    {
        $user = $request->user('sanctum');

        if ($user && ! $user->tokenCan(AuthService::ABILITY_CUSTOMER)) {
            abort(403, 'Staff accounts cannot use the shopping cart.');
        }

        return [$user, $request->header('X-Cart-Token')];
    }
}
