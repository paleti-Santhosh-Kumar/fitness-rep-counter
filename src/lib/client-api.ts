export async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error || `Request failed (${response.status}). Please try again.`);
  }
  return body as T;
}
