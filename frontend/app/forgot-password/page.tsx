"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setSent(true);
                toast.success("Reset link sent!");
            } else {
                toast.error("Failed to send reset link.");
            }
        } catch {
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 400 }}>
                <div style={{ background: "rgba(17, 24, 39, 0.7)", backdropFilter: "blur(12px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)", padding: 40 }}>
                    {!sent ? (
                        <>
                            <div style={{ textAlign: "center", marginBottom: 32 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#6366f1" }}>
                                    <KeyRound size={28} />
                                </div>
                                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Forgot Password</h1>
                                <p style={{ fontSize: 14, color: "#94a3b8" }}>Enter your email to receive a reset link</p>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Email Address</label>
                                    <div style={{ position: "relative" }}>
                                        <Mail size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            style={{
                                                width: "100%",
                                                height: 52,
                                                background: "#0d1117",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 12,
                                                color: "#fff",
                                                padding: "0 16px 0 44px",
                                                outline: "none",
                                                fontSize: 15,
                                                boxSizing: "border-box"
                                            }}
                                        />
                                    </div>
                                </div>

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
                                        marginBottom: 24
                                    }}
                                >
                                    {loading ? "Sending..." : "Send Reset Link"}
                                </button>

                                <Link href="/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>
                                    <ArrowLeft size={16} />
                                    Back to Login
                                </Link>
                            </form>
                        </>
                    ) : (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "#22c55e" }}>
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Check your email</h2>
                            <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.6, marginBottom: 32 }}>
                                We have sent password recovery instructions to <strong>{email}</strong>.
                            </p>
                            <Link href="/login" style={{ display: "inline-block", color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                                Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
