import { BACKEND_URL, BackendError } from "@/app/lib/backend";

/**
 * POST a multipart body to NestJS and return the unwrapped `data` payload.
 *
 * `backendFetch` is JSON-only (it sets Content-Type itself and stringifies the
 * body). Multipart needs the runtime to generate the boundary, so this variant
 * leaves Content-Type alone. Errors follow the same contract: status 0 when the
 * backend is unreachable, otherwise the backend's own status and message.
 */
export async function backendUpload<T = unknown>(
  path: string,
  form: FormData,
  token: string,
  timeoutMs = 30_000,
): Promise<T> {
  const origin = BACKEND_URL.endsWith("/api") ? BACKEND_URL : `${BACKEND_URL}/api`;
  const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    throw new BackendError(0, "Backend unreachable");
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  const record = (json ?? {}) as Record<string, unknown>;

  if (!res.ok) {
    const message = (record.message as string) ?? (record.error as string) ?? `Backend error (${res.status})`;
    throw new BackendError(res.status, typeof message === "string" ? message : JSON.stringify(message));
  }
  return ("data" in record ? record.data : json) as T;
}
