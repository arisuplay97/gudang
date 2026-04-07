export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? "Terjadi kesalahan");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
