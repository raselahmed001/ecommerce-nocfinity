<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductIndexRequest extends FormRequest
{
    public const SORTS = ['newest', 'popular', 'price_asc', 'price_desc'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:255', 'exists:categories,slug'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            // Only compared with min_price when a min price was sent too.
            'max_price' => ['nullable', 'numeric', 'min:0', Rule::when($this->filled('min_price'), ['gte:min_price'])],
            'sort' => ['nullable', 'string', 'in:'.implode(',', self::SORTS)],
            'featured' => ['nullable', 'boolean'],
            'on_sale' => ['nullable', 'boolean'],
            'size' => ['nullable', 'string', 'max:20'],
            'color' => ['nullable', 'string', 'max:30'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
