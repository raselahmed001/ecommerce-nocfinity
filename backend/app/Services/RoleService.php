<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class RoleService
{
    /** This role always has every permission and can never be edited or deleted. */
    public const SUPER_ADMIN = 'Super Admin';

    private const GUARD = 'web';

    public function list(): Collection
    {
        $counts = $this->userCounts();

        return Role::with('permissions')->orderBy('id')->get()
            ->each(fn (Role $role) => $role->setAttribute('users_count', $counts[$role->id] ?? 0));
    }

    /** A role with its permissions and how many staff members have it. */
    public function present(Role $role): Role
    {
        $role->load('permissions');
        $role->setAttribute('users_count', $this->userCounts()[$role->id] ?? 0);

        return $role;
    }

    /**
     * Permissions grouped by area (the part before the dot), ready for the matrix UI.
     * Example: [{ group: "products", permissions: [{ id, name }, ...] }, ...]
     */
    public function permissionsGrouped(): Collection
    {
        return Permission::where('guard_name', self::GUARD)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->groupBy(fn (Permission $p) => explode('.', $p->name)[0])
            ->map(fn (Collection $items, string $group) => [
                'group' => $group,
                'permissions' => $items->values(),
            ])
            ->values();
    }

    /** @param  array{name: string, permissions: list<string>}  $data */
    public function create(array $data): Role
    {
        return DB::transaction(function () use ($data) {
            $role = Role::create(['name' => $data['name'], 'guard_name' => self::GUARD]);
            $role->syncPermissions($data['permissions']);
            app(\App\Services\ActivityLogger::class)->log('role.created', "Created role \"{$role->name}\"", $role, ['permissions' => $data['permissions']]);

            return $this->fresh($role);
        });
    }

    /** @param  array{name: string, permissions: list<string>}  $data */
    public function update(Role $role, array $data): Role
    {
        $this->ensureEditable($role);

        return DB::transaction(function () use ($role, $data) {
            $role->update(['name' => $data['name']]);
            $role->syncPermissions($data['permissions']);
            app(\App\Services\ActivityLogger::class)->log('role.updated', "Updated role \"{$role->name}\"", $role, ['permissions' => $data['permissions']]);

            return $this->fresh($role);
        });
    }

    public function delete(Role $role): void
    {
        $this->ensureEditable($role);

        $users = $this->userCounts()[$role->id] ?? 0;
        if ($users > 0) {
            throw new ConflictHttpException("This role is assigned to {$users} staff member(s). Reassign them first.");
        }

        app(\App\Services\ActivityLogger::class)->log('role.deleted', "Deleted role \"{$role->name}\"", $role);
        $role->delete();
    }

    private function ensureEditable(Role $role): void
    {
        if ($role->name === self::SUPER_ADMIN) {
            throw new AccessDeniedHttpException('The Super Admin role cannot be edited or deleted.');
        }
    }

    private function fresh(Role $role): Role
    {
        return $this->present($role->fresh());
    }

    /**
     * Staff count per role id. Spatie's own withCount('users') does not work on
     * a role without a guard_name, so this counts the pivot table directly.
     *
     * @return array<int, int>
     */
    private function userCounts(): array
    {
        return DB::table(config('permission.table_names.model_has_roles'))
            ->selectRaw('role_id, COUNT(*) AS total')
            ->groupBy('role_id')
            ->pluck('total', 'role_id')
            ->all();
    }
}
