import type { ApiErrorBody, ErrorCode } from '@app/contracts';

/** A failed API call, carrying the server's error code and any per-field messages. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK';
  readonly fields: Record<string, string>;
  readonly requestId?: string;
  /** The server's `details`, e.g. `{ issues }` for invalid lesson content. */
  readonly details?: unknown;

  constructor(
    status: number,
    code: ApiError['code'],
    message: string,
    fields = {},
    requestId?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.requestId = requestId;
    this.details = details;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Same-origin JSON client. Cookies are HttpOnly, so the browser attaches the session itself. */
export function createApi(base = '/api/v1') {
  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        credentials: 'same-origin',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(
        0,
        'NETWORK',
        'We could not reach the server. Check your connection and try again.',
      );
    }
    if (res.status === 204) return undefined as T;
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = (data as ApiErrorBody | null)?.error;
      const fields =
        (err?.details as { fields?: Record<string, string> } | undefined)?.fields ?? {};
      throw new ApiError(
        res.status,
        err?.code ?? 'INTERNAL',
        err?.message ?? 'Something went wrong. Please try again.',
        fields,
        err?.requestId,
        err?.details,
      );
    }
    return data as T;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  };
}

export type Api = ReturnType<typeof createApi>;

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}
