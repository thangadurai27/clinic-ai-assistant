"use client";
import { useState, useCallback, useMemo } from "react";
import { Search, Phone, Mail, Calendar, MessageSquare, Users } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { api } from "@/services/api";
import { useRealtime } from "@/hooks/useRealtime";
import { useDebounce } from "@/hooks/useDebounce";
import { useMountFetch } from "@/hooks/useMountFetch";
import type { Patient } from "@/types";
import { formatDate, getInitials } from "@/lib/utils";
import Link from "next/link";

const AV = ["#14b8a6","#6366f1","#22c55e","#f59e0b","#8b5cf6","#3b82f6","#ef4444","#ec4899","#e11d48","#0891b2","#7c3aed","#b45309"];
const avBg = (s: string) => AV[(s.charCodeAt(0) || 0) % AV.length];

const CHANNEL_COLORS: Record<string, { bg: string; color: string }> = {
  whatsapp: { bg: "#14532d",      color: "#86efac" },
  email:    { bg: "#1e3a5f",      color: "#93c5fd" },
  web:      { bg: "#2e1065",      color: "#ddd6fe" },
};


export default function PatientsPage() {
  const [patients,    setPatients]    = useState<Patient[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [hero,        setHero]        = useState<Patient | null>(null);
  const [hoveredRow,  setHoveredRow]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getPatients() as Patient[];
      setPatients(d);
      setHero(prev => prev ?? d[0] ?? null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useMountFetch(load, [load]);

  // Auto-refresh when patients table changes
  useRealtime({ table: "patients", onchange: load });

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return patients;
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.includes(debouncedSearch)
    );
  }, [patients, debouncedSearch]);

  const heroColor = hero ? avBg(hero.name[0]) : "#6366f1";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav title="Patients" subtitle={`${patients.length} registered`} onRefresh={load} loading={loading} />

      <div className="page-enter" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 20px" }}>

        {/* ── Hero Card ─────────────────────────────── */}
        
          {hero && (
            <div key={hero.id}
            >
              <div style={{
                background: "var(--card-bg)",
                border: "1px solid var(--bdr)",
                borderRadius: 16,
                padding: "20px 24px",
                marginBottom: 16,
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Subtle glow */}
                <div style={{ position: "absolute", left: -60, top: -60, width: 200, height: 200, borderRadius: "50%", background: heroColor, opacity: 0.06, filter: "blur(60px)", pointerEvents: "none" }} />

                <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 20 }}>
                  {/* Portrait */}
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 16, background: heroColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff" }}>
                      {getInitials(hero.name)}
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                    {/* Col 1 */}
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>{hero.name}</h2>
                      {hero.email && (
                        <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8e9bb5", marginBottom: 4 }}>
                          <Mail size={13} color="#4a5578" /> {hero.email}
                        </p>
                      )}
                      <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8e9bb5" }}>
                        <Phone size={13} color="#4a5578" />
                        {hero.phone || "No phone on file"}
                      </p>
                    </div>

                    {/* Col 2: Registration info */}
                    <div style={{ fontSize: 12 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5578", marginBottom: 2 }}>Patient ID</p>
                      <p style={{ color: "#fff", fontWeight: 700, fontFamily: "monospace", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis" }}>{hero.id.slice(0, 12).toUpperCase()}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5578", marginBottom: 2 }}>Registered</p>
                      <p style={{ color: "#fff", marginBottom: 8 }}>{formatDate(hero.created_at)}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5578", marginBottom: 2 }}>Preferred Channel</p>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, ...(CHANNEL_COLORS[hero.preferred_channel] ?? CHANNEL_COLORS.web) }}>
                        {hero.preferred_channel}
                      </span>
                    </div>

                    {/* Col 3: Actions */}
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#4a5578", marginBottom: 8 }}>Quick Actions</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#166534", color: "#86efac" }}>Active Patient</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        {[
                          { label: "View Conversations", Icon: MessageSquare, href: `/dashboard/conversations?patient_id=${hero.id}` },
                          { label: "Appointments",       Icon: Calendar,      href: `/dashboard/appointments` },
                        ].map(b => {
                          const BIcon = b.Icon;
                          return (
                            <Link key={b.label} href={b.href} style={{ textDecoration: "none" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#8e9bb5", fontSize: 11, cursor: "pointer" }}>
                                <BIcon size={11} /> {b.label}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        

        {/* ── Patient Table ─────────────────────────── */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, overflow: "hidden" }}>

          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr 180px 120px 130px 110px 80px",
            padding: "10px 20px",
            borderBottom: "1px solid var(--bdr)",
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#4a5578",
          }}>
            <span>#</span>
            <span>Patient Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Channel</span>
            <span>Registered</span>
            <span>Actions</span>
          </div>

          {/* Search row */}
          <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--bdr)" }}>
            <div style={{ position: "relative", maxWidth: 420 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#4a5578", pointerEvents: "none" }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                style={{ width: "100%", height: 34, borderRadius: 10, border: "1px solid var(--bdr)", background: "var(--card-bg2)", color: "#fff", fontSize: 12, paddingLeft: 30, paddingRight: 12, outline: "none" }}
              />
            </div>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 12 }}>
              {Array(7).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 6 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 8 }}>
              <Users size={32} color="#4a5578" opacity={0.3} />
              <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>No patients found</p>
              <p style={{ fontSize: 11, color: "#4a5578" }}>
                {search ? "Try a different search term" : "Patients appear here once they contact the AI"}
              </p>
            </div>
          ) : (
            <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 440px)" }}>
              <div className="animate-fade-in">
                {filtered.map((p) => {
                  const init    = getInitials(p.name);
                  const color   = avBg(p.name[0]);
                  const cc      = CHANNEL_COLORS[p.preferred_channel] ?? CHANNEL_COLORS.web;
                  const isHero  = p.id === hero?.id;
                  const isHov   = hoveredRow === p.id;

                  return (
                    <div className="animate-fade-in" key={p.id}>
                      <div
                        onClick={() => setHero(p)}
                        onMouseEnter={() => setHoveredRow(p.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "44px 1fr 180px 120px 130px 110px 80px",
                          alignItems: "center",
                          padding: "12px 20px",
                          borderBottom: "1px solid var(--bdr)",
                          cursor: "pointer",
                          background: isHero ? "rgba(78,168,255,0.05)" : isHov ? "rgba(255,255,255,0.025)" : "transparent",
                          borderLeft: isHero ? "3px solid rgba(78,168,255,0.5)" : "3px solid transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        {/* Avatar */}
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                          {init}
                        </div>

                        {/* Name */}
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                          {p.name}
                        </p>

                        {/* Email */}
                        <p style={{ fontSize: 12, color: "#8e9bb5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.email || "—"}
                        </p>

                        {/* Phone */}
                        <p style={{ fontSize: 12, color: "#8e9bb5" }}>
                          {p.phone || "—"}
                        </p>

                        {/* Channel badge */}
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: cc.bg, color: cc.color, width: "fit-content" }}>
                          {p.preferred_channel}
                        </span>

                        {/* Registered */}
                        <p style={{ fontSize: 12, color: "#8e9bb5" }}>{formatDate(p.created_at)}</p>

                        {/* Action icons — visible on hover */}
                        <div style={{ display: "flex", gap: 4, opacity: isHov ? 1 : 0, transition: "opacity 0.15s" }}>
                          {[
                            { Icon: Phone,         title: "Call",    href: `tel:${p.phone}`,                            hoverColor: "#2dd4bf" },
                            { Icon: MessageSquare, title: "Message", href: `/dashboard/conversations?patient_id=${p.id}`, hoverColor: "#60a5fa" },
                            { Icon: Mail,          title: "Email",   href: `mailto:${p.email}`,                          hoverColor: "#c4b5fd" },
                          ].map(({ Icon, title, href, hoverColor }) => (
                            <Link key={title} href={href} title={title} onClick={ev => ev.stopPropagation()} style={{ textDecoration: "none" }}>
                              <div
                                style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4a5578", transition: "all 0.15s" }}
                                onMouseEnter={ev => { (ev.currentTarget as HTMLDivElement).style.color = hoverColor; (ev.currentTarget as HTMLDivElement).style.background = `${hoverColor}22`; }}
                                onMouseLeave={ev => { (ev.currentTarget as HTMLDivElement).style.color = "#4a5578"; (ev.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)"; }}
                              >
                                <Icon size={12} />
                              </div>
                            </Link>
                          ))}
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
  );
}
