"use client";
import { useState } from "react";
import {
  PhoneCall, Activity,
  AlertTriangle, Clock, Inbox, ArrowUpRight,
  MessageCircle, Mail
} from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { api } from "@/services/api";
import {
  useDashboardStats,
  useConversations,
  useEscalations,
  useAppointments
} from "@/hooks/useDashboard";
import type { Conversation, Escalation, Appointment, DashboardStats } from "@/types";
import { timeAgo, getInitials } from "@/lib/utils";
import Link from "next/link";

const AV = ["#14b8a6", "#6366f1", "#22c55e", "#f59e0b", "#8b5cf6", "#3b82f6", "#ef4444", "#ec4899"];
const av = (s: string) => AV[(s.charCodeAt(0) || 0) % AV.length];

export default function ReceptionistDashboardPage() {
  const [activeTab, setActiveTab] = useState("All");

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: convs, isLoading: convsLoading } = useConversations();
  const { data: escs, isLoading: escsLoading } = useEscalations();
  const { data: appts, isLoading: apptsLoading } = useAppointments();

  const loading = statsLoading || convsLoading || escsLoading || apptsLoading;

  const conversations = (convs as Conversation[] | undefined || []).slice(0, 8);
  const openEscalations = (escs as Escalation[] | undefined || []).filter(x => x.status === "open").slice(0, 5);
  
  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = (appts as Appointment[] | undefined || []).filter(
    (ap) => ap.date?.startsWith(today) || ap.slot_start?.startsWith(today)
  ).slice(0, 6);

  const humanConvs = conversations.filter(c => c.ownership === "HUMAN_ACTIVE");
  const emailConvs = conversations.filter(c => c.channel === "email");
  const waConvs = conversations.filter(c => c.channel === "whatsapp");

  const kpis = [
    { 
      label: "Active Conversations", 
      value: (stats as DashboardStats)?.active_conversations ?? conversations.length, 
      icon: Activity, 
      color: "#10b981",
      href: "/dashboard/conversations" 
    },
    { 
      label: "Human Takeovers", 
      value: humanConvs.length, 
      icon: PhoneCall, 
      color: "#3b82f6",
      href: "/dashboard/conversations" 
    },
    { 
      label: "Today's Appointments", 
      value: todayAppointments.length, 
      icon: Clock, 
      color: "#06b6d4",
      href: "/dashboard/appointments" 
    },
    { 
      label: "Open Escalations", 
      value: (stats as DashboardStats)?.open_escalations ?? openEscalations.length, 
      icon: Activity, 
      color: "#f97316",
      href: "/dashboard/escalations" 
    },
  ];

  const tabs = [
    { name: "All", count: conversations.length },
    { name: "Email", count: emailConvs.length },
    { name: "WA", count: waConvs.length },
    { name: "Human", count: humanConvs.length },
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
      background: "linear-gradient(135deg, #050816 0%, #0a0f1e 100%)"
    }}>
      <TopNav title="Reception Dashboard" subtitle="Front Desk Overview" loading={loading} />

      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "20px 24px",
      }}>
        
        {/* KPI Cards Row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "20px"
        }}>
          {kpis.map((k, idx) => {
            const Icon = k.icon;
            return (
              <Link key={idx} href={k.href} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  padding: "20px",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${k.color}40`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "12px"
                  }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: `${k.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${k.color}30`
                    }}>
                      <Icon size={20} color={k.color} />
                    </div>
                  </div>
                  <p style={{
                    fontSize: "13px",
                    color: "#94a3b8",
                    fontWeight: 500,
                    marginBottom: "4px"
                  }}>{k.label}</p>
                  <h2 style={{
                    fontSize: "36px",
                    fontWeight: 700,
                    color: "#ffffff",
                    margin: 0,
                    lineHeight: 1
                  }}>
                    {loading ? "—" : k.value}
                  </h2>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Main Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: "16px"
        }}>
          
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Live Conversations */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "20px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#ffffff",
                    margin: 0
                  }}>Live Conversations</h3>
                </div>
                <Link href="/dashboard/conversations" style={{
                  fontSize: "12px",
                  color: "#3b82f6",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>

              {/* Tabs */}
              <div style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                flexWrap: "wrap"
              }}>
                {tabs.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setActiveTab(t.name)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      transition: "all 0.2s",
                      background: activeTab === t.name ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
                      color: activeTab === t.name ? "#3b82f6" : "#94a3b8",
                      border: activeTab === t.name ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer"
                    }}
                  >
                    {t.name} {t.count > 0 && <span style={{ marginLeft: "4px" }}>({t.count})</span>}
                  </button>
                ))}
              </div>

              {/* Conversations List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} style={{
                        height: "72px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "12px",
                        animation: "pulse 2s infinite"
                      }} />
                    ))
                  ) : conversations.length === 0 ? (
                    <div style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#64748b"
                    }}>No active conversations</div>
                  ) : (
                    conversations.slice(0, 6).map((c) => {
                      const name = c.patients?.name ?? "Unknown";
                      const init = getInitials(name);
                      const color = av(name[0]);
                      const isHuman = c.ownership === "HUMAN_ACTIVE";
                      const lastMessage = c.summary || "Waiting for response...";
                      return (
                        <Link 
                          key={c.id} 
                          href={`/dashboard/conversations?id=${c.id}`}
                          style={{ textDecoration: "none" }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            transition: "all 0.2s",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                          }}>
                            {/* Avatar */}
                            <div style={{ position: "relative", flexShrink: 0 }}>
                              <div style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#ffffff",
                                background: color
                              }}>
                                {init}
                              </div>
                              <div style={{
                                position: "absolute",
                                right: "-2px",
                                bottom: "-2px",
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                border: "2px solid #050816",
                                background: "#22c55e"
                              }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "4px"
                              }}>
                                <h4 style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#ffffff",
                                  margin: 0
                                }}>{name}</h4>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{
                                    fontSize: "10px",
                                    color: "#64748b"
                                  }}>
                                    {c.channel === "email" ? (
                                      <><Mail size={10} style={{ marginRight: "4px" }} /> email</>
                                    ) : (
                                      <><MessageCircle size={10} style={{ marginRight: "4px" }} /> whatsapp</>
                                    )}
                                  </span>
                                  <span style={{
                                    fontSize: "10px",
                                    color: "#64748b"
                                  }}>
                                    • {timeAgo(c.created_at)}
                                  </span>
                                </div>
                              </div>
                              <p style={{
                                fontSize: "11px",
                                color: "#94a3b8",
                                margin: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}>{lastMessage}</p>
                            </div>
                            
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "10px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              background: isHuman ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
                              color: isHuman ? "#f59e0b" : "#22c55e",
                              border: isHuman ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(34,197,94,0.3)"
                            }}>
                              {isHuman ? "Human" : "AI Active"}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Emergency Alerts */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "16px",
              padding: "20px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <h3 style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#ffffff",
                    margin: 0
                  }}>Emergency Alerts</h3>
                </div>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "#ef4444",
                  color: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "6px"
                }}>
                  {openEscalations.length} Open
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {loading ? (
                    Array(3).fill(0).map((_,i) => (
                      <div key={i} style={{
                        height: "56px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "12px"
                      }} />
                    ))
                  ) : openEscalations.length > 0 ? openEscalations.slice(0,3).map(esc => {
                    return (
                    <div key={esc.id} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px",
                      borderRadius: "12px",
                      background: "rgba(239,68,68,0.05)",
                      border: "1px solid rgba(239,68,68,0.15)"
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#ffffff",
                          display: "block"
                        }}>{esc.patients?.name || "Patient"}</span>
                        <span style={{
                          fontSize: "10px",
                          color: "#94a3b8"
                        }}>
                          low_confidence {(esc.metadata?.confidence as number || 0.2).toFixed(2)}
                        </span>
                      </div>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "rgba(245,158,11,0.15)",
                        color: "#f59e0b",
                        padding: "4px 8px",
                        borderRadius: "6px"
                      }}>
                        LOW
                      </span>
                    </div>
                  )}) : (
                    <div style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "#64748b"
                    }}>No alerts</div>
                  )}
              </div>
            </div>

            {/* Today's Appointments */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "20px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}>
                <h3 style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#ffffff",
                  margin: 0
                }}>Today&apos;s Appointments</h3>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>All</div>
              </div>
              
              {loading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {Array(3).fill(0).map((_,i) => (
                        <div key={i} style={{
                          height: "48px",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: "12px"
                        }} />
                      ))}
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px",
                    textAlign: "center",
                    color: "#64748b"
                  }}>
                      <Clock size={32} style={{ marginBottom: "8px", opacity: 0.3 }} />
                      <p style={{ fontSize: "12px", margin: 0 }}>No appointments today</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {todayAppointments.slice(0,4).map(apt => (
                        <div key={apt.id} style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "10px",
                          borderRadius: "12px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)"
                        }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#06b6d4",
                            marginRight: "10px"
                          }}>
                            {apt.patients?.name?.[0] || "P"}
                          </div>
                          <div>
                            <p style={{
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#ffffff",
                              margin: 0
                            }}>{apt.patients?.name || "Patient"}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
            </div>

            {/* Notifications */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "20px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}>
                <h3 style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#ffffff",
                  margin: 0
                }}>Notifications</h3>
                <button 
                  onClick={() => api.markAllNotificationsRead()}
                  style={{
                    fontSize: "11px",
                    color: "#3b82f6",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  Mark all read
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}>
                  <Inbox size={16} color="#22c55e" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#ffffff",
                      margin: 0,
                      marginBottom: "2px"
                    }}>WhatsApp from Patient</p>
                    <p style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>Hi I&apos;m having a symptoms of fever what should I do?</p>
                    <p style={{ fontSize: "10px", color: "#64748b", margin: 0, marginTop: "4px" }}>21 minutes ago</p>
                  </div>
                  <div style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#3b82f6",
                    marginTop: "6px"
                  }} />
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}>
                  <Inbox size={16} color="#3b82f6" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#ffffff",
                      margin: 0,
                      marginBottom: "2px"
                    }}>Email from THANGADURAI</p>
                    <p style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>fyi -- Escalation Summary** Patient Test U...</p>
                    <p style={{ fontSize: "10px", color: "#64748b", margin: 0, marginTop: "4px" }}>about 12 hours ago</p>
                  </div>
                  <div style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#3b82f6",
                    marginTop: "6px"
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
