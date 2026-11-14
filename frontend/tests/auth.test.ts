import { afterEach, describe, expect, it, vi } from "vitest";
import { authAPI, AuthApiError } from "../lib/auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authAPI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the real session payload on successful login", async () => {
    const payload = {
      success: true,
      message: "Login successful",
      user: { id: "user-demo", email: "demo@gmail.com", is_demo: true },
      access_token: "access",
      refresh_token: "refresh",
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await authAPI.login("demo@gmail.com", "demo123");

    expect(result.success).toBe(true);
    expect(result.access_token).toBe("access");
    expect(result.user?.is_demo).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/auth/login");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "demo@gmail.com",
      password: "demo123",
    });
  });

  it("surfaces backend error details with the HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ detail: "Invalid email or password" }, 401)
      )
    );

    await expect(authAPI.login("demo@gmail.com", "wrong")).rejects.toMatchObject({
      name: "AuthApiError",
      message: "Invalid email or password",
      status: 401,
    });
  });

  it("wraps network failures in a friendly error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("dns failure")));

    const error = await authAPI.login("demo@gmail.com", "demo123").catch((err) => err);

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error.status).toBe(0);
    expect(error.message).toContain("Unable to reach");
  });

  it("loads the public demo configuration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          enabled: true,
          email: "demo@gmail.com",
          password: "demo123",
          read_only: true,
        })
      )
    );

    const config = await authAPI.getDemoConfig();

    expect(config.enabled).toBe(true);
    expect(config.email).toBe("demo@gmail.com");
    expect(config.password).toBe("demo123");
    expect(config.read_only).toBe(true);
  });
});
