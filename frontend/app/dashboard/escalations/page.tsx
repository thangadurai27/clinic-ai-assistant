"use client";
import { useState, useCallback } from "react";
import { UserCheck, CheckCircle2, FileText, Clock } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { api } from "@/services/api";
import { useMountFetch } from "@/hooks/useMountFetch";
import type { Escalation } from "@/types";
import { timeAgo, getInitials } from "@/lib/utils";

/* ── Avatar colours ──────────────────────────────── */
const AV = ["#14b8a6","#6366f1","#22c55e","#f59e0b","#8b5cf6","#3b82f6","#ef4444","#ec4899"];
const avBg = (s: string) => AV[(s.charCodeAt(0) || 0) % AV.length];

/* ── Priority badge style ────────────────────────── */
function priBadge(p: string) {
  if (p === "critical") return { bg: "#7f1d1d", color: "#fca5a5", label: "Critical" };
  if (p === "high")     return { bg: "#78350f", color: "#fde68a", label: "High" };
  if (p === "medium")   return { bg: "#1e3a5f", color: "#93c5fd", label: "Medium" };
  return { bg: "#1c2030", color: "#94a3b8", label: "Low" };
}

/* ── Status badge style ──────────────────────────── */
function stBadge(s: string) {
  if (s === "open")        return { bg: "#7f1d1d", color: "#fca5a5", label: "Open" };
  if (s === "in_progress") return { bg: "#78350f", color: "#fde68a", label: "In Progress" };
  if (s === "resolved")    return { bg: "#166534", color: "#86efac", label: "Resolved" };
  return { bg: "#1c2030", color: "#94a3b8", label: s };
}


export default function EscalationsPage() {
  const [escs,    setEscs]  = useState<Escalation[]>([]);
  const [loading, setLoad]  = useState(true);
  const [updating,setUpd]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoad(true);
    try { const d = await api.getEscalations() as Escalation[]; setEscs(d); }
    catch (e) { console.error(e); } finally { setLoad(false); }
  }, []);

  useMountFetch(load, [load]);

  const act = async (id: string, status: "in_progress" | "resolved") => {
    setUpd(id);
    try {
      await api.updateEscalationStatus(id, status);
      setEscs(p => p.map(e => e.id === id ? { ...e, status } : e));
    } catch (e) { console.error(e); } finally { setUpd(null); }
  };

  const openList = escs.filter(e => e.status === "open");
  const inPro    = escs.filter(e => e.status === "in_progress");
  const done     = escs.filter(e => e.status === "resolved");

  /* KPI summary cards */
  const summary = [
    { label: "Open",        count: openList.length, dot: "#ef4444", textColor: "#ef4444", border: "rgba(239,68,68,0.2)"  },
    { label: "In Progress", count: inPro.length,    dot: "#f59e0b", textColor: "#f59e0b", border: "rgba(245,158,11,0.2)" },
    { label: "Resolved",    count: done.length,     dot: "#22c55e", textColor: "#22c55e", border: "rgba(34,197,94,0.2)"  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav
        title="Escalations"
        subtitle={`${openList.length} open · ${inPro.length} in progress`}
        onRefresh={load}
        loading={loading}
      />

      <div className="page-enter" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 20px" }}>

        {/* ── Summary KPI row ────────────────────── */}
        <div className="animate-fade-in"
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}
        >
          {summary.map(s => (
            <div className="animate-fade-in" key={s.label}>
              <div style={{
                background: "var(--card-bg)",
                border: `1px solid ${s.border}`,
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                {/* Dot */}
                <div style={{ position: "relative", width: 12, height: 12, flexShrink: 0 }}>
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: s.dot, opacity: 0.5,
                    animation: "ping 1.5s cubic-bezier(0,0,.2,1) infinite",
                  }} />
                  <div style={{ position: "relative", width: 12, height: 12, borderRadius: "50%", background: s.dot }} />
                </div>
                {/* Count + label */}
                <div>
                  <p style={{ fontSize: 38, fontWeight: 700, color: s.textColor, lineHeight: 1 }}>
                    {loading ? "—" : s.count}
                  </p>
                  <p style={{ fontSize: 12, color: s.textColor, fontWeight: 500, marginTop: 2 }}>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Escalation Cards Grid ──────────────── */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 140 }} />
            ))}
          </div>
        ) : escs.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
            <CheckCircle2 size={36} color="#22c55e" />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>All Clear</p>
            <p style={{ fontSize: 12, color: "#4a5578" }}>No escalations require attention right now.</p>
          </div>
        ) : (
          <div className="animate-fade-in"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {escs.map(e => {
              const name  = e.patients?.name || "Unknown";
              const init  = getInitials(name);
              const color = avBg(init[0]);
              const pri   = priBadge(e.priority);
              const st    = stBadge(e.status);
              const isUpd = updating === e.id;

              return (
                <div className="animate-fade-in" key={e.id}>
                  <div style={{
                    background: "var(--card-bg)",
                    border: `1px solid ${e.status === "open" ? "rgba(239,68,68,0.2)" : e.status === "in_progress" ? "rgba(245,158,11,0.18)" : "var(--bdr)"}`,
                    borderRadius: 16,
                    padding: "16px 18px",
                    transition: "border-color 0.15s",
                  }}>

                    {/* Row 1: avatar + name + time + priority/status */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          background: color, display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
                        }}>{init}</div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                            {e.reason || "Emergency Detected"}
                          </p>
                          <p style={{ fontSize: 11, color: "#4a5578", marginTop: 2 }}>
                            {e.summary ? e.summary.slice(0, 40) + "…" : "Summary of detected issue"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: patient name + date */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <p style={{ fontSize: 12, color: "#8e9bb5", fontWeight: 500 }}>{name}</p>
                      <p style={{ fontSize: 11, color: "#4a5578", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> {timeAgo(e.created_at)}
                      </p>
                    </div>

                    {/* Row 3: badges + action button */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      {/* Badges */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: pri.bg, color: pri.color }}>
                          {pri.label}
                        </span>
                        <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>

                      {/* Action button */}
                      <div>
                        {e.status === "open" && (
                          <button
                            disabled={isUpd}
                            onClick={() => act(e.id, "in_progress")}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "6px 14px", borderRadius: 8, border: "none",
                              background: "rgba(139,92,246,0.2)", color: "#c4b5fd",
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                              opacity: isUpd ? 0.5 : 1, transition: "opacity 0.15s",
                            }}
                          >
                            <UserCheck size={13} /> Take Over
                          </button>
                        )}
                        {e.status === "in_progress" && (
                          <button
                            disabled={isUpd}
                            onClick={() => act(e.id, "resolved")}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "6px 14px", borderRadius: 8, border: "none",
                              background: "rgba(34,197,94,0.15)", color: "#86efac",
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                              opacity: isUpd ? 0.5 : 1, transition: "opacity 0.15s",
                            }}
                          >
                            <CheckCircle2 size={13} /> Resolve
                          </button>
                        )}
                        {e.status === "resolved" && (
                          <button style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 14px", borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "transparent", color: "#8e9bb5",
                            fontSize: 12, fontWeight: 600, cursor: "default",
                          }}>
                            <FileText size={13} /> Summary
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
