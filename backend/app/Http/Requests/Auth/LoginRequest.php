<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Only presence is checked here: login must not reveal password rules.
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /** Failed attempts are counted per email + IP address. */
    public function throttleKey(): string
    {
        return Str::lower($this->string('email')->toString()).'|'.$this->ip();
    }
}
