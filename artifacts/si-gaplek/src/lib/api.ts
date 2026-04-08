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
    const err = await res.json().catch(() => ({ message: res.statusText || `HTTP Error ${res.status}` }));
    const errorMessage = err?.error || err?.message || `Terjadi kesalahan (Kode: ${res.status})`;
    throw new Error(errorMessage);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
