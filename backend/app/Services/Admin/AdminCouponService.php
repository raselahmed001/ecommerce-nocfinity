<?php

namespace App\Services\Admin;

use App\Models\Coupon;
use Illuminate\Pagination\LengthAwarePaginator;

class AdminCouponService
{
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return Coupon::orderByDesc('id')->paginate($perPage);
    }

    /** @param  array<string, mixed>  $data */
    public function create(array $data): Coupon
    {
        return Coupon::create($this->normalize($data));
    }

    /** @param  array<string, mixed>  $data */
    public function update(Coupon $coupon, array $data): Coupon
    {
        $coupon->update($this->normalize($data));

        return $coupon;
    }

    public function delete(Coupon $coupon): void
    {
        $coupon->delete(); // past orders keep the code as text (orders.coupon_code)
    }

    /** Codes are always stored upper-case, so lookups are not case sensitive. */
    private function normalize(array $data): array
    {
        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim($data['code']));
        }

        return $data;
    }
}
