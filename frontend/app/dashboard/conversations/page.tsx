"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  MessageSquare, Bot, UserCheck, CheckCircle2,
  Send, Loader2, RotateCcw, RefreshCw,
} from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { api } from "@/services/api";
import { useRealtime } from "@/hooks/useRealtime";
import { useMountFetch } from "@/hooks/useMountFetch";
import type { ChatResponse, Conversation, ConversationTimelineEvent, Message } from "@/types";
import { intentLabel, timeAgo, getInitials, formatTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AV = ["#14b8a6","#6366f1","#22c55e","#f59e0b","#8b5cf6","#3b82f6","#ef4444","#ec4899"];
const avBg = (s: string) => AV[(s.charCodeAt(0) || 0) % AV.length];

function intentStyle(intent?: string): { bg: string; color: string; label: string } {
  const r = intent?.toUpperCase() ?? "";
  if (r.includes("BOOK") || r.includes("APPOINT")) return { bg: "#166534", color: "#86efac", label: "Appointment" };
  if (r.includes("SYMPTOM") || r.includes("TRIAGE"))  return { bg: "#78350f", color: "#fde68a", label: "Symptom" };
  if (r.includes("HUMAN")  || r.includes("SUPPORT"))  return { bg: "#7f1d1d", color: "#fca5a5", label: "Human Support" };
  if (r.includes("FAQ")    || r.includes("GENERAL"))  return { bg: "#1e3a5f", color: "#93c5fd", label: "FAQ" };
  if (r.includes("REMIND"))                           return { bg: "#4c1d95", color: "#ddd6fe", label: "Reminder" };
  if (intent) return { bg: "#1e3a5f", color: "#93c5fd", label: intentLabel(intent) };
  return { bg: "#1c2030", color: "#8e9bb5", label: "General" };
}

const TABS = ["All", "Open", "Escalated", "Closed"] as const;

export default function ConversationsPage() {
  const { user } = useAuth();
  const [convs,    setConvs]    = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeline, setTimeline] = useState<ConversationTimelineEvent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [msgLoad,  setMsgLoad]  = useState(false);
  const [filter,   setFilter]   = useState("All");
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [actLoading, setActLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const f = filter.toLowerCase();
      const d = await api.getConversations(f === "all" ? undefined : f) as Conversation[];
      setConvs(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useMountFetch(load, [load]);
  useRealtime({ table: "conversations", onchange: load });
  useRealtime({ table: "messages",      onchange: () => selected && refreshMessages(selected.id) });
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const refreshMessages = async (convId: string) => {
    try {
      const d = await api.getConversation(convId) as Conversation & { messages: Message[] };
      setMessages(d.messages || []);
      // Refresh selected conv ownership
      setConvs(prev => prev.map(c => c.id === convId ? { ...c, ownership: d.ownership, taken_over_by: d.taken_over_by } : c));
      setSelected(prev => prev?.id === convId ? { ...prev, ownership: d.ownership, taken_over_by: d.taken_over_by } : prev);
    } catch {}
  };

  const selectConv = async (c: Conversation) => {
    setSelected(c); setMsgLoad(true);
    try {
      const d = await api.getConversation(c.id) as Conversation & { messages: Message[] };
      setMessages(d.messages || []);
      const tl = await api.getConversationTimeline(c.id) as ConversationTimelineEvent[];
      setTimeline(tl);
      setSelected({ ...c, ownership: d.ownership, taken_over_by: d.taken_over_by });
    } catch { setMessages([]); setTimeline([]); }
    finally { setMsgLoad(false); }
  };

  const takeOver = async () => {
    if (!selected || !user) return;
    setActLoading(true);
    try {
      await api.takeOver(selected.id, user.full_name, "Receptionist took over the conversation");
      toast.success("You've taken over this conversation");
      setSelected(prev => prev ? { ...prev, ownership: "HUMAN_ACTIVE", taken_over_by: user.full_name } : prev);
      setConvs(prev => prev.map(c => c.id === selected.id ? { ...c, ownership: "HUMAN_ACTIVE" } : c));
      const tl = await api.getConversationTimeline(selected.id) as ConversationTimelineEvent[];
      setTimeline(tl);
    } catch (e: unknown) { toast.error((e as Error).message || "Takeover failed"); }
    finally { setActLoading(false); }
  };

  const resumeAI = async () => {
    if (!selected) return;
    setActLoading(true);
    try {
      await api.resumeAI(selected.id, "Receptionist resumed AI control");
      toast.success("AI has resumed control");
      setSelected(prev => prev ? { ...prev, ownership: "AI_ACTIVE" } : prev);
      setConvs(prev => prev.map(c => c.id === selected.id ? { ...c, ownership: "AI_ACTIVE" } : c));
      const tl = await api.getConversationTimeline(selected.id) as ConversationTimelineEvent[];
      setTimeline(tl);
    } catch (e: unknown) { toast.error((e as Error).message || "Resume AI failed"); }
    finally { setActLoading(false); }
  };

  const resolveConversation = async () => {
    if (!selected) return;
    setActLoading(true);
    try {
      await api.updateEscalationStatus(selected.id, "resolved").catch(() => {});
      // Update conversation status via Supabase directly through the conversations endpoint
      await api.takeOver(selected.id, user?.full_name || "Staff", "Conversation resolved").catch(() => {});
      toast.success("Conversation marked as resolved");
      setConvs(prev => prev.map(c => c.id === selected.id ? { ...c, status: "closed" } : c));
    } catch { toast.error("Failed to resolve"); }
    finally { setActLoading(false); }
  };

  const sendStaffMessage = async () => {
    if (!input.trim() || !selected || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      if (selected.ownership === "HUMAN_ACTIVE") {
        await api.sendStaffMessage(selected.id, text, user?.full_name || "Staff");
        setMessages(prev => [...prev, {
          id: `s-${Date.now()}`, conversation_id: selected.id,
          sender: "staff", content: text, timestamp: new Date().toISOString(),
        }]);
      } else {
        // Simulate chat via AI
        setMessages(prev => [...prev, {
          id: `p-${Date.now()}`, conversation_id: selected.id,
          sender: "patient", content: text, timestamp: new Date().toISOString(),
        }]);
        const r = await api.chat({ message: text, channel: selected.channel, patient_id: selected.patient_id, conversation_id: selected.id }) as ChatResponse;
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`, conversation_id: selected.id,
          sender: "ai", content: r.message, timestamp: new Date().toISOString(),
        }]);
      }
    } catch { toast.error("Failed to send message"); }
    finally { setSending(false); }
  };

  const isHuman = selected?.ownership === "HUMAN_ACTIVE";
  const selInit = selected ? getInitials(selected.patients?.name || "P") : "P";
  const selColor = selected ? avBg(selInit[0]) : "#6366f1";
  const selStyle = selected ? intentStyle(selected.intent) : intentStyle(undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav title="Conversations" subtitle={`${convs.length} total`} onRefresh={load} loading={loading} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── COL 1: List ──────────────────────────── */}
        <div style={{ width: 260, minWidth: 260, display: "flex", flexDirection: "column", borderRight: "1px solid var(--bdr)", background: "var(--sidebar-bg)", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Conversations</p>
            <p style={{ fontSize: 11, color: "#4a5578", marginTop: 2 }}>{convs.length} active threads</p>
          </div>
          <div style={{ display: "flex", gap: 4, padding: "0 12px 10px" }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: filter === t ? "#14b8a6" : "transparent",
                color: filter === t ? "#fff" : "#4a5578",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 10 }}>{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 6 }} />)}</div>
            ) : convs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 100, gap: 8 }}>
                <MessageSquare size={24} color="#4a5578" />
                <p style={{ fontSize: 11, color: "#4a5578" }}>No conversations</p>
              </div>
            ) : convs.map(c => {
              const init  = getInitials(c.patients?.name || "P");
              const color = avBg(init[0]);
              const isSel = selected?.id === c.id;
              const ist   = intentStyle(c.intent);
              const isHum = c.ownership === "HUMAN_ACTIVE";
              return (
                <button key={c.id} onClick={() => selectConv(c)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 14px", border: "none", cursor: "pointer",
                  background: isSel ? "rgba(20,184,166,0.10)" : "transparent",
                  borderLeft: isSel ? "3px solid #14b8a6" : "3px solid transparent",
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{init}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>
                          {c.patients?.name || "Unknown"}
                        </span>
                        <span style={{ fontSize: 10, color: "#4a5578", flexShrink: 0 }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: ist.bg, color: ist.color }}>{ist.label}</span>
                        {isHum && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "rgba(251,146,60,0.2)", color: "#fb923c" }}>HUMAN</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── COL 2: Chat ──────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--bdr)", overflow: "hidden" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(78,168,255,0.1)", border: "1px solid rgba(78,168,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={32} color="#4ea8ff" opacity={0.7} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>Select a Conversation</p>
                <p style={{ fontSize: 12, color: "#4a5578", maxWidth: 260 }}>Choose a patient from the list to view the chat transcript and manage the interaction.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--bdr)", flexShrink: 0, background: "var(--sidebar-bg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: selColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{selInit}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{selected.patients?.name || "Patient"}</p>
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: selStyle.bg, color: selStyle.color }}>{selStyle.label}</span>
                      {isHuman && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "rgba(251,146,60,0.2)", color: "#fb923c" }}>HUMAN ACTIVE</span>}
                    </div>
                    <p style={{ fontSize: 10, color: "#4a5578" }}>
                      {selected.channel?.toUpperCase()} · {selected.patients?.phone || selected.patients?.email || "—"}
                    </p>
                  </div>
                </div>
                <button onClick={() => refreshMessages(selected.id)} title="Refresh" style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#8e9bb5" }}>
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
                {msgLoad ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 56 }} />)
                ) : messages.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8 }}>
                    <Bot size={28} color="#4a5578" opacity={0.4} />
                    <p style={{ fontSize: 12, color: "#4a5578" }}>No messages yet</p>
                  </div>
                ) : messages.map(m => {
                  const isPat = m.sender === "patient";
                  const isStaff = m.sender === "staff";
                  return (
                    <div key={m.id}>
                      {isPat ? (
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <div style={{ maxWidth: "72%" }}>
                            <div style={{ borderRadius: "16px 16px 4px 16px", padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, lineHeight: 1.55 }}>{m.content}</div>
                            <p style={{ fontSize: 10, color: "#4a5578", textAlign: "right", marginTop: 4 }}>{formatTime(m.timestamp)}</p>
                          </div>
                        </div>
                      ) : isStaff ? (
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <div style={{ maxWidth: "72%" }}>
                            <div style={{ borderRadius: "16px 16px 4px 16px", padding: "12px 16px", background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.25)", color: "#fff", fontSize: 14, lineHeight: 1.55 }}>{m.content}</div>
                            <p style={{ fontSize: 10, color: "#4a5578", textAlign: "right", marginTop: 4 }}>Staff · {formatTime(m.timestamp)}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#14b8a6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={11} color="#fff" /></div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#14b8a6" }}>AI ASSISTANT</span>
                          </div>
                          <div style={{ maxWidth: "78%", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)", color: "#fff", fontSize: 14, lineHeight: 1.6 }}>{m.content}</div>
                          <p style={{ fontSize: 10, color: "#4a5578", marginTop: 4 }}>{formatTime(m.timestamp)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {sending && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#14b8a6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={11} color="#fff" /></div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#14b8a6" }}>AI ASSISTANT</span>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: "4px 16px 16px 16px", padding: "12px 16px", background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)" }}>
                      <Loader2 size={13} color="#a5b4fc" style={{ animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: 12, color: "#a5b4fc" }}>Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div style={{ padding: "12px 18px", borderTop: "1px solid var(--bdr)", background: "var(--sidebar-bg)", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendStaffMessage()}
                  placeholder={isHuman ? "Type as staff..." : "Send a test message..."} disabled={sending}
                  style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "var(--card-bg2)", color: "#fff", fontSize: 13, padding: "0 16px", outline: "none" }}
                />
                <button onClick={sendStaffMessage} disabled={!input.trim() || sending}
                  style={{ width: 44, height: 44, borderRadius: 12, background: isHuman ? "#14b8a6" : "#6366f1", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: (!input.trim() || sending) ? 0.5 : 1 }}>
                  <Send size={16} color="#fff" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── COL 3: Right Panel ───────────────────── */}
        <div style={{ width: 240, minWidth: 240, display: "flex", flexDirection: "column", background: "var(--sidebar-bg)", overflow: "hidden" }}>
          {selected ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Ownership badge */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5578", marginBottom: 8 }}>OWNERSHIP</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: isHuman ? "#fb923c" : "#22c55e" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{isHuman ? "Human Active" : "AI Active"}</span>
                </div>
                {isHuman && selected.taken_over_by && (
                  <p style={{ fontSize: 11, color: "#4a5578", marginTop: 4 }}>By: {selected.taken_over_by}</p>
                )}
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 16 }} />

              {/* Action Buttons */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5578", marginBottom: 10 }}>ACTIONS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {!isHuman ? (
                  <button
                    onClick={takeOver}
                    disabled={actLoading}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 16px", borderRadius: 10, border: "none", background: "rgba(153,27,27,0.5)", color: "#fca5a5", fontSize: 12, fontWeight: 600, cursor: actLoading ? "not-allowed" : "pointer", opacity: actLoading ? 0.5 : 1 }}
                  >
                    {actLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <UserCheck size={13} />}
                    Take Over
                  </button>
                ) : (
                  <button
                    onClick={resumeAI}
                    disabled={actLoading}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 16px", borderRadius: 10, border: "none", background: "rgba(20,83,45,0.6)", color: "#86efac", fontSize: 12, fontWeight: 600, cursor: actLoading ? "not-allowed" : "pointer", opacity: actLoading ? 0.5 : 1 }}
                  >
                    {actLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RotateCcw size={13} />}
                    Resume AI
                  </button>
                )}

                <button
                  onClick={resolveConversation}
                  disabled={actLoading}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 16px", borderRadius: 10, border: "none", background: "rgba(20,83,45,0.5)", color: "#86efac", fontSize: 12, fontWeight: 600, cursor: actLoading ? "not-allowed" : "pointer", opacity: actLoading ? 0.5 : 1 }}
                >
                  <CheckCircle2 size={13} /> Mark Resolved
                </button>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 16 }} />

              {/* AI Info */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5578", marginBottom: 10 }}>AI ANALYSIS</p>
              {[
                { k: "Intent",    v: intentStyle(selected.intent).label },
                { k: "Channel",   v: selected.channel?.toUpperCase() },
                { k: "Status",    v: selected.status },
                { k: "Started",   v: timeAgo(selected.created_at) },
              ].map(row => (
                <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: "#4a5578" }}>{row.k}</span>
                  <span style={{ color: "#fff", fontWeight: 500, textAlign: "right", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" }}>{row.v || "—"}</span>
                </div>
              ))}

              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "8px 0 14px" }} />

              {/* Patient Profile */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5578", marginBottom: 10 }}>PATIENT</p>
              {[
                { k: "Name",    v: selected.patients?.name },
                { k: "Phone",   v: selected.patients?.phone },
                { k: "Email",   v: selected.patients?.email },
              ].map(row => (
                <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: "#4a5578" }}>{row.k}</span>
                  <span style={{ color: "#fff", fontWeight: 500, textAlign: "right", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.v || "—"}</span>
                </div>
              ))}

              {/* Timeline */}
              {timeline.length > 0 && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "8px 0 14px" }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5578", marginBottom: 10 }}>TIMELINE</p>
                  {timeline.slice(0, 5).map((t) => (
                    <div key={t.id} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: "2px solid rgba(255,255,255,0.08)" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>{t.event_type?.replace(/_/g, " ")}</p>
                      {t.actor && <p style={{ fontSize: 10, color: "#4a5578" }}>{t.actor}</p>}
                      <p style={{ fontSize: 10, color: "#4a5578" }}>{timeAgo(t.created_at)}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 8 }}>
              <p style={{ fontSize: 11, color: "#4a5578" }}>Select a conversation to see AI analysis and controls</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
