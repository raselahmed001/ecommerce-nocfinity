<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\StripsTags;
use App\Services\Admin\AdminProductService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create and update share the same rules (create may also carry images). */
class ProductRequest extends FormRequest
{
    use StripsTags;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Descriptions are plain text, so any HTML is removed (stored XSS protection).
        $this->stripTagsFrom(['name', 'sku', 'description']);
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'sku' => ['required', 'string', 'max:100', 'alpha_dash', Rule::unique('products', 'sku')->ignore($this->route('product'))],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'min:0.01', 'max:99999999.99', 'decimal:0,2'],
            'discount_price' => ['nullable', 'numeric', 'min:0.01', 'decimal:0,2', 'lt:price'],
            'stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            // Options shown on the storefront. Names are plain words (letters, digits, space, dash).
            'sizes' => ['nullable', 'array', 'max:12'],
            'sizes.*' => ['string', 'max:20', 'distinct', 'regex:/^[A-Za-z0-9 \-]+$/'],
            'colors' => ['nullable', 'array', 'max:12'],
            'colors.*' => ['string', 'max:30', 'distinct', 'regex:/^[A-Za-z0-9 \-]+$/'],
            'rating' => ['nullable', 'numeric', 'between:0,5', 'decimal:0,1'],
            'is_active' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'images' => ['sometimes', 'array', 'max:'.AdminProductService::MAX_IMAGES],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000'],
        ];
    }
}
