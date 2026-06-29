"use client";
import { useState, useCallback } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    LineChart, Line
} from "recharts";
import {
    Activity, TrendingUp,
    Users, Calendar, Clock,
    Target, Zap, ArrowUpRight, ArrowDownRight,
    Wifi, Mail, MessageCircle, AlertTriangle,
    PieChart as PieIcon, BarChart3 as BarIcon
} from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { api } from "@/services/api";
import { useMountFetch } from "@/hooks/useMountFetch";

interface AnalyticsData {
    total_patients: number;
    total_appointments: number;
    ai_resolved: number;
    active_escalations: number;
    accuracy_timeline: Array<{ date: string; ai_handled: number; escalated: number }>;
    intent_distribution: Array<{ intent: string; count: number }>;
    top_patient_intents: Array<{ intent: string; count: number }>;
    performance: {
        ai_accuracy: number;
        automation_rate: number;
        avg_ai_response_time: number;
        avg_resolution_time: number;
        escalation_rate: number;
    };
    channels: Array<{ channel: string; count: number; percentage: number }>;
    messages: {
        total_messages: number;
        ai_responses: number;
        patient_messages: number;
        staff_responses: number;
    };
    stats: {
        total_patients: number;
        appointments_today: number;
        open_escalations: number;
    };
}

const COLORS = ["#00C8FF", "#34D399", "#F59E0B", "#EF4444", "#A78BFA", "#60A5FA"];

const SkeletonCard = () => (
    <div className="animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24, height: "100%" }}>
        <div style={{ width: "40%", height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 6, marginBottom: 16 }} />
        <div style={{ width: "70%", height: 28, background: "rgba(255,255,255,0.1)", borderRadius: 6, marginBottom: 8 }} />
        <div style={{ width: "30%", height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 6 }} />
    </div>
);

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        console.log("[AnalyticsPage] Loading analytics...");
        setLoading(true);
        setError(null);
        try {
            const result = await api.getAnalytics();
            console.log("[AnalyticsPage] Analytics data received:", result);
            setData(result as AnalyticsData);
        } catch (err) {
            console.error("[AnalyticsPage] Error loading analytics:", err);
            setError(err instanceof Error ? err.message : "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    }, []);

    useMountFetch(load, [load]);
    // Disable realtime for now to test if that's the issue
    // useRealtime({ table: "conversations", onchange: load });
    // useRealtime({ table: "messages", onchange: load });
    // useRealtime({ table: "ai_logs", onchange: load });

    const kpis = data ? [
        { label: "AI Accuracy", value: `${(data.performance?.ai_accuracy ?? 0).toFixed(1)}%`, sub: "Confidence Score", icon: Target, color: "#34D399", trend: "+2.4%" },
        { label: "Automation Rate", value: `${(data.performance?.automation_rate ?? 0).toFixed(1)}%`, sub: "AI vs Human", icon: Zap, color: "#F59E0B", trend: "+5.1%" },
        { label: "Avg Response", value: `${(data.performance?.avg_ai_response_time ?? 0).toFixed(1)}s`, sub: "AI Latency", icon: Clock, color: "#60A5FA", trend: "-0.5s" },
        { label: "Resolution Time", value: `${(data.performance?.avg_resolution_time ?? 0).toFixed(1)}m`, sub: "Avg Time to Close", icon: TrendingUp, color: "#A78BFA", trend: "-1.2m" },
    ] : [];

    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <TopNav title="Analytics" subtitle="System Performance & Trends" />
                <div style={{ padding: "20px 24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                        {[1, 2].map(i => (
                            <div key={i} className="animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24, height: 340 }} />
                        ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[1, 2].map(i => (
                            <div key={i} className="animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24, height: 340 }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <TopNav title="Analytics" subtitle="System Performance & Trends" />
                <div style={{ padding: "80px 24px", textAlign: "center" }}>
                    <AlertTriangle size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                    <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 8 }}>Failed to load analytics</h2>
                    <p style={{ color: "#94A3B8", marginBottom: 24 }}>{error}</p>
                    <button
                        onClick={load}
                        style={{
                            padding: "12px 24px",
                            borderRadius: 10,
                            background: "#00C8FF",
                            color: "#0F172A",
                            border: "none",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    const analyticsData = data!;
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <TopNav title="Analytics" subtitle="Live System Performance" onRefresh={load} loading={loading} />

            <div className="page-enter" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

                {/* KPI Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                    {kpis.map(k => (
                        <div key={k.label} className="animate-fade-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24, position: "relative", overflow: "hidden" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${k.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <k.icon size={22} color={k.color} />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 20, background: k.trend.startsWith("+") ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", fontSize: 11, fontWeight: 600, color: k.trend.startsWith("+") ? "#34d399" : "#f87171" }}>
                                    {k.trend.startsWith("+") ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                    {k.trend}
                                </div>
                            </div>
                            <p style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500, marginBottom: 4 }}>{k.label}</p>
                            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>{k.value}</h2>
                            <p style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{k.sub}</p>

                            <div style={{ position: "absolute", right: -10, bottom: -10, width: 80, height: 80, background: k.color, opacity: 0.03, borderRadius: "50%", filter: "blur(20px)" }} />
                        </div>
                    ))}
                </div>

                {/* AI Accuracy Timeline & Intent Distribution */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    {/* AI Accuracy Timeline */}
                    <div className="animate-fade-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Activity size={18} color="#00C8FF" />
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>AI Performance Timeline</h3>
                            </div>
                        </div>

                        <div style={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analyticsData.accuracy_timeline ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="date" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff" }}
                                        itemStyle={{ color: "#fff" }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                                    <Line type="monotone" dataKey="ai_handled" stroke="#34D399" strokeWidth={2} dot={false} name="AI Handled" animationDuration={1000} />
                                    <Line type="monotone" dataKey="escalated" stroke="#F59E0B" strokeWidth={2} dot={false} name="Escalated" animationDuration={1000} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Intent Distribution */}
                    <div className="animate-fade-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <PieIcon size={18} color="#00C8FF" />
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>Intent Distribution</h3>
                            </div>
                        </div>

                        <div style={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={(analyticsData.intent_distribution ?? []).slice(0, 6)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        innerRadius={40}
                                        dataKey="count"
                                        animationDuration={1000}
                                    >
                                        {(analyticsData.intent_distribution ?? []).slice(0, 6).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff" }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top Intents & Channel Usage */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    {/* Top Patient Intents */}
                    <div className="animate-fade-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <BarIcon size={18} color="#00C8FF" />
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>Top Patient Intents</h3>
                            </div>
                        </div>

                        <div style={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={(analyticsData.top_patient_intents ?? []).slice(0, 7)} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="intent" type="category" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} width={120} />
                                    <Tooltip
                                        contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff" }}
                                    />
                                    <Bar dataKey="count" fill="#00C8FF" radius={[0, 4, 4, 0]} animationDuration={1000} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Channel Usage */}
                    <div className="animate-fade-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Wifi size={18} color="#00C8FF" />
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>Channel Breakdown</h3>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            {(analyticsData.channels ?? []).map((c, idx) => {
                                const icon = c.channel === "whatsapp" ? <MessageCircle size={16} /> : c.channel === "email" ? <Mail size={16} /> : <Wifi size={16} />;
                                const color = c.channel === "whatsapp" ? "#22C55E" : c.channel === "email" ? "#3B82F6" : COLORS[idx % COLORS.length];
                                return (
                                    <div key={c.channel}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
                                                    {icon}
                                                </div>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>{c.channel}</span>
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: "#CBD5E1" }}>{c.count} ({c.percentage}%)</span>
                                        </div>
                                        <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
                                            <div style={{ width: `${c.percentage}%`, height: "100%", background: color, borderRadius: 10, transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: 32, padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.1)" }}>
                            <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                                <Activity size={12} />
                                Real-time data aggregated from {analyticsData.total_patients ?? 0} patients across all platforms.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Message Volume & Quick Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                    {/* Message Activity */}
                    <div className="animate-fade-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <MessageCircle size={18} color="#00C8FF" />
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>Message Activity</h3>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                            <div style={{ padding: 18, borderRadius: 16, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)" }}>
                                <p style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Total Messages</p>
                                <p style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>{analyticsData.messages?.total_messages ?? 0}</p>
                            </div>
                            <div style={{ padding: 18, borderRadius: 16, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                                <p style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>AI Responses</p>
                                <p style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>{analyticsData.messages?.ai_responses ?? 0}</p>
                            </div>
                            <div style={{ padding: 18, borderRadius: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                                <p style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Staff Interventions</p>
                                <p style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>{analyticsData.messages?.staff_responses ?? 0}</p>
                            </div>
                        </div>

                        <div style={{ marginTop: "auto", paddingTop: 16 }}>
                            <button
                                onClick={() => window.print()}
                                style={{ width: "100%", padding: "12px", borderRadius: 12, background: "rgba(0,200,255,0.15)", color: "#00C8FF", border: "1px solid rgba(0,200,255,0.3)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s" }}
                            >
                                Export Full Report
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {[
                            { label: "Total Patients", value: analyticsData.total_patients ?? 0, icon: Users, color: "#34D399" },
                            { label: "Appointments", value: analyticsData.total_appointments ?? 0, icon: Calendar, color: "#A78BFA" },
                            { label: "Open Escalations", value: analyticsData.active_escalations ?? 0, icon: AlertTriangle, color: "#EF4444" },
                        ].map((s) => (
                            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <s.icon size={20} color={s.color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>{s.label}</p>
                                    <p style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
