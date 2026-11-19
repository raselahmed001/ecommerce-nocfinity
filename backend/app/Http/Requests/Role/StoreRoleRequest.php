<?php

namespace App\Http\Requests\Role;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Access is already enforced by the can:roles.manage route middleware.
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:50', 'unique:roles,name'],
            'permissions' => ['present', 'array'],
            // Only existing permissions can be assigned; new ones cannot be invented via the API.
            'permissions.*' => ['string', 'distinct', 'exists:permissions,name'],
        ];
    }
}
