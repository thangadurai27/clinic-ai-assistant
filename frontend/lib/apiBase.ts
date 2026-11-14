/**
 * Shared API/WebSocket URL resolution.
 *
 * `NEXT_PUBLIC_API_URL` is inlined by Next.js at build time. When it is not set
 * (for example a preview deployment that forgot the variable) we fall back to
 * the known production backend instead of silently calling localhost.
 */

const PRODUCTION_API_BASE = "https://clinic-ai-backend-t38f.onrender.com/api/v1";
const DEVELOPMENT_API_BASE = "http://localhost:8001/api/v1";

function normalize(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim()) {
    return normalize(configured);
  }
  return process.env.NODE_ENV === "production"
    ? PRODUCTION_API_BASE
    : DEVELOPMENT_API_BASE;
}

export const API_BASE = resolveApiBase();

/**
 * WebSocket URL for the FastAPI realtime endpoint.
 * Defaults to the matching `/ws` path on the API host so production never
 * attempts `ws://localhost`.
 */
export function getWebSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured && configured.trim()) {
    return normalize(configured);
  }

  if (API_BASE.startsWith("/")) {
    if (typeof window === "undefined") return "";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${API_BASE}/ws`;
  }

  return `${API_BASE.replace(/^http/i, "ws")}/ws`;
}
