<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderDetailResource;
use App\Http\Resources\OrderResource;
use App\Services\OrderService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** "My Orders": a customer only ever sees their own orders. */
class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request): JsonResponse
    {
        return ApiResponse::paginated($this->orders->paginateForUser($request->user()), OrderResource::class);
    }

    public function show(Request $request, string $orderNumber): JsonResponse
    {
        return ApiResponse::success(
            new OrderDetailResource($this->orders->findForUser($request->user(), $orderNumber))
        );
    }
}
