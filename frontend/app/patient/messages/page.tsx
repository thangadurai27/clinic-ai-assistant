"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { MessageSquare, Send, Bot, Loader2 } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { api } from "@/services/api";
import { useRealtime } from "@/hooks/useRealtime";
import { useMountFetch } from "@/hooks/useMountFetch";
import type { Conversation, Message } from "@/types";
import { timeAgo, formatTime } from "@/lib/utils";
import { toast } from "sonner";

export default function PatientMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected,      setSelected]      = useState<Conversation | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(true);
  const [msgLoad,       setMsgLoad]       = useState(false);
  const [sending,       setSending]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getPatientConversations() as { conversations: Conversation[] };
      setConversations(result.conversations || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load conversations");
    }
    finally { setLoading(false); }
  }, []);

  useMountFetch(load, [load]);
  useRealtime({ table: "conversations", onchange: load });
  useRealtime({ table: "messages", onchange: () => { if (selected) selectConversation(selected); } });
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const selectConversation = async (c: Conversation) => {
    setSelected(c);
    setMsgLoad(true);
    try {
      const detail = await api.getPatientConversation(c.id) as Conversation & { messages: Message[] };
      setMessages(detail.messages || []);
      setSelected(detail);
    } catch {
      setMessages([]);
      toast.error("Failed to load message history");
    }
    finally { setMsgLoad(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic patient message
    const tempId = `t-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      conversation_id: selected?.id || "",
      sender: "patient",
      content: text,
      timestamp: new Date().toISOString(),
    }]);

    try {
      const resp = await api.sendPatientMessage({
        message:    text,
        channel:    "web",
        conversation_id: selected?.id,
      }) as Conversation & { messages?: Message[] };

      if (resp?.id) {
        setSelected(resp);
        setMessages(resp.messages || []);
      }
      load();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(text);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav title="Messages" subtitle="Chat with our AI assistant" onRefresh={load} loading={loading} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Conversation list */}
        <div style={{
          width: 240, minWidth: 240, flexShrink: 0,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--bdr)",
          background: "var(--sidebar-bg)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px 10px" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Conversations</p>
            <p style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>{conversations.length} threads</p>
          </div>

          {/* New Chat button */}
          <div style={{ padding: "0 12px 10px" }}>
            <button
              onClick={() => { setSelected(null); setMessages([]); }}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 10,
                border: "1px solid rgba(124,58,237,0.3)",
                background: "rgba(124,58,237,0.1)", color: "#a78bfa",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <MessageSquare size={13} /> New Conversation
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 10 }}>
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 60, marginBottom: 6 }} />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 16px", textAlign: "center", gap: 8 }}>
                <MessageSquare size={22} style={{ color: "var(--t3)", opacity: 0.4 }} />
                <p style={{ fontSize: 12, color: "var(--t2)" }}>No conversations yet</p>
                <p style={{ fontSize: 11, color: "var(--t3)" }}>Start a new conversation to chat with us</p>
              </div>
            ) : (
              conversations.map(c => {
                const isSel = selected?.id === c.id;
                return (
                  <button key={c.id} onClick={() => selectConversation(c)} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 14px", border: "none", cursor: "pointer",
                    background: isSel ? "rgba(124,58,237,0.12)" : "transparent",
                    borderLeft: isSel ? "3px solid #a78bfa" : "3px solid transparent",
                    transition: "all 0.15s",
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 2 }}>
                      {c.intent?.replace(/_/g, " ") || "General Inquiry"}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--t3)" }}>
                      {c.channel} · {timeAgo(c.updated_at || c.created_at)}
                    </p>
                    {typeof c.ai_confidence === "number" && (
                      <p style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
                        Confidence {Math.round(c.ai_confidence * 100)}%
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: c.status === "escalated" ? "#f87171" : "var(--t3)", marginTop: 2 }}>
                      {c.status}{c.ownership ? ` · ${c.ownership.replace("_", " ")}` : ""}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Chat header */}
          <div style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--bdr)",
            background: "var(--sidebar-bg)",
            flexShrink: 0,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg,#7c3aed,#6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>KLM AI Assistant</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <p style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Online · Powered by Groq AI</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "20px 18px",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            {/* Welcome message */}
            {messages.length === 0 && !msgLoad && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, textAlign: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Bot size={28} style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                    Hi, I&apos;m your AI Health Assistant
                  </p>
                  <p style={{ fontSize: 13, color: "var(--t2)", maxWidth: 380, lineHeight: 1.6 }}>
                    I can help you book appointments, answer health questions, manage your reminders, and more.
                    Type a message to get started!
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {[
                    "Book an appointment",
                    "What are your clinic hours?",
                    "Remind me about my medication",
                    "I have a headache",
                  ].map(s => (
                    <button key={s} onClick={() => { setInput(s); }}
                      style={{
                        padding: "6px 14px", borderRadius: 20,
                        border: "1px solid rgba(124,58,237,0.3)",
                        background: "rgba(124,58,237,0.08)",
                        color: "#a78bfa", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgLoad ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 52 }} />
                ))}
              </div>
            ) : (
              messages.map(m => {
                const isPatient = m.sender === "patient";
                const isStaff = m.sender === "staff";
                return (
                  <div key={m.id}>
                    {isPatient ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ maxWidth: "72%" }}>
                          <div style={{
                            borderRadius: "16px 16px 4px 16px",
                            padding: "12px 16px",
                            background: "rgba(124,58,237,0.25)",
                            border: "1px solid rgba(124,58,237,0.35)",
                            color: "#fff", fontSize: 14, lineHeight: 1.55,
                          }}>
                            {m.content}
                          </div>
                          <p style={{ fontSize: 10, color: "var(--t3)", textAlign: "right", marginTop: 4 }}>
                            {formatTime(m.timestamp)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Bot size={11} color="#fff" />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: isStaff ? "#34d399" : "#a78bfa" }}>{isStaff ? "Receptionist" : "AI Assistant"}</span>
                        </div>
                        <div style={{ maxWidth: "78%", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", background: isStaff ? "rgba(52,211,153,0.12)" : "rgba(99,102,241,0.15)", border: isStaff ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(99,102,241,0.25)", color: "#fff", fontSize: 14, lineHeight: 1.6 }}>
                          {m.content}
                        </div>
                        <p style={{ fontSize: 10, color: "var(--t3)", marginTop: 4 }}>{formatTime(m.timestamp)}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {sending && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot size={11} color="#fff" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#a78bfa" }}>AI Assistant</span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: "4px 16px 16px 16px", padding: "12px 16px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <Loader2 size={13} color="#a5b4fc" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "#a5b4fc" }}>Thinking…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--bdr)",
            background: "var(--sidebar-bg)",
            flexShrink: 0,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              disabled={sending}
              style={{
                flex: 1, height: 46, borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "var(--card-bg2)",
                color: "#fff", fontSize: 13,
                padding: "0 16px", outline: "none",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              style={{
                width: 46, height: 46, borderRadius: 12,
                background: "linear-gradient(135deg,#7c3aed,#6366f1)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: (!input.trim() || sending) ? 0.4 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <Send size={16} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
