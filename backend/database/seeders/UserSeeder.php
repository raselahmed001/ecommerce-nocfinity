<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /** Demo password for every seeded account. Change it outside local development. */
    public const PASSWORD = 'Password@123';

    public function run(): void
    {
        $staff = [
            ['Super Admin', 'superadmin@example.com', 'Super Admin'],
            ['Alice Admin', 'admin@example.com', 'Admin'],
            ['Paul Product', 'product@example.com', 'Product Manager'],
            ['Olivia Orders', 'orders@example.com', 'Order Manager'],
            ['Sam Support', 'support@example.com', 'Support'],
        ];

        foreach ($staff as [$name, $email, $role]) {
            $user = $this->makeUser($name, $email, true);
            $user->syncRoles([$role]);
        }

        $customers = [
            ['Rahim Uddin', 'customer@example.com', '01711000001'],
            ['Karim Hasan', 'karim@example.com', '01711000002'],
            ['Nusrat Jahan', 'nusrat@example.com', '01711000003'],
            ['Tanvir Ahmed', 'tanvir@example.com', '01711000004'],
            ['Sadia Islam', 'sadia@example.com', '01711000005'],
            ['Mehedi Hasan', 'mehedi@example.com', '01711000006'],
        ];

        foreach ($customers as [$name, $email, $phone]) {
            $this->makeUser($name, $email, false, $phone);
        }
    }

    private function makeUser(string $name, string $email, bool $isStaff, ?string $phone = null): User
    {
        // is_staff is not mass assignable on purpose, so it is set directly.
        $user = User::firstOrNew(['email' => $email]);
        $user->name = $name;
        $user->phone = $phone;
        $user->password = self::PASSWORD; // hashed by the model cast
        $user->is_staff = $isStaff;
        $user->is_active = true;
        $user->email_verified_at = now();
        $user->save();

        return $user;
    }
}
