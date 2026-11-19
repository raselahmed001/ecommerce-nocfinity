<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminOrderResource;
use App\Services\Admin\DashboardService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboard) {}

    public function __invoke(): JsonResponse
    {
        $data = $this->dashboard->overview();
        $data['recent_orders'] = AdminOrderResource::collection($data['recent_orders']);

        return ApiResponse::success($data);
    }
}
