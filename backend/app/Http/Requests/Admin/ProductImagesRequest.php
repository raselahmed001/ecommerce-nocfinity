<?php

namespace App\Http\Requests\Admin;

use App\Services\Admin\AdminProductService;
use Illuminate\Foundation\Http\FormRequest;

class ProductImagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'images' => ['required', 'array', 'min:1', 'max:'.AdminProductService::MAX_IMAGES],
            // Real image files only, checked by content (not just the file extension).
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000'],
        ];
    }
}
