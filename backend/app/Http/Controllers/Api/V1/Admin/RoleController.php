<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct(private readonly RoleService $roles) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success(RoleResource::collection($this->roles->list()));
    }

    public function show(Role $role): JsonResponse
    {
        return ApiResponse::success(new RoleResource($this->roles->present($role)));
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->roles->create($request->validated());

        return ApiResponse::success(new RoleResource($role), 'Role created.', 201);
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $role = $this->roles->update($role, $request->validated());

        return ApiResponse::success(new RoleResource($role), 'Role updated.');
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->roles->delete($role);

        return ApiResponse::success(null, 'Role deleted.');
    }
}
