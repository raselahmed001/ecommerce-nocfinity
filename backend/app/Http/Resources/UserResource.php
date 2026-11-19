<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Only safe fields are listed, so password hashes and tokens can never leak.
 *
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_staff' => $this->is_staff,
            // The admin UI uses these to show or hide menus and buttons.
            'roles' => $this->when($this->is_staff, fn () => $this->getRoleNames()),
            'permissions' => $this->when(
                $this->is_staff,
                fn () => $this->getAllPermissions()->pluck('name')->values()
            ),
        ];
    }
}
