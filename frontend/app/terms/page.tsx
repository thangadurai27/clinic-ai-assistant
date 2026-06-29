"use client";

import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", padding: "80px 20px" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "#6366f1", textDecoration: "none", marginBottom: 32, fontSize: 14, fontWeight: 600 }}>
                    <ArrowLeft size={16} />
                    Back to Home
                </Link>

                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1" }}>
                        <FileText size={24} />
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: 0 }}>Terms of Service</h1>
                </div>

                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>1. Agreement to Terms</h2>
                    <p style={{ lineHeight: 1.7, color: "#94a3b8" }}>
                        By accessing or using the KLM AI Clinic Assistant, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
                    </p>
                </section>

                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>2. AI Medical Disclaimer</h2>
                    <p style={{ lineHeight: 1.7, color: "#94a3b8", background: "rgba(239, 68, 68, 0.05)", padding: 20, borderRadius: 12, border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                        <strong>IMPORTANT:</strong> The AI assistant is a tool for administrative support and general information. It is NOT a doctor. It cannot provide medical diagnoses or emergency medical advice. In case of a medical emergency, call 911 or your local emergency services immediately.
                    </p>
                </section>

                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>3. User Responsibilities</h2>
                    <p style={{ lineHeight: 1.7, color: "#94a3b8" }}>
                        Users are responsible for providing accurate information and maintaining the security of their accounts. Any misuse of the platform or attempts to disrupt its services may result in termination of access.
                    </p>
                </section>

                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>4. Limitation of Liability</h2>
                    <p style={{ lineHeight: 1.7, color: "#94a3b8" }}>
                        KLM AI Clinic Assistant is provided &quot;as is&quot; without warranties of any kind. We are not liable for any decisions made based on the AI assistant&apos;s interactions or for any technical disruptions to the service.
                    </p>
                </section>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32, marginTop: 40, textAlign: "center", fontSize: 13, color: "#475569" }}>
                    Last Updated: June 27, 2026
                </div>
            </div>
        </div>
    );
}
