"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";

const Sidebar = dynamic(() => import("@/components/layout/Sidebar"), {
  ssr: false,
  loading: () => (
    <div style={{ width: 56, minWidth: 56, height: "100vh", background: "var(--sidebar-bg)", borderRight: "1px solid var(--bdr)" }} />
  ),
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo } = useAuth();
  const router = useRouter();
  useWebSocket();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    // Patients must use /patient/dashboard
    if (user.role === "patient") { router.replace("/patient/dashboard"); }
  }, [user, loading, router]);

  if (loading || !user || user.role === "patient") {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(78,168,255,0.2)", borderTopColor: "var(--blue)", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {isDemo && (
          <div
            role="status"
            style={{
              flexShrink: 0,
              padding: "7px 16px",
              background: "rgba(99,102,241,0.14)",
              borderBottom: "1px solid rgba(129,140,248,0.3)",
              color: "#c7d2fe",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.02em",
              textAlign: "center",
            }}
          >
            Public demo — read-only. Showing fictional sample data; changes are disabled.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
