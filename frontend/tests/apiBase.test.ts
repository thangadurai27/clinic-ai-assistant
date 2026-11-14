import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("api base resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses NEXT_PUBLIC_API_URL when provided", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/api/v1/");
    const { API_BASE } = await import("../lib/apiBase");
    expect(API_BASE).toBe("https://api.example.com/api/v1");
  });

  it("falls back to the production backend when unset in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { API_BASE } = await import("../lib/apiBase");
    expect(API_BASE).toBe("https://clinic-ai-backend-t38f.onrender.com/api/v1");
  });

  it("falls back to localhost in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { API_BASE } = await import("../lib/apiBase");
    expect(API_BASE).toBe("http://localhost:8001/api/v1");
  });

  it("derives a secure websocket URL from the API URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/api/v1");
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "");
    const { getWebSocketUrl } = await import("../lib/apiBase");
    expect(getWebSocketUrl()).toBe("wss://api.example.com/api/v1/ws");
  });

  it("honours an explicit websocket override", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/api/v1");
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "wss://realtime.example.com/ws");
    const { getWebSocketUrl } = await import("../lib/apiBase");
    expect(getWebSocketUrl()).toBe("wss://realtime.example.com/ws");
  });
});
