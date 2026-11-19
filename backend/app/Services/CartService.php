<?php

namespace App\Services;

use App\Http\Resources\ProductResource;
use App\Models\Cart;
use App\Models\Product;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function __construct(
        private readonly CartPricingService $pricing,
        private readonly CouponService $coupons,
    ) {}

    /**
     * Find the cart of a logged-in customer, or of a guest by token.
     * With $create = true a missing cart is created.
     */
    public function cartFor(?User $user, ?string $guestToken, bool $create): ?Cart
    {
        if ($user) {
            return $create
                ? Cart::firstOrCreate(['user_id' => $user->id])
                : Cart::where('user_id', $user->id)->first();
        }

        $cart = $guestToken
            ? Cart::whereNull('user_id')->where('guest_token', $guestToken)->first()
            : null;

        if (! $cart && $create) {
            $cart = Cart::create(['guest_token' => Str::random(40)]);
        }

        return $cart;
    }

    public function addItem(Cart $cart, int $productId, int $quantity, ?string $size = null, ?string $color = null): void
    {
        DB::transaction(function () use ($cart, $productId, $quantity, $size, $color) {
            $product = Product::where('is_active', true)->find($productId);

            if (! $product) {
                throw ValidationException::withMessages(['product_id' => ['This product is not available.']]);
            }
            if ($product->stock < 1) {
                throw ValidationException::withMessages(['product_id' => ['This product is out of stock.']]);
            }

            $size = $this->chooseOption($product->sizes, $size, 'size');
            $color = $this->chooseOption($product->colors, $color, 'color');

            $item = $cart->items()
                ->where(['product_id' => $product->id, 'size' => $size, 'color' => $color])
                ->lockForUpdate()
                ->first();
            $newQuantity = ($item?->quantity ?? 0) + $quantity;

            // Other lines of the same product (other size / color) draw from the same stock.
            $otherLines = $cart->items()->where('product_id', $product->id)->where('id', '!=', $item?->id)->sum('quantity');
            $this->assertQuantityAllowed($product, $newQuantity, (int) $otherLines);

            $item
                ? $item->update(['quantity' => $newQuantity])
                : $cart->items()->create([
                    'product_id' => $product->id, 'size' => $size, 'color' => $color, 'quantity' => $newQuantity,
                ]);
        });
    }

    public function updateItem(Cart $cart, int $itemId, int $quantity): void
    {
        $item = $cart->items()->with('product')->findOrFail($itemId); // only items of THIS cart

        $product = $item->product;
        if (! $product || $product->trashed() || ! $product->is_active || $product->stock < 1) {
            throw ValidationException::withMessages(['quantity' => ['This product is not available.']]);
        }

        $otherLines = $cart->items()->where('product_id', $product->id)->where('id', '!=', $item->id)->sum('quantity');
        $this->assertQuantityAllowed($product, $quantity, (int) $otherLines);

        $item->update(['quantity' => $quantity]);
    }

    public function removeItem(Cart $cart, int $itemId): void
    {
        $cart->items()->findOrFail($itemId)->delete();
    }

    public function clear(Cart $cart): void
    {
        $cart->items()->delete();
        $cart->update(['coupon_id' => null]);
    }

    public function applyCoupon(Cart $cart, string $code): void
    {
        $cart->load(['items.product', 'coupon']);
        $subtotal = $this->pricing->calculate($cart)['subtotal_cents'];

        if ($subtotal === 0) {
            throw ValidationException::withMessages(['code' => ['Add items to your cart before applying a coupon.']]);
        }

        $coupon = $this->coupons->findByCode($code);

        if (! $coupon) {
            throw ValidationException::withMessages(['code' => ['Invalid coupon code.']]);
        }
        if ($error = $this->coupons->validationError($coupon, $subtotal)) {
            throw ValidationException::withMessages(['code' => [$error]]);
        }

        $cart->update(['coupon_id' => $coupon->id]);
    }

    public function removeCoupon(Cart $cart): void
    {
        $cart->update(['coupon_id' => null]);
    }

    /** Move a guest cart into the customer's cart after login or registration. */
    public function mergeGuestCart(User $user, ?string $guestToken): void
    {
        if (! $guestToken) {
            return;
        }

        $guest = Cart::whereNull('user_id')->where('guest_token', $guestToken)->first();
        if (! $guest) {
            return;
        }

        DB::transaction(function () use ($user, $guest) {
            $cart = Cart::firstOrCreate(['user_id' => $user->id]);

            foreach ($guest->items()->with('product')->get() as $guestItem) {
                $product = $guestItem->product;
                if (! $product || $product->trashed() || ! $product->is_active || $product->stock < 1) {
                    continue;
                }

                $existing = $cart->items()
                    ->where(['product_id' => $product->id, 'size' => $guestItem->size, 'color' => $guestItem->color])
                    ->first();
                $quantity = min(
                    ($existing?->quantity ?? 0) + $guestItem->quantity,
                    $product->stock,
                    config('shop.max_item_quantity'),
                );

                $existing
                    ? $existing->update(['quantity' => $quantity])
                    : $cart->items()->create([
                        'product_id' => $product->id, 'size' => $guestItem->size, 'color' => $guestItem->color, 'quantity' => $quantity,
                    ]);
            }

            if (! $cart->coupon_id && $guest->coupon_id) {
                $cart->update(['coupon_id' => $guest->coupon_id]);
            }

            $guest->delete(); // its items go with it (cascade)
        });
    }

    /** The cart as the API returns it. A missing cart is shown as an empty one. */
    public function summary(?Cart $cart): array
    {
        if (! $cart) {
            return $this->emptySummary();
        }

        $cart->load(['items.product.images', 'coupon']);
        $priced = $this->pricing->calculate($cart);

        return [
            'guest_token' => $cart->user_id ? null : $cart->guest_token,
            'items' => collect($priced['lines'])->map(fn (array $line) => [
                'id' => $line['item']->id,
                'quantity' => $line['item']->quantity,
                'size' => $line['item']->size ?: null,
                'color' => $line['item']->color ?: null,
                'unit_price' => Money::format($line['unit_cents']),
                'line_total' => Money::format($line['line_cents']),
                'issue' => $line['issue'],
                'product' => $line['item']->product ? new ProductResource($line['item']->product) : null,
            ])->values(),
            'item_count' => $cart->items->sum('quantity'),
            'subtotal' => Money::format($priced['subtotal_cents']),
            'discount' => Money::format($priced['discount_cents']),
            'shipping' => Money::format($priced['shipping_cents']),
            'total' => Money::format($priced['total_cents']),
            'coupon' => $priced['coupon'] ? [
                'code' => $priced['coupon']->code,
                'type' => $priced['coupon']->type,
                'value' => $priced['coupon']->value,
                'error' => $priced['coupon_error'],
            ] : null,
            'has_issues' => $priced['has_issues'],
        ];
    }

    private function emptySummary(): array
    {
        $zero = Money::format(0);

        return [
            'guest_token' => null, 'items' => [], 'item_count' => 0,
            'subtotal' => $zero, 'discount' => $zero, 'shipping' => $zero, 'total' => $zero,
            'coupon' => null, 'has_issues' => false,
        ];
    }

    /**
     * A product with sizes / colors needs a valid choice; a product without them takes none.
     * Returns the value to store ('' means "no option").
     */
    private function chooseOption(?array $allowed, ?string $value, string $field): string
    {
        if (empty($allowed)) {
            return '';
        }
        if ($value === null || $value === '') {
            throw ValidationException::withMessages([$field => ["Please choose a {$field}."]]);
        }
        if (! in_array($value, $allowed, true)) {
            throw ValidationException::withMessages([$field => ["This {$field} is not available for this product."]]);
        }

        return $value;
    }

    /** $inOtherLines = quantity of the same product already in the cart under another size / color. */
    private function assertQuantityAllowed(Product $product, int $quantity, int $inOtherLines = 0): void
    {
        if ($quantity + $inOtherLines > $product->stock) {
            throw ValidationException::withMessages(['quantity' => ["Only {$product->stock} left in stock."]]);
        }
        if ($quantity > config('shop.max_item_quantity')) {
            throw ValidationException::withMessages([
                'quantity' => ['You can order at most '.config('shop.max_item_quantity').' of one product.'],
            ]);
        }
    }
}
