<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CustomerIndexRequest;
use App\Http\Resources\Admin\AdminCustomerResource;
use App\Http\Resources\Admin\AdminOrderResource;
use App\Services\Admin\AdminCustomerService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CustomerController extends Controller
{
    public function __construct(private readonly AdminCustomerService $customers) {}

    public function index(CustomerIndexRequest $request): JsonResponse
    {
        return ApiResponse::paginated(
            $this->customers->paginate($request->validated('q'), (int) ($request->validated('per_page') ?? 15)),
            AdminCustomerResource::class
        );
    }

    public function show(int $customer): JsonResponse
    {
        return ApiResponse::success(new AdminCustomerResource($this->customers->find($customer)));
    }

    public function orders(CustomerIndexRequest $request, int $customer): JsonResponse
    {
        return ApiResponse::paginated(
            $this->customers->orders($customer, (int) ($request->validated('per_page') ?? 10)),
            AdminOrderResource::class
        );
    }
}
