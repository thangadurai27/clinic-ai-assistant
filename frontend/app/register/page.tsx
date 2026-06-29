"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, UserPlus, Shield, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  transition: "all 0.2s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#94a3b8",
  marginBottom: 8,
};

function Field({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  disabled,
  right,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            ...inputStyle,
            paddingRight: right ? 44 : 16,
            opacity: disabled ? 0.6 : 1,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
          autoComplete="off"
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(99,102,241,0.7)";
            e.target.style.boxShadow = "0 0 0 2px rgba(99,102,241,0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255,255,255,0.1)";
            e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          }}
        />
        {right && (
          <div
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {right}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();

  const change = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedForm = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    };

    console.log("[RegisterPage] Submitting trimmed form:", trimmedForm);

    if (!trimmedForm.full_name || !trimmedForm.email || !trimmedForm.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!agreed) {
      setError("You must accept the terms & privacy policy.");
      return;
    }

    if (trimmedForm.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (trimmedForm.password !== trimmedForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: trimmedForm.email,
        password: trimmedForm.password,
        full_name: trimmedForm.full_name,
        phone: trimmedForm.phone || undefined,
      });
      toast.success("Account created successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      console.error("[RegisterPage] Error:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#030712",
        backgroundImage: "radial-gradient(circle at 50% -20%, #1e1b4b 0%, #030712 70%)",
        padding: "40px 20px",
        fontFamily: "var(--font-inter)",
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: "100%",
          maxWidth: 480,
        }}
      >
        <div
          style={{
            background: "rgba(17, 24, 39, 0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.05)",
            padding: "40px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 16px rgba(99,102,241,0.2)"
            }}>
              <Activity size={32} color="#fff" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Join KLM Clinic
            </h1>
            <p style={{ fontSize: 14, color: "#94a3b8" }}>
              Experience AI-driven healthcare assistance
            </p>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: "12px 16px",
                borderRadius: 12,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Field
              label="Full Name"
              name="full_name"
              placeholder="How should we call you?"
              value={form.full_name}
              onChange={change}
              disabled={loading}
            />

            <Field
              label="Email Address"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={change}
              disabled={loading}
            />

            <Field
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={change}
              disabled={loading}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field
                label="Password"
                name="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={change}
                disabled={loading}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 0 }}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Field
                label="Confirm"
                name="confirmPassword"
                type={showCPw ? "text" : "password"}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={change}
                disabled={loading}
                right={
                  <button
                    type="button"
                    onClick={() => setShowCPw((v) => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 0 }}
                  >
                    {showCPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>

            {/* Terms */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
                marginBottom: 24,
                marginTop: 4,
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{
                  marginTop: 3,
                  cursor: "pointer",
                  accentColor: "#6366f1",
                }}
              />
              <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                I accept the <span style={{ color: "#6366f1", fontWeight: 600 }}>Terms & Conditions</span> and <span style={{ color: "#6366f1", fontWeight: 600 }}>Privacy Policy</span>.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(99, 102, 241, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(99, 102, 241, 0.3)";
              }}
            >
              {loading ? (
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <>
                  <UserPlus size={20} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 32, textAlign: "center", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ fontSize: 14, color: "#64748b" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4b5563" }}>
            <Shield size={14} />
            <span>HIPAA Compliant</span>
          </div>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#374151" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4b5563" }}>
            <Shield size={14} />
            <span>SSL Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
