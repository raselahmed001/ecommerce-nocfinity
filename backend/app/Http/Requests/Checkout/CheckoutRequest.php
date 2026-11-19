<?php

namespace App\Http\Requests\Checkout;

use App\Http\Requests\Concerns\StripsTags;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Only the shipping address is accepted. Prices, totals, coupon and items are
 * read on the server (from the cart), so any such field in the request is ignored.
 */
class CheckoutRequest extends FormRequest
{
    use StripsTags;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->stripTagsFrom(['name', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country']);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'phone' => ['required', 'string', 'max:30', 'regex:/^[0-9+\-\s()]{6,30}$/'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['required', 'string', 'max:20'],
            'country' => ['required', 'string', 'size:2', 'alpha'],
        ];
    }
}
