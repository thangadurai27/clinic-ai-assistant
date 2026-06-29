"use client";
import { useState, useCallback } from "react";
import { Calendar, Clock, Stethoscope, ChevronDown } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { api } from "@/services/api";
import { useMountFetch } from "@/hooks/useMountFetch";
import type { Appointment } from "@/types";
import { formatDateTime, getInitials } from "@/lib/utils";

/* ── Avatar colours ──────────────────────────────────── */
const AV = ["#14b8a6", "#6366f1", "#22c55e", "#f59e0b", "#8b5cf6", "#3b82f6", "#ef4444", "#ec4899", "#e11d48", "#0891b2"];
const avBg = (s: string) => AV[(s.charCodeAt(0) || 0) % AV.length];

/* ── Doctor mini-dot colour ──────────────────────────── */
const DOC_DOT: Record<string, string> = {
  "Dr. Michael Chen": "#8b5cf6",
  "Dr. Priya Patel": "#14b8a6",
  "Dr. Robert Williams": "#f59e0b",
  "Dr. Sarah Johnson": "#3b82f6",
};
const docDot = (n: string) => DOC_DOT[n] ?? "#6366f1";

/* ── Status badge ────────────────────────────────────── */
function statusStyle(s?: string): { bg: string; color: string; label: string } {
  if (s === "confirmed") return { bg: "#166534", color: "#86efac", label: "Confirmed" };
  if (s === "scheduled") return { bg: "#1e3a5f", color: "#93c5fd", label: "Scheduled" };
  if (s === "completed") return { bg: "#1c1c2e", color: "#94a3b8", label: "Completed" };
  if (s === "cancelled") return { bg: "#7f1d1d", color: "#fca5a5", label: "Cancelled" };
  return { bg: "#1c1c2e", color: "#94a3b8", label: s ?? "—" };
}

const STATUS_OPTS = ["By Status", "confirmed", "scheduled", "completed", "cancelled"];


export default function AppointmentsPage() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFS] = useState("By Status");
  const [sortBy, setSortBy] = useState("By Date");
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await api.getAppointments() as Appointment[]; setAppts(d); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useMountFetch(load, [load]);

  const now = new Date();
  const todayISO = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const today = appts.filter(a => a.date?.startsWith(todayISO));
  const upcoming = appts.filter(a => {
    const apptDate = a.date ? new Date(a.date) : null;
    return apptDate && apptDate > now && !apptDate.toISOString().startsWith(todayISO);
  });

  const displayed = appts
    .filter(a => fStatus === "By Status" || a.status === fStatus)
    .sort((a, b) => sortBy === "By Date"
      ? new Date(a.date).getTime() - new Date(b.date).getTime()
      : (a.status ?? "").localeCompare(b.status ?? "")
    );

  /* KPI cards — matching the reference: icon left in colored square, value big, subtitle small */
  const kpis = [
    {
      label: "Appointments Today",
      value: loading ? "—" : today.length,
      icon: Clock,
      iconBg: "rgba(59,130,246,0.2)",
      iconColor: "#60a5fa",
      iconBorder: "rgba(59,130,246,0.3)",
      border: "rgba(59,130,246,0.25)",
      glow: "rgba(59,130,246,0.12)",
      sub: "+0 from yesterday  📊",
    },
    {
      label: "Upcoming",
      value: loading ? "—" : upcoming.length,
      icon: Calendar,
      iconBg: "rgba(139,92,246,0.2)",
      iconColor: "#a78bfa",
      iconBorder: "rgba(139,92,246,0.3)",
      border: "rgba(139,92,246,0.25)",
      glow: "rgba(139,92,246,0.12)",
      sub: "Scheduled for this month",
    },
    {
      label: "Total Scheduled",
      value: loading ? "—" : appts.length,
      icon: Stethoscope,
      iconBg: "rgba(20,184,166,0.2)",
      iconColor: "#2dd4bf",
      iconBorder: "rgba(20,184,166,0.3)",
      border: "rgba(20,184,166,0.25)",
      glow: "rgba(20,184,166,0.12)",
      sub: `+${appts.length} total`,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav title="Appointments" subtitle={`${appts.length} total scheduled`} onRefresh={load} loading={loading} />

      <div className="page-enter" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 20px" }}>

        {/* ── KPI Cards row ──────────────────────── */}
        <div className="animate-fade-in"
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}
        >
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <div className="animate-fade-in" key={k.label}>
                <div style={{
                  background: "var(--card-bg)",
                  border: `1px solid ${k.border}`,
                  borderRadius: 16,
                  padding: "18px 20px",
                  boxShadow: `0 0 28px -6px ${k.glow}`,
                  display: "flex", alignItems: "center", gap: 16,
                }}>
                  {/* Icon box */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                    background: k.iconBg, border: `1px solid ${k.iconBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={26} color={k.iconColor} strokeWidth={1.5} />
                  </div>
                  {/* Text */}
                  <div>
                    <p style={{ fontSize: 13, color: "#8e9bb5", fontWeight: 500, marginBottom: 4 }}>{k.label}</p>
                    <p style={{ fontSize: 40, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{k.value}</p>
                    <p style={{ fontSize: 11, color: "#4a5578", marginTop: 4 }}>{k.sub}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Appointments List ──────────────────── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, overflow: "hidden" }}>
          {/* List header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: "1px solid var(--bdr)" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Appointments List</p>

            <div style={{ display: "flex", gap: 8 }}>
              {/* Show dropdown */}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowSort(p => !p); setShowFilter(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--bdr2)", background: "transparent", color: "#8e9bb5", fontSize: 12, cursor: "pointer" }}>
                  Show: {sortBy} <ChevronDown size={12} />
                </button>
                {showSort && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50, width: 120, borderRadius: 10, border: "1px solid var(--bdr)", background: "var(--card-bg2)", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                    {["By Date", "By Status"].map(o => (
                      <button key={o} onClick={() => { setSortBy(o); setShowSort(false); }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, background: "transparent", border: "none", cursor: "pointer", color: sortBy === o ? "#4ea8ff" : "#fff" }}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter dropdown */}
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowFilter(p => !p); setShowSort(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--bdr2)", background: "transparent", color: "#8e9bb5", fontSize: 12, cursor: "pointer" }}>
                  Filter: {fStatus} <ChevronDown size={12} />
                </button>
                {showFilter && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50, width: 140, borderRadius: 10, border: "1px solid var(--bdr)", background: "var(--card-bg2)", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                    {STATUS_OPTS.map(o => (
                      <button key={o} onClick={() => { setFS(o); setShowFilter(false); }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, background: "transparent", border: "none", cursor: "pointer", color: fStatus === o ? "#4ea8ff" : "#fff", textTransform: "capitalize" }}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Appointment items */}
          <div style={{ padding: "12px 20px", overflowY: "auto", maxHeight: "calc(100vh - 340px)" }}>
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 72 }} />
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#4a5578" }}>
                <Calendar size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>No appointments found</p>
              </div>
            ) : (
              /* Timeline with left line + 2-col grid */
              <div style={{ position: "relative", paddingLeft: 20 }}>
                {/* Vertical timeline line */}
                <div style={{ position: "absolute", left: 6, top: 4, bottom: 4, width: 1, background: "rgba(255,255,255,0.08)" }} />

                <div className="animate-fade-in"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
                >
                  {displayed.map((appt, idx) => {
                    const init = getInitials(appt.patients?.name || "P");
                    const pColor = avBg(init[0]);
                    const dColor = docDot(appt.doctor_name ?? "");
                    const st = statusStyle(appt.status);

                    return (
                      <div className="animate-fade-in" key={appt.id} style={{ position: "relative" }}>
                        {/* Timeline dot — only on left column items */}
                        {idx % 2 === 0 && (
                          <div style={{
                            position: "absolute", left: -17, top: 20,
                            width: 10, height: 10, borderRadius: "50%",
                            background: "linear-gradient(135deg,#4ea8ff,#8b5cf6)",
                            border: "2px solid var(--bg)",
                            boxShadow: "0 0 6px rgba(78,168,255,0.5)",
                            zIndex: 1,
                          }} />
                        )}

                        <div style={{
                          background: "var(--card-bg2)",
                          border: "1px solid var(--bdr)",
                          borderRadius: 14,
                          padding: "14px 16px",
                          transition: "border-color 0.15s",
                        }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--bdr2)")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--bdr)")}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            {/* Left: avatar + name + doctor */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <div style={{
                                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                                background: pColor, display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
                              }}>{init}</div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {appt.patients?.name || "Unknown"}
                                </p>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dColor, flexShrink: 0 }} />
                                  <p style={{ fontSize: 11, color: "#4a5578", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {appt.doctor_name || "Unknown Provider"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Right: date + status */}
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                                {formatDateTime(appt.date)}
                              </p>
                              <span style={{
                                display: "inline-block", padding: "2px 10px", borderRadius: 6,
                                fontSize: 11, fontWeight: 600,
                                background: st.bg, color: st.color,
                              }}>
                                {st.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
