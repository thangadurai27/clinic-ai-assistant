"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 52,
  background: "#0d1117",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 15,
  padding: "0 16px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#94a3b8",
  marginBottom: 8,
};

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError((err as Error).message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /*
     * Outer shell:
     *   - width: 100% — never wider than viewport
     *   - min-height: 100vh — at least full screen tall
     *   - overflow: visible (default) — never clipped
     *   - padding top+bottom — card breathes at all sizes
     *   - display flex + align-items center — vertically center when content fits
     */
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(45,35,120,0.55) 0%, #08091a 65%)",
        padding: "48px 16px",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div className="animate-fade-in"
        style={{ width: "100%", maxWidth: 520 }}
      >
        {/* Card */}
        <div
          style={{
            background: "#111827",
            borderRadius: 18,
            border: "1px solid rgba(99,102,241,0.35)",
            borderTop: "2px solid rgba(99,102,241,0.7)",
            padding: "48px 44px 40px",
            boxShadow:
              "0 0 80px rgba(99,102,241,0.12), 0 32px 64px rgba(0,0,0,0.5)",
          }}
        >
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 6,
              lineHeight: 1.2,
            }}
          >
            Terminal Login
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 40 }}>
            Access your KLM AI Clinic operations dashboard
          </p>

          {/* Error */}
          {error && (
            <div className="animate-fade-in"
              style={{
                marginBottom: 20,
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 22 }}
          >
            {/* Email */}
            <div>
              <label style={labelStyle}>System Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., manager@institution.com"
                required
                disabled={loading}
                style={{ ...inputStyle, opacity: loading ? 0.6 : 1 }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(99,102,241,0.7)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Primary Password
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: 12,
                    color: "#6366f1",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  style={{
                    ...inputStyle,
                    paddingRight: 44,
                    opacity: loading ? 0.6 : 1,
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(99,102,241,0.7)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#475569",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 12,
                border: "none",
                background: loading
                  ? "rgba(99,102,241,0.5)"
                  : "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Authenticating...
                </>
              ) : (
                "Launch Terminal Login"
              )}
            </button>
          </form>

          <p
            style={{
              marginTop: 28,
              textAlign: "center",
              fontSize: 14,
              color: "#475569",
            }}
          >
            New facility?{" "}
            <Link
              href="/register"
              style={{
                color: "#6366f1",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Provision New AI Gateway
            </Link>
          </p>
        </div>

        {/* Legal */}
        <p
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 12,
            color: "#334155",
          }}
        >
          By signing in, you agree to our{" "}
          <Link
            href="/terms"
            style={{ color: "#6366f1", textDecoration: "none" }}
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            style={{ color: "#6366f1", textDecoration: "none" }}
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
