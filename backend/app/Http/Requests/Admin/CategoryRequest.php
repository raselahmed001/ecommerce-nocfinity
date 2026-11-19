<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\StripsTags;
use Illuminate\Foundation\Http\FormRequest;

/** Same rules for create and update. */
class CategoryRequest extends FormRequest
{
    use StripsTags;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->stripTagsFrom(['name', 'description']);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
