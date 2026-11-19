<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /** Every permission in the system, grouped by area. */
    public const PERMISSIONS = [
        'products.view', 'products.create', 'products.edit', 'products.delete',
        'categories.manage',
        'orders.view', 'orders.update_status',
        'coupons.manage',
        'customers.view',
        'reports.view',
        'reviews.manage',
        'activity.view',
        'roles.manage',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $roles = [
            // Super Admin gets everything (also bypassed via Gate::before later).
            'Super Admin' => self::PERMISSIONS,
            // Admin: everything except managing roles.
            'Admin' => array_values(array_diff(self::PERMISSIONS, ['roles.manage'])),
            'Product Manager' => [
                'products.view', 'products.create', 'products.edit', 'products.delete',
                'categories.manage', 'reviews.manage',
            ],
            'Order Manager' => [
                'orders.view', 'orders.update_status', 'customers.view', 'reports.view',
            ],
            'Support' => [
                'orders.view', 'customers.view', 'products.view', 'reviews.manage',
            ],
        ];

        foreach ($roles as $roleName => $permissions) {
            Role::findOrCreate($roleName, 'web')->syncPermissions($permissions);
        }
    }
}
