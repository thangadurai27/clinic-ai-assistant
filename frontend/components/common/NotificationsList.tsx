"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCheck,
  Trash2,
  Mail,
  MessageSquare,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import TopNav from "@/components/layout/TopNav";
import { useNotifications } from "@/hooks/useDashboard";
import { api } from "@/services/api";
import { timeAgo } from "@/lib/utils";
import type { Notification } from "@/types";

const ICON_MAP: Record<string, React.ElementType> = {
  emergency: AlertTriangle,
  new_email: Mail,
  new_whatsapp: MessageSquare,
  new_appointment: Calendar,
  human_takeover: PhoneCall,
  escalation: AlertTriangle,
};

const COLOR_MAP: Record<string, string> = {
  emergency: "#ef4444",
  escalation: "#ef4444",
  human_takeover: "#fb923c",
  new_whatsapp: "#34d399",
  new_email: "#60a5fa",
  new_appointment: "#a78bfa",
};

type Accent = "blue" | "purple";

const ACCENT: Record<Accent, { bg: string; border: string; color: string; unreadBg: string; unreadBorder: string }> = {
  blue: {
    bg: "rgba(78,168,255,0.1)",
    border: "rgba(78,168,255,0.3)",
    color: "var(--blue)",
    unreadBg: "rgba(78,168,255,0.05)",
    unreadBorder: "rgba(78,168,255,0.15)",
  },
  purple: {
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.3)",
    color: "#a78bfa",
    unreadBg: "rgba(124,58,237,0.05)",
    unreadBorder: "rgba(124,58,237,0.15)",
  },
};

interface NotificationsListProps {
  accent?: Accent;
  patientScoped?: boolean;
}

export default function NotificationsList({ accent = "blue", patientScoped = false }: NotificationsListProps) {
  const theme = ACCENT[accent];
  const queryClient = useQueryClient();
  
  // Always call hooks at the top level
  const patientScopedQuery = useQuery<Notification[]>({
    queryKey: ['patientNotifications'],
    queryFn: () => api.getPatientNotifications(100),
    enabled: patientScoped
  });
  
  const globalNotificationsResult = useNotifications(100, { enabled: !patientScoped });
  
  // Select the appropriate data based on patientScoped
  const queryResult = patientScoped ? patientScopedQuery : globalNotificationsResult;
  
  const notificationsData = queryResult.data;
  const loading = queryResult.isLoading;
  const refetch = queryResult.refetch;
  
  const notifications = useMemo(() => notificationsData || [], [notificationsData]);

  const unread = useMemo(() => notifications.filter((n) => !n.is_read), [notifications]);

  const markAll = async () => {
    try {
      if (patientScoped) {
        await api.markAllPatientNotificationsRead();
        queryClient.invalidateQueries({ queryKey: ['patientNotifications'] });
      } else {
        await api.markAllNotificationsRead();
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all read");
    }
  };

  const markOne = async (id: string) => {
    try {
      if (patientScoped) {
        await api.markPatientNotificationRead(id);
        queryClient.invalidateQueries({ queryKey: ['patientNotifications'] });
      } else {
        await api.markNotificationRead(id);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    } catch {
      /* silent */
    }
  };

  const deleteOne = async (id: string) => {
    if (!patientScoped) return;
    try {
      await api.deletePatientNotification(id);
      queryClient.invalidateQueries({ queryKey: ['patientNotifications'] });
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav
        title="Notifications"
        subtitle={unread.length > 0 ? `${unread.length} unread` : "All caught up"}
        onRefresh={refetch}
        loading={loading}
        actions={
          unread.length > 0 ? (
            <button
              onClick={markAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                color: theme.color,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div
        className="page-enter"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px" }}
      >
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60%",
              gap: 12,
            }}
          >
            <Bell size={48} style={{ color: "var(--t3)", opacity: 0.4 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>No notifications yet</p>
            <p style={{ fontSize: 13, color: "var(--t2)" }}>
              {patientScoped ? "Notifications appear here when your portal updates" : "Notifications appear here when patients message or book appointments"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 720 }}>
            {notifications.map((n) => {
              const Icon = ICON_MAP[n.type] ?? Bell;
              const color = COLOR_MAP[n.type] ?? "var(--t2)";
              return (
                <div key={n.id}
                  onClick={() => !n.is_read && markOne(n.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: n.is_read ? "var(--card-bg)" : theme.unreadBg,
                    border: `1px solid ${n.is_read ? "var(--bdr)" : theme.unreadBorder}`,
                    cursor: n.is_read ? "default" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${color}18`,
                      border: `1px solid ${color}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Icon size={16} style={{ color }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: n.is_read ? 500 : 700,
                          color: n.is_read ? "var(--t2)" : "#fff",
                          lineHeight: 1.4,
                        }}
                      >
                        {n.title}
                      </p>
                      <span style={{ fontSize: 11, color: "var(--t3)", flexShrink: 0, marginTop: 2 }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {n.body && (
                      <p style={{ fontSize: 12, color: "var(--t2)", marginTop: 3, lineHeight: 1.5 }}>
                        {n.body}
                      </p>
                    )}
                  </div>

                  {patientScoped ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteOne(n.id); }}
                      title="Delete notification"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.08)",
                        color: "#f87171",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : !n.is_read && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: theme.color,
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
