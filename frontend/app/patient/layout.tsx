"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useClinicStore } from "@/store/clinic-store";
import { getInitials } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, MessageSquare,
  UserCircle, Bell, LogOut, Activity,
} from "lucide-react";

const NAV = [
  { label: "Dashboard",    href: "/patient/dashboard",      icon: LayoutDashboard },
  { label: "Appointments", href: "/patient/appointments",   icon: Calendar        },
  { label: "Messages",     href: "/patient/messages",       icon: MessageSquare   },
  { label: "Notifications",href: "/patient/notifications",  icon: Bell            },
  { label: "Profile",      href: "/patient/profile",        icon: UserCircle      },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const sidebarOpen = useClinicStore((s) => s.sidebarOpen);
  const toggleSidebar = useClinicStore((s) => s.toggleSidebar);
  const W = sidebarOpen ? 168 : 56;

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "patient") router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || !user || user.role !== "patient") {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(78,168,255,0.2)", borderTopColor: "var(--blue)", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg)" }}>
      <aside className="sidebar-panel"
        style={{ width: W, minWidth: W, maxWidth: W, height: "100vh", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", background: "var(--sidebar-bg)", borderRight: "1px solid var(--bdr)", zIndex: 30 }}
      >
        <button onClick={toggleSidebar} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 60, borderBottom: "1px solid var(--bdr)", width: "100%", flexShrink: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#6366f1)", boxShadow: "0 0 12px rgba(124,58,237,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Activity size={16} color="#fff" strokeWidth={2.5} />
          </div>
          
            {sidebarOpen && (
              <div className="animate-fade-in" style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", lineHeight: 1.2 }}>KLM AI Clinic</div>
                <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600, whiteSpace: "nowrap", marginTop: 2 }}>Patient Portal</div>
              </div>
            )}
          
        </button>

        <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 12, marginBottom: 2, fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "all 0.15s", color: active ? "#fff" : "var(--t2)", background: active ? "rgba(124,58,237,0.13)" : "transparent", border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent" }}>
                <Icon size={17} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0, color: active ? "#a78bfa" : "var(--t3)" }} />
                
                  {sidebarOpen && (
                    <span className="animate-fade-in" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.label}
                    </span>
                  )}
                
              </Link>
            );
          })}
        </nav>

        <div style={{ flexShrink: 0, borderTop: "1px solid var(--bdr)", padding: "8px 6px" }}>
          <button onClick={() => { logout(); router.push("/login"); }} title="Logout" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 12, width: "100%", marginBottom: 4, fontSize: 13, fontWeight: 500, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "var(--t2)", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--t2)"; }}>
            <LogOut size={17} style={{ flexShrink: 0 }} />
            
              {sidebarOpen && <span className="animate-fade-in">Logout</span>}
            
          </button>

          
            {sidebarOpen && (
              <div className="animate-fade-in" style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid var(--bdr)", background: "var(--card-bg2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {getInitials(user.full_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</div>
                    <div style={{ fontSize: 10, color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                  </div>
                </div>
              </div>
            )}
          
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </main>
    </div>
  );
}
