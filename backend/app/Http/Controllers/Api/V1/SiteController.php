<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SiteContentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class SiteController extends Controller
{
    public function __construct(private readonly SiteContentService $site) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success($this->site->content());
    }
}
