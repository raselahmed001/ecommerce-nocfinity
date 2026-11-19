<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\AddCartItemRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Models\Cart;
use App\Services\AuthService;
use App\Services\CartService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Works for logged-in customers (Bearer token) and guests (X-Cart-Token header).
 */
class CartController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    public function show(Request $request): JsonResponse
    {
        return $this->respond($this->cart($request, create: false));
    }

    public function addItem(AddCartItemRequest $request): JsonResponse
    {
        $cart = $this->cart($request, create: true);
        $this->carts->addItem(
            $cart,
            $request->validated('product_id'),
            $request->validated('quantity'),
            $request->validated('size'),
            $request->validated('color'),
        );

        return $this->respond($cart, 'Item added to cart.', 201);
    }

    public function updateItem(UpdateCartItemRequest $request, int $item): JsonResponse
    {
        $cart = $this->cart($request, create: true);
        $this->carts->updateItem($cart, $item, $request->validated('quantity'));

        return $this->respond($cart, 'Cart updated.');
    }

    public function removeItem(Request $request, int $item): JsonResponse
    {
        $cart = $this->cart($request, create: true);
        $this->carts->removeItem($cart, $item);

        return $this->respond($cart, 'Item removed.');
    }

    public function clear(Request $request): JsonResponse
    {
        if ($cart = $this->cart($request, create: false)) {
            $this->carts->clear($cart);
        }

        return $this->respond($cart, 'Cart cleared.');
    }

    /** Identify the cart owner from the token or the guest header. */
    private function cart(Request $request, bool $create): ?Cart
    {
        $user = $request->user('sanctum');

        if ($user && ! $user->tokenCan(AuthService::ABILITY_CUSTOMER)) {
            abort(403, 'Staff accounts cannot use the shopping cart.');
        }

        return $this->carts->cartFor($user, $request->header('X-Cart-Token'), $create);
    }

    private function respond(?Cart $cart, string $message = 'OK', int $status = 200): JsonResponse
    {
        return ApiResponse::success($this->carts->summary($cart), $message, $status);
    }
}
