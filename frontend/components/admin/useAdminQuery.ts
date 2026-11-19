"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api, type ApiMeta } from "@/lib/api";

type Query = Record<string, string | number | boolean | null | undefined>;

interface Result<T> {
  key: string;
  data: T | null;
  meta: ApiMeta | null;
  error: string;
}

/**
 * Loads a list or record from the admin API and reloads when the path or filters change.
 * `loading` is true while the stored result belongs to an older request key.
 */
export function useAdminQuery<T>(path: string | null, query?: Query) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const queryKey = JSON.stringify(query ?? {});
  const requestKey = `${path}|${queryKey}|${tick}`;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;

    api<T>(path, { scope: "admin", query: JSON.parse(queryKey) })
      .then((res) => !cancelled && setResult({ key: requestKey, data: res.data, meta: res.meta ?? null, error: "" }))
      .catch((e) => !cancelled && setResult((old) => ({ key: requestKey, data: old?.data ?? null, meta: old?.meta ?? null, error: e instanceof ApiError ? e.message : "Could not load the data." })));

    return () => {
      cancelled = true;
    };
  }, [path, queryKey, tick, requestKey]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return {
    // The previous data stays visible while a new page or filter loads.
    data: result?.data ?? null,
    meta: result?.meta ?? null,
    loading: !!path && result?.key !== requestKey,
    error: result?.key === requestKey ? result.error : "",
    reload,
  };
}
