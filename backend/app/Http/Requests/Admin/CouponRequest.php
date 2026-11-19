<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => strtoupper(trim($this->input('code')))]);
        }
    }

    public function rules(): array
    {
        $isPercentage = $this->input('type') === 'percentage';

        return [
            'code' => ['required', 'string', 'min:3', 'max:50', 'alpha_dash', Rule::unique('coupons', 'code')->ignore($this->route('coupon'))],
            'type' => ['required', Rule::in(['percentage', 'fixed'])],
            // A percentage can never be above 100, so a coupon cannot make the order negative.
            'value' => ['required', 'numeric', 'gt:0', 'decimal:0,2', $isPercentage ? 'max:100' : 'max:99999999.99'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0', 'decimal:0,2'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
