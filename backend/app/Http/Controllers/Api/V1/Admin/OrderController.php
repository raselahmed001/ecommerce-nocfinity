<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OrderIndexRequest;
use App\Http\Requests\Admin\UpdateOrderStatusRequest;
use App\Http\Resources\Admin\AdminOrderDetailResource;
use App\Http\Resources\Admin\AdminOrderResource;
use App\Models\Order;
use App\Services\Admin\AdminOrderService;
use App\Services\OrderStatusService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    public function __construct(
        private readonly AdminOrderService $orders,
        private readonly OrderStatusService $statuses,
    ) {}

    public function index(OrderIndexRequest $request): JsonResponse
    {
        return ApiResponse::paginated($this->orders->paginate($request->validated()), AdminOrderResource::class);
    }

    public function show(Order $order): JsonResponse
    {
        return ApiResponse::success(new AdminOrderDetailResource($this->orders->load($order)));
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $order = $this->statuses->change($order, $request->validated('status'));

        return ApiResponse::success(new AdminOrderDetailResource($this->orders->load($order)), 'Order status updated.');
    }
}
