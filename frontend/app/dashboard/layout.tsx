"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const Sidebar = dynamic(() => import("@/components/layout/Sidebar"), {
  ssr: false,
  loading: () => (
    <div style={{ width: 56, minWidth: 56, height: "100vh", background: "var(--sidebar-bg)", borderRight: "1px solid var(--bdr)" }} />
  ),
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

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
        {children}
      </main>
    </div>
  );
}
