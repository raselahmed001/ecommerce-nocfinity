<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\RoleService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(private readonly RoleService $roles) {}

    /** All permissions grouped by area: the rows of the permission matrix. */
    public function index(): JsonResponse
    {
        return ApiResponse::success($this->roles->permissionsGrouped());
    }
}
