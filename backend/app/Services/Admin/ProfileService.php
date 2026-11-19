<?php

namespace App\Services\Admin;

use App\Models\User;

class ProfileService
{
    /** @param  array{name: string, password?: ?string}  $data */
    public function update(User $user, array $data): User
    {
        $user->name = $data['name'];

        if (! empty($data['password'])) {
            $user->password = $data['password']; // hashed by the model cast

            // Sign out every other device, keep the one that made this request.
            $current = $user->currentAccessToken();
            $user->tokens()->where('id', '!=', $current?->id)->delete();
        }

        $user->save();

        return $user;
    }
}
