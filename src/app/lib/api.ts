const configuredApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE = (configuredApiBase || "http://localhost:4000/api").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 30000;

type JsonValue = Record<string, unknown> | unknown[];

export class ApiFetchError extends Error {
  status?: number;
  url: string;
  constructor(message: string, url: string, status?: number) {
    super(message);
    this.name = "ApiFetchError";
    this.url = url;
    this.status = status;
  }
}

export const setAuthToken = (token: string) => localStorage.setItem("bpda_auth_token", token);
export const clearAuthToken = () => localStorage.removeItem("bpda_auth_token");
export const getAuthToken = () => localStorage.getItem("bpda_auth_token");

const criticalPaths = new Set(["/admin/export-all"]);
const pathFromUrl = (url: string) => url.startsWith(API_BASE) ? url.slice(API_BASE.length) || "/" : new URL(url).pathname.replace(/^\/api/, "");
const emptyPayloadFor = (url: string): JsonValue | null => {
  const path = pathFromUrl(url);
  if (criticalPaths.has(path)) return null;
  if (path === "/users/pending") return { users: [] };
  if (path === "/users") return { users: [] };
  if (path === "/doctors") return { doctors: [] };
  if (path === "/medicines") return { medicines: [] };
  if (path === "/prescriptions") return { prescriptions: [] };
  if (path === "/prescriptions/current") return { prescriptions: [] };
  if (/^\/doctor\/[^/]+\/polli-chikitsok$/.test(path)) return { polli_chikitsok: [] };
  if (/^\/prescriptions\/archive\/[^/]+\/dates$/.test(path)) return { dates: [] };
  if (/^\/prescriptions\/archive\/[^/]+\/[^/]+$/.test(path)) return { prescriptions: [] };
  return null;
};
const jsonResponse = (payload: JsonValue, status = 200) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
const readErrorMessage = async (response: Response) => {
  try { const data = await response.clone().json(); return data?.error || data?.message || `Request failed with status ${response.status}`; }
  catch { return `Request failed with status ${response.status}`; }
};

export async function apiFetch(pathOrUrl: string, init: RequestInit = {}) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE}${pathOrUrl}`;
  const headers = new Headers(init.headers);
  const method = (init.method || "GET").toUpperCase();
  const token = getAuthToken();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  try {
    const response = await fetch(url, { ...init, headers, signal: init.signal || controller.signal });
    const fallback = method === "GET" ? emptyPayloadFor(url) : null;
    if (!response.ok && fallback) return jsonResponse(fallback);
    if (!response.ok) throw new ApiFetchError(await readErrorMessage(response), url, response.status);
    return response;
  } catch (error) {
    const fallback = method === "GET" ? emptyPayloadFor(url) : null;
    if (fallback) return jsonResponse(fallback);
    if (error instanceof ApiFetchError) throw error;
    const message = error instanceof DOMException && error.name === "AbortError"
      ? "Request timed out. Please check your dedicated backend server."
      : "Could not connect to the dedicated backend server. Please verify VITE_API_BASE_URL and server deployment.";
    throw new ApiFetchError(message, url);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
