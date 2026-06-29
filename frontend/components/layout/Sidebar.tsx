"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Calendar,
  AlertTriangle, Users, Bell, LogOut, Activity, Settings, UserCircle,
} from "lucide-react";
import { useClinicStore } from "@/store/clinic-store";
import { useAuth } from "@/contexts/AuthContext";
import { getInitials } from "@/lib/utils";

const RECEPTIONIST_NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/dashboard/analytics", icon: Activity },
  { label: "Conversations", href: "/dashboard/conversations", icon: MessageSquare },
  { label: "Appointments", href: "/dashboard/appointments", icon: Calendar },
  { label: "Escalations", href: "/dashboard/escalations", icon: AlertTriangle },
  { label: "Patients", href: "/dashboard/patients", icon: Users },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useClinicStore((s) => s.sidebarOpen);
  const toggleSidebar = useClinicStore((s) => s.toggleSidebar);
  const { user, logout } = useAuth();
  const router = useRouter();
  const W = sidebarOpen ? 168 : 56;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside
      className="sidebar-panel"
      style={{
        width: W, minWidth: W, maxWidth: W,
        height: "100vh", display: "flex", flexDirection: "column",
        flexShrink: 0, overflow: "hidden",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--bdr)",
        zIndex: 30,
      }}
    >
      <button
        onClick={toggleSidebar}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 14px", height: 60,
          borderBottom: "1px solid var(--bdr)",
          width: "100%", flexShrink: 0,
          background: "transparent", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg,#22d3ee,#3b82f6)",
          boxShadow: "0 0 12px rgba(34,211,238,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Activity size={16} color="#fff" strokeWidth={2.5} />
        </div>

        {sidebarOpen && (
          <div className="sidebar-reveal" style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", lineHeight: 1.2 }}>
              KLM AI Clinic
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <div style={{ position: "relative", width: 7, height: 7 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e", opacity: 0.6, animation: "ping 1s cubic-bezier(0,0,.2,1) infinite" }} />
                <div style={{ position: "relative", width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
              </div>
              <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, whiteSpace: "nowrap" }}>AI Online</span>
            </div>
          </div>
        )}
      </button>

      <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto", overflowX: "hidden" }}>
        {RECEPTIONIST_NAV.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 12, marginBottom: 2,
                fontSize: 13, fontWeight: 500, textDecoration: "none",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
                color: active ? "#fff" : "var(--t2)",
                background: active ? "rgba(78,168,255,0.13)" : "transparent",
                border: active ? "1px solid rgba(78,168,255,0.22)" : "1px solid transparent",
              }}
            >
              <Icon
                size={17}
                strokeWidth={active ? 2.5 : 2}
                style={{ flexShrink: 0, color: active ? "var(--blue)" : "var(--t3)" }}
              />
              {sidebarOpen && (
                <span
                  className="sidebar-reveal"
                  style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {item.label}
                </span>
              )}
              {active && sidebarOpen && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)", marginLeft: "auto", flexShrink: 0 }} />
              )}
            </Link>
          );
        })}
      </nav>

      <div style={{ flexShrink: 0, borderTop: "1px solid var(--bdr)", padding: "8px 6px" }}>
        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 12, width: "100%",
            marginBottom: 4, fontSize: 13, fontWeight: 500,
            background: "transparent", border: "1px solid transparent",
            cursor: "pointer", color: "var(--t2)", transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
            (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--t2)";
          }}
        >
          <LogOut size={17} style={{ flexShrink: 0 }} />
          {sidebarOpen && <span className="sidebar-reveal">Logout</span>}
        </button>

        {sidebarOpen && user && (
          <div
            className="sidebar-reveal"
            style={{
              padding: "10px 12px", borderRadius: 12,
              border: "1px solid var(--bdr)", background: "var(--card-bg2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "#16a34a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {getInitials(user.full_name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
