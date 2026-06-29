"use client";

import { useState, useCallback } from "react";
import {
  Calendar, MessageSquare, Plus,
  Activity, Pill, TrendingUp,
  MessageCircle, ArrowRight
} from "lucide-react";
import { api } from "@/services/api";
import { useRealtime } from "@/hooks/useRealtime";
import { useMountFetch } from "@/hooks/useMountFetch";
import type { PatientDashboardData } from "@/types";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import TopNav from "@/components/layout/TopNav";
import MedicationSection from "@/components/patient/MedicationSection";
import { toast } from "sonner";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: "#1e3a5f", color: "#93c5fd" },
  confirmed: { bg: "#14532d", color: "#86efac" },
  completed: { bg: "#374151", color: "#d1d5db" },
  cancelled: { bg: "#7f1d1d", color: "#fca5a5" },
  rescheduled: { bg: "#78350f", color: "#fde68a" },
};

export default function PatientDashboardPage() {
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dashboard = await api.getPatientDashboard() as PatientDashboardData;
      setData(dashboard);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load patient dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useMountFetch(load, [load]);

  // Realtime updates
  useRealtime({ table: "appointments", onchange: load });
  useRealtime({ table: "medication_reminders", onchange: load });
  useRealtime({ table: "notifications", onchange: load });
  useRealtime({ table: "messages", onchange: load });

  const stats = data?.stats;
  const upcoming = data?.upcoming_appointments ?? [];
  const medReminders = data?.medication_reminders ?? [];
  const latestNotifs = data?.latest_notifications ?? [];

  const kpis = [
    {
      label: "Upcoming Visits",
      value: stats?.upcoming_visits ?? 0,
      icon: Calendar,
      accent: "#4ea8ff",
      trend: stats?.appointment_trend ?? "+0%",
      sub: "Next: " + (upcoming[0]?.doctor_name || "None")
    },
    {
      label: "Health Score",
      value: stats?.health_score ?? 0,
      icon: Activity,
      accent: "#10b981",
      trend: "Good",
      sub: "Based on activity"
    },
    {
      label: "Messages",
      value: stats?.total_messages ?? 0,
      icon: MessageCircle,
      accent: "#a78bfa",
      trend: `${stats?.ai_conversations ?? 0} AI`,
      sub: `${stats?.human_conversations ?? 0} Staff`
    },
    {
      label: "Medication",
      value: medReminders.length,
      icon: Pill,
      accent: "#fb923c",
      trend: "Active",
      sub: "Daily schedule"
    },
  ];

  const cancelAppt = async (id: string) => {
    try {
      await api.cancelPatientAppointment(id);
      toast.success("Appointment cancelled");
      load();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0a0a0a" }}>
      <TopNav
        title={data?.patient ? `Health Portal • ${data.patient.name.split(" ")[0]}` : "Patient Dashboard"}
        subtitle="Manage your health and clinic communications"
        onRefresh={load}
        loading={loading}
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/patient/messages">
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                <MessageSquare size={16} /> New Message
              </button>
            </Link>
            <Link href="/patient/appointments">
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#6366f1)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)" }}>
                <Plus size={16} /> Book Visit
              </button>
            </Link>
          </div>
        }
      />

      <div className="page-enter" style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
          {kpis.map((k, i) => (
            <div key={k.label} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${k.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${k.accent}30` }}>
                    <k.icon size={20} style={{ color: k.accent }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 20 }}>
                    <TrendingUp size={12} style={{ color: k.accent }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{k.trend}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{k.label}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                  <h3 style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{loading ? "..." : k.value}</h3>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{k.sub}</span>
                </div>
                {/* Subtle Glow */}
                <div style={{ position: "absolute", bottom: -20, right: -20, width: 60, height: 60, background: k.accent, filter: "blur(40px)", opacity: 0.1 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Visit Charts */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Visit History</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Your clinic visits over the last 6 months</p>
                </div>
              </div>
              <div style={{ height: 240, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.monthly_visits ?? []}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12, color: "#fff" }}
                      itemStyle={{ color: "#a78bfa" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorVisits)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Scheduled Visits</h3>
                <Link href="/patient/appointments" style={{ fontSize: 13, color: "#a78bfa", fontWeight: 500, textDecoration: "none" }}>View Schedule</Link>
              </div>
              <div style={{ padding: 12 }}>
                {upcoming.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <Calendar size={32} style={{ color: "rgba(255,255,255,0.1)", marginBottom: 12 }} />
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No upcoming visits scheduled.</p>
                  </div>
                ) : (
                  upcoming.map((a) => {
                    const status = STATUS_COLORS[a.status] || STATUS_COLORS.scheduled;
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderRadius: 16, background: "rgba(255,255,255,0.02)", marginBottom: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase" }}>
                            {new Date(a.date).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                            {new Date(a.date).getDate()}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{a.doctor_name}</p>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                            {new Date(a.slot_start || a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Clinical Consultation
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: status.bg, color: status.color, textTransform: "capitalize" }}>
                            {a.status}
                          </span>
                          <button
                            onClick={() => cancelAppt(a.id)}
                            style={{ padding: 8, borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "none", color: "#f87171", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Medication Reminders (Interactive Component) */}
            <MedicationSection medication_reminders={medReminders} onRefresh={load} />

            {/* Recent Care Updates */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Notifications</h3>
                <Link href="/patient/notifications" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>View All</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {latestNotifs.length === 0 ? (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>No recent updates.</p>
                ) : (
                  latestNotifs.slice(0, 4).map(n => (
                    <div key={n.id} style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.is_read ? "transparent" : "#a78bfa", marginTop: 5, flexShrink: 0, border: n.is_read ? "1px solid rgba(255,255,255,0.1)" : "none" }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 600, color: n.is_read ? "rgba(255,255,255,0.6)" : "#fff", lineHeight: 1.4 }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Assistant Banner */}
            <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: 24, padding: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Have a health query?</h4>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 16, lineHeight: 1.5 }}>Our AI assistant can help you with symptoms, clinic info and more, 24/7.</p>
                <Link href="/patient/messages">
                  <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "#fff", border: "none", color: "#1e1b4b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Start Chat <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
              <MessageCircle size={80} style={{ position: "absolute", bottom: -10, right: -10, color: "rgba(255,255,255,0.05)" }} />
            </div>

          </div>
        </div>
      </div>

      {/* Styles for animation */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-enter {
          animation: pageEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes pageEnter {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
