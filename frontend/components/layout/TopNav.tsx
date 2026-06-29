"use client";
import { Bell, Search, Settings, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { getInitials } from "@/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  admin:        "linear-gradient(135deg,#dc2626,#b91c1c)",
  doctor:       "linear-gradient(135deg,#2563eb,#1d4ed8)",
  receptionist: "linear-gradient(135deg,#16a34a,#15803d)",
  patient:      "linear-gradient(135deg,#8b5cf6,#6366f1)",
};

interface TopNavProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  loading?: boolean;
  actions?: React.ReactNode;
}

export default function TopNav({ title, subtitle, onRefresh, loading, actions }: TopNavProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ total?: number; [key: string]: unknown } | null>(null);
  const [searching, setSearching] = useState(false);

  const initials = user ? getInitials(user.full_name) : "?";
  const gradient = ROLE_COLORS[user?.role ?? "receptionist"] ?? ROLE_COLORS.receptionist;

  useEffect(() => {
    if (user?.role !== "patient" || query.trim().length < 2) {
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      api.searchPatient(query.trim())
        .then((data) => { if (alive) setResults(data as { total?: number; [key: string]: unknown }); })
        .catch(() => { if (alive) setResults({ total: 0 }); })
        .finally(() => { if (alive) setSearching(false); });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, user?.role]);

  const resultGroups = results
    ? ["appointments", "conversations", "messages", "notifications", "doctors", "profile"]
        .map((key) => ({ key, items: (results[key] as unknown[]) || [] }))
        .filter((group) => group.items.length > 0)
    : [];

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      height: 60,
      flexShrink: 0,
      padding: "0 20px",
      gap: 12,
      borderBottom: "1px solid var(--bdr)",
      background: "var(--sidebar-bg)",
    }}>
      {/* Title */}
      {title && (
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>{subtitle}</p>}
        </div>
      )}

      {/* Search — centered, grows */}
      <div style={{ flex: 1, maxWidth: 440 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute", left: 12,
              top: "50%", transform: "translateY(-50%)",
              color: "var(--t3)", pointerEvents: "none",
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={user?.role === "patient" ? "Search appointments, messages..." : "Search patients, conversations..."}
            style={{
              width: "100%",
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--bdr)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--t2)",
              fontSize: 13,
              paddingLeft: 34,
              paddingRight: 12,
              outline: "none",
            }}
          />
          {user?.role === "patient" && query.trim().length >= 2 && (
            <div style={{
              position: "absolute",
              top: 42,
              left: 0,
              right: 0,
              zIndex: 50,
              background: "var(--card-bg)",
              border: "1px solid var(--bdr)",
              borderRadius: 12,
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              padding: 10,
              maxHeight: 320,
              overflowY: "auto",
            }}>
              {searching ? (
                <p style={{ fontSize: 12, color: "var(--t2)", padding: 8 }}>Searching...</p>
              ) : resultGroups.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--t2)", padding: 8 }}>No results</p>
              ) : (
                resultGroups.map((group) => (
                  <div key={group.key} style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "4px 8px" }}>
                      {group.key}
                    </p>
                    {group.items.slice(0, 3).map((item, index) => {
                      const row = item as Record<string, unknown>;
                      const label = String(row.title || row.doctor_name || row.name || row.intent || row.content || row.status || "Result");
                      const detail = String(row.body || row.specialty || row.date || row.timestamp || row.email || "");
                      return (
                        <div key={`${group.key}-${String(row.id || index)}`} style={{ padding: "7px 8px", borderRadius: 8, background: "rgba(255,255,255,0.03)", marginTop: 4 }}>
                          <p style={{ fontSize: 12, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
                          {detail && <p style={{ fontSize: 10, color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{detail}</p>}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
        {actions}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              width: 34, height: 34, display: "flex", alignItems: "center",
              justifyContent: "center", borderRadius: 8, background: "transparent",
              border: "none", cursor: "pointer", color: "var(--t3)",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={15} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
          </button>
        )}

        {/* Bell */}
        <button style={{
          position: "relative", width: 34, height: 34,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 8, background: "transparent", border: "none", cursor: "pointer",
          color: "var(--t2)",
        }}>
          <Bell size={15} />
        </button>

        {/* Settings */}
        <button style={{
          width: 34, height: 34, display: "flex", alignItems: "center",
          justifyContent: "center", borderRadius: 8, background: "transparent",
          border: "none", cursor: "pointer", color: "var(--t2)",
        }}>
          <Settings size={15} />
        </button>

        {/* User avatar + name */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                {user.full_name}
              </span>
              <span style={{ fontSize: 10, color: "var(--t3)", textTransform: "capitalize" }}>
                {user.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
