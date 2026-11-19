<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\StripsTags;
use Illuminate\Foundation\Http\FormRequest;

class ReviewRequest extends FormRequest
{
    use StripsTags;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->stripTagsFrom(['title', 'body']); // no HTML in reviews (stored XSS)
    }

    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:100'],
            'body' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }
}
