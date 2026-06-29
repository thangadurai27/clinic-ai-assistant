"use client";
import { useState } from "react";
import {
  PhoneCall, Activity,
  AlertTriangle, Clock, Inbox, ArrowUpRight
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

  // Use TanStack Query hooks
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: convs, isLoading: convsLoading } = useConversations();
  const { data: escs, isLoading: escsLoading } = useEscalations();
  const { data: appts, isLoading: apptsLoading } = useAppointments();

  const loading = statsLoading || convsLoading || escsLoading || apptsLoading;

  // Process data
  const conversations = (convs as Conversation[] | undefined || []).slice(0, 8);
  const openEscalations = (escs as Escalation[] | undefined || []).filter(x => x.status === "open").slice(0, 5);
  
  // Today's appointments
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
      accent: "text-emerald-400", 
      bgAccent: "bg-emerald-500/15",
      borderAccent: "border-emerald-500/40",
      href: "/dashboard/conversations" 
    },
    { 
      label: "Human Takeovers", 
      value: humanConvs.length, 
      icon: PhoneCall, 
      accent: "text-sky-400", 
      bgAccent: "bg-sky-500/15",
      borderAccent: "border-sky-500/40",
      href: "/dashboard/conversations" 
    },
    { 
      label: "Today's Appointments", 
      value: todayAppointments.length, 
      icon: Clock, 
      accent: "text-teal-400", 
      bgAccent: "bg-teal-500/15",
      borderAccent: "border-teal-500/40",
      href: "/dashboard/appointments" 
    },
    { 
      label: "Open Escalations", 
      value: (stats as DashboardStats)?.open_escalations ?? openEscalations.length, 
      icon: Activity, 
      accent: "text-orange-400", 
      bgAccent: "bg-orange-500/15",
      borderAccent: "border-orange-500/40",
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
    <div className="flex flex-col h-full overflow-hidden bg-[#050816]">
      <TopNav title="Reception Dashboard" subtitle="Front Desk Overview" loading={loading} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
        
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((k, idx) => {
            const Icon = k.icon;
            return (
              <Link key={idx} href={k.href} className="no-underline">
                <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0E1628]/80 to-[#0A1020] p-5 transition-all duration-300 hover:border-[#5B7CFF]/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 font-medium mb-1">{k.label}</p>
                      <p className="text-5xl font-bold text-white leading-tight">
                        {loading ? "—" : k.value}
                      </p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${k.bgAccent} border border-white/10`}>
                      <Icon className={`h-6 w-6 ${k.accent}`} strokeWidth={1.75} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Main Grid: 2 columns on lg, 1 on smaller */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Live Conversations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0E1628]/90 via-[#0C1424] to-[#09101D] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Live Conversations</h3>
                <button 
                  onClick={() => {}}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {tabs.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setActiveTab(t.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      activeTab === t.name
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {t.name} {t.count > 0 && <span className="ml-1 opacity-80">({t.count})</span>}
                  </button>
                ))}
              </div>

              {/* Conversations List */}
              <div className="space-y-3">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="skeleton h-20 rounded-xl" />
                    ))
                  ) : conversations.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">No active conversations</div>
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
                          className="group"
                        >
                          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#0B1220] p-4 transition-all hover:border-[#5B7CFF]/40 hover:bg-[#0E1830]">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              <div 
                                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                                style={{ background: color }}
                              >
                                {init}
                              </div>
                              <div className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0B1220] bg-emerald-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-white text-sm">{name}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500">
                                    {c.channel === "email" ? "email" : "whatsapp"}
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    · {timeAgo(c.created_at)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 truncate">{lastMessage}</p>
                            </div>
                            
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              isHuman 
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}>
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

          {/* Right Column: Emergency Alerts & Appointments */}
          <div className="space-y-6">
            
            {/* Emergency Alerts */}
            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-[#150B0B]/90 to-[#09101D] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h3 className="text-base font-semibold text-white">Emergency Alerts</h3>
                </div>
                <span className="text-xs font-bold bg-red-500 text-white px-2 py-1 rounded-md">
                  {openEscalations.length} Open
                </span>
              </div>

              <div className="space-y-3">
                {loading ? (
                    Array(3).fill(0).map((_,i) => (
                      <div key={i} className="skeleton h-16 rounded-xl" />
                    ))
                  ) : openEscalations.length > 0 ? openEscalations.slice(0,3).map(esc => {
                    return (
                    <div key={esc.id} className="flex items-center justify-between rounded-xl bg-[#0B1220] border border-white/5 p-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white text-sm">{esc.patients?.name || "Patient"}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        low_confidence {(esc.metadata?.confidence as number || 0.2).toFixed(2)}
                      </span>
                      <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                        LOW
                      </span>
                    </div>
                  )}) : (
                    <div className="py-8 text-center text-gray-500">No alerts</div>
                  )}
              </div>
            </div>

            {/* Today's Appointments */}
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0E1628]/90 to-[#09101D] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Today&apos;s Appointments</h3>
                <Link href="/dashboard/appointments" className="text-xs text-blue-400 hover:text-blue-300">
                  All
                </Link>
              </div>
              
              {loading ? (
                  <div className="space-y-2">
                      {Array(3).fill(0).map((_,i) => (
                        <div key={i} className="skeleton h-14 rounded-xl" />
                      ))}
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
                      <Clock className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm">No appointments today</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                      {todayAppointments.slice(0,4).map(apt => (
                        <div key={apt.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0B1220] p-3 hover:bg-[#0E1830]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/5 text-xs font-bold text-cyan-300">
                              {apt.patients?.name?.[0] || "P"}
                            </div>
                            <div>
                              <p className="font-medium text-white text-xs">{apt.patients?.name || "Patient"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
            </div>

            {/* Notifications */}
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0E1628]/90 to-[#09101D] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Notifications</h3>
                <button 
                  onClick={() => api.markAllNotificationsRead()}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-[#0B1220] border border-white/5 p-3">
                  <Inbox className="h-5 w-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-xs text-white">WhatsApp from Patient</p>
                    <p className="text-[10px] text-gray-500">Hi I&apos;m having a symptoms of fever what should I do?</p>
                    <p className="text-[10px] text-gray-500">21 minutes ago</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-[#0B1220] border border-white/5 p-3">
                  <Inbox className="h-5 w-5 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-xs text-white">Email from THANGADURAI</p>
                    <p className="text-[10px] text-gray-500">fyi -- Escalation Summary** Patient Test U...</p>
                    <p className="text-[10px] text-gray-500">about 12 hours ago</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
