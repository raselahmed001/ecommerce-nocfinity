<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\StripsTags;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    use StripsTags;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->stripTagsFrom(['name', 'phone']); // no HTML in names (stored XSS)
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+\-\s()]+$/'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }
}
