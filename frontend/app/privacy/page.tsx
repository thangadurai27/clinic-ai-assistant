"use client";

import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", padding: "80px 20px" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "#6366f1", textDecoration: "none", marginBottom: 32, fontSize: 14, fontWeight: 600 }}>
                    <ArrowLeft size={16} />
                    Back to Home
                </Link>

                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1" }}>
                        <Shield size={24} />
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: 0 }}>Privacy Policy</h1>
                </div>

                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>1. Information We Collect</h2>
                    <p style={{ lineHeight: 1.7, color: "#94a3b8" }}>
                        KLM AI Clinic Assistant collects personal information necessary for medical appointment scheduling and patient communication. This includes your name, email address, phone number, and any health-related information you share with our AI assistant.
                    </p>
                </section>

                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>2. How We Use Your Data</h2>
                    <p style={{ lineHeight: 1.7, color: "#94a3b8" }}>
                        Your data is used to:
                    </p>
                    <ul style={{ lineHeight: 1.7, color: "#94a3b8", paddingLeft: 20 }}>
                        <li>Process and manage medical appointments.</li>
                        <li>Provide AI-powered responses to your clinical inquiries.</li>
                        <li>Enable clinic staff to take over conversations when necessary.</li>
                        <li>Send reminders and notifications regarding your health and schedule.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>3. Data Security & HIPAA</h2>
                    <p style={{ lineHeight: 1.7, color: "#94a3b8" }}>
                        We implement industry-standard security measures, including encryption and secure Supabase database configurations, to protect your health data. Our systems are designed with HIPAA compliance standards in mind to ensure the confidentiality of your medical information.
                    </p>
                </section>

                <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>4. Contact Us</h2>
                    <p style={{ lineHeight: 1.7, color: "#94a3b8" }}>
                        If you have any questions about this Privacy Policy, please contact us at privacy@klmaiclinic.com.
                    </p>
                </section>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32, marginTop: 40, textAlign: "center", fontSize: 13, color: "#475569" }}>
                    Last Updated: June 27, 2026
                </div>
            </div>
        </div>
    );
}
