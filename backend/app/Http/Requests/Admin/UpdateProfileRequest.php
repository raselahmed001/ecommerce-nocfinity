<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\StripsTags;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UpdateProfileRequest extends FormRequest
{
    use StripsTags;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->stripTagsFrom(['name']);
    }

    /** Staff can change their own name and password, nothing else (no email, roles or flags). */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            // Changing the password needs the current one, so a stolen token is not enough.
            'current_password' => [
                'required_with:password', 'nullable', 'string',
                // Checked against the token's user (the built-in rule only knows session guards).
                fn ($attribute, $value, $fail) => Hash::check((string) $value, $this->user()->password)
                    || $fail('The current password is incorrect.'),
            ],
            'password' => ['nullable', 'confirmed', Password::defaults(), 'different:current_password'],
        ];
    }
}
