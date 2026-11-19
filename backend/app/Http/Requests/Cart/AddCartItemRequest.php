<?php

namespace App\Http\Requests\Cart;

use Illuminate\Foundation\Http\FormRequest;

class AddCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** Only the product and the quantity are accepted. A "price" field is never read. */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer'],
            // Checked against the product's own sizes and colors in CartService.
            'size' => ['nullable', 'string', 'max:20'],
            'color' => ['nullable', 'string', 'max:30'],
            'quantity' => ['required', 'integer', 'min:1', 'max:'.config('shop.max_item_quantity')],
        ];
    }
}
