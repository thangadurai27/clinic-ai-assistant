"use client";

import { useState } from "react";
import { Pill, Plus, CheckCircle2, Clock, Trash2, Info } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";
import type { MedicationReminder } from "@/types";

interface Props {
    medication_reminders: MedicationReminder[];
    onRefresh: () => void;
}

export default function MedicationSection({ medication_reminders, onRefresh }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);

    const toggleComplete = async (m: MedicationReminder) => {
        if (m.completed) return; // Already completed for today
        setLoading(m.id);
        try {
            await api.completeMedication(m.id);
            toast.success(`${m.medicine_name} marked as taken!`);
            onRefresh();
        } catch {
            toast.error("Failed to update medication");
        } finally {
            setLoading(null);
        }
    };

    const deleteMed = async (id: string) => {
        if (!confirm("Are you sure you want to delete this medication?")) return;
        try {
            await api.deleteMedication(id);
            toast.success("Medication deleted");
            onRefresh();
        } catch {
            toast.error("Failed to delete");
        }
    };

    const sortedMeds = [...medication_reminders].sort((a, b) => a.reminder_time.localeCompare(b.reminder_time));

    return (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Daily Medication</h3>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Track your prescriptions and reminders</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fb923c", background: "rgba(251,146,60,0.1)", padding: "4px 10px", borderRadius: 8, height: "fit-content" }}>TODAY</span>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sortedMeds.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.015)", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.1)" }}>
                        <Pill size={32} style={{ color: "rgba(255,255,255,0.1)", marginBottom: 12 }} />
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>No medications added yet.</p>
                    </div>
                ) : (
                    sortedMeds.map((m) => (
                        <div key={m.id} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            padding: "16px",
                            borderRadius: 20,
                            background: m.completed ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${m.completed ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}`,
                            transition: "all 0.2s ease"
                        }}>
                            <div
                                onClick={() => toggleComplete(m)}
                                style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: m.completed ? "#10b981" : "rgba(251,146,60,0.1)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: m.completed || loading === m.id ? "default" : "pointer",
                                    transition: "all 0.2s ease",
                                    flexShrink: 0,
                                    border: m.completed ? "none" : "1px solid rgba(251,146,60,0.2)",
                                    opacity: loading === m.id ? 0.5 : 1
                                }}
                            >
                                {loading === m.id ? (
                                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                                ) : m.completed ? (
                                    <CheckCircle2 size={24} color="#fff" />
                                ) : (
                                    <Pill size={22} style={{ color: "#fb923c" }} />
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: m.completed ? "rgba(255,255,255,0.6)" : "#fff", textDecoration: m.completed ? "line-through" : "none" }}>
                                        {m.medicine_name}
                                    </p>
                                    {m.completed && <span style={{ fontSize: 9, fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: 4 }}>COMPLETED</span>}
                                </div>
                                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                                    {m.dosage} • {m.frequency}
                                </p>
                                {m.instructions && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                        <Info size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
                                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.instructions}</p>
                                    </div>
                                )}
                            </div>

                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginBottom: 4 }}>
                                    <Clock size={12} style={{ color: m.completed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)" }} />
                                    <p style={{ fontSize: 13, fontWeight: 700, color: m.completed ? "rgba(255,255,255,0.3)" : "#fff" }}>
                                        {m.reminder_time.slice(0, 5)}
                                    </p>
                                </div>
                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                    <button
                                        onClick={() => deleteMed(m.id)}
                                        style={{ background: "transparent", border: "none", color: "rgba(248,113,113,0.4)", cursor: "pointer", padding: 4 }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => setShowModal(true)}
                style={{
                    width: "100%", marginTop: 8, padding: "12px", borderRadius: 16,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s ease"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
                <Plus size={18} /> Add New Medication
            </button>

            {showModal && <AddMedicationModal onClose={() => setShowModal(false)} onRefresh={onRefresh} />}
        </div>
    );
}

function AddMedicationModal({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => void }) {
    const [form, setForm] = useState({
        medicine_name: "",
        dosage: "",
        frequency: "Once daily",
        instructions: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        reminder_time: "08:00",
        status: "active",
        completed: false
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.medicine_name) e.medicine_name = "Medicine name is required";
        if (!form.dosage) e.dosage = "Dosage is required";
        if (!form.reminder_time) e.reminder_time = "Reminder time is required";
        if (form.end_date && form.end_date < form.start_date) e.end_date = "End date cannot be before start date";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            // Get patient_id from current data if needed, but backend handles it
            await api.createMedication({
                ...form,
                patient_id: "00000000-0000-0000-0000-000000000000" // Placeholder, backend overrides
            });
            toast.success("Medication added successfully");
            onRefresh();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to save medication";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div className="animate-fade-in" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, width: "100%", maxWidth: 500, overflow: "hidden", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>
                <div style={{ padding: "24px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Add Medication</h3>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Set up a new reminder</p>
                    </div>
                    <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 24 }}>&times;</button>
                </div>

                <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Medicine Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Paracetamol"
                            value={form.medicine_name}
                            onChange={e => setForm({ ...form, medicine_name: e.target.value })}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: errors.medicine_name ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
                        />
                        {errors.medicine_name && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{errors.medicine_name}</p>}
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Dosage</label>
                        <input
                            type="text"
                            placeholder="e.g. 500mg"
                            value={form.dosage}
                            onChange={e => setForm({ ...form, dosage: e.target.value })}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: errors.dosage ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Frequency</label>
                        <select
                            value={form.frequency}
                            onChange={e => setForm({ ...form, frequency: e.target.value })}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
                        >
                            <option value="Once daily">Once daily</option>
                            <option value="Twice daily">Twice daily</option>
                            <option value="Three times daily">Three times daily</option>
                            <option value="Four times daily">Four times daily</option>
                            <option value="Every 4 hours">Every 4 hours</option>
                            <option value="As needed">As needed</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Start Date</label>
                        <input
                            type="date"
                            value={form.start_date}
                            onChange={e => setForm({ ...form, start_date: e.target.value })}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>End Date (Optional)</label>
                        <input
                            type="date"
                            value={form.end_date}
                            onChange={e => setForm({ ...form, end_date: e.target.value })}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: errors.end_date ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
                        />
                        {errors.end_date && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{errors.end_date}</p>}
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Reminder Time</label>
                        <input
                            type="time"
                            value={form.reminder_time}
                            onChange={e => setForm({ ...form, reminder_time: e.target.value })}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: errors.reminder_time ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
                        />
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Instructions (Optional)</label>
                        <textarea
                            placeholder="e.g. Take after food"
                            value={form.instructions}
                            onChange={e => setForm({ ...form, instructions: e.target.value })}
                            rows={3}
                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, resize: "none" }}
                        />
                    </div>
                </div>

                <div style={{ padding: "24px 32px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <button onClick={onClose} style={{ padding: "12px 24px", borderRadius: 14, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{ padding: "12px 28px", borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#6366f1)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", boxShadow: "0 8px 16px rgba(124, 58, 237, 0.2)" }}
                    >
                        {loading ? "Saving..." : "Save Medication"}
                    </button>
                </div>
            </div>
        </div>
    );
}
