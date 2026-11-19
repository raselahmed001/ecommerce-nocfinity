import { cartTokenStore, tokenStore, type TokenScope } from "./storage";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
// Server-rendered pages may need another address than the browser (e.g. a Docker service name).
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? API_URL;

export interface ApiMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
}

/** Thrown for every failed call. `errors` holds the field messages of a 422 response. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** First message of a field, for showing under an input. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Which stored login token to send. Leave out for public calls. */
  scope?: TokenScope;
  /** Send the guest cart token (X-Cart-Token) too. */
  withCartToken?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL((typeof window === "undefined" ? SERVER_API_URL : API_URL) + path);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export async function api<T>(path: string, options: Options = {}): Promise<ApiResponse<T>> {
  const { method = "GET", body, query, scope, withCartToken, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  const token = scope ? tokenStore.get(scope) : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const cartToken = withCartToken ? cartTokenStore.get() : null;
  if (cartToken) headers["X-Cart-Token"] = cartToken;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Cannot reach the server. Please check your connection and try again.", 0);
  }

  let json: Partial<ApiResponse<T>> & { errors?: Record<string, string[]> } = {};
  try {
    json = await response.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (!response.ok) {
    // A rejected token means the session ended: let the auth providers log out.
    if (response.status === 401 && scope && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:expired", { detail: scope }));
    }
    throw new ApiError(json.message ?? "Something went wrong. Please try again.", response.status, json.errors ?? {});
  }

  return json as ApiResponse<T>;
}
