"use client";
import { useEffect, useState, useCallback } from "react";
import { Calendar, Plus, X, Clock, RefreshCw, Eye } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { api } from "@/services/api";
import { useRealtime } from "@/hooks/useRealtime";
import { useMountFetch } from "@/hooks/useMountFetch";
import type { Appointment, Doctor, AvailabilitySlot } from "@/types";
import { formatDateTime, getInitials } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  scheduled:   { bg: "#1e3a5f", color: "#93c5fd" },
  confirmed:   { bg: "#14532d", color: "#86efac" },
  completed:   { bg: "#374151", color: "#d1d5db" },
  cancelled:   { bg: "#7f1d1d", color: "#fca5a5" },
  rescheduled: { bg: "#78350f", color: "#fde68a" },
};

const AV = ["#14b8a6","#6366f1","#22c55e","#f59e0b","#8b5cf6","#3b82f6","#ef4444","#ec4899"];
const avBg = (s: string) => AV[(s.charCodeAt(0) || 0) % AV.length];

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44,
  background: "var(--card-bg2)",
  border: "1px solid var(--bdr)",
  borderRadius: 10,
  color: "#fff", fontSize: 14,
  padding: "0 14px", outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};


export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors,      setDoctors]      = useState<Doctor[]>([]);
  const [slots,        setSlots]        = useState<AvailabilitySlot[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showBook,     setShowBook]     = useState(false);
  const [booking,      setBooking]      = useState(false);
  const [slotLoading,  setSlotLoading]  = useState(false);
  const [filter,       setFilter]       = useState("all");
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);

  // Booking form state
  const [bDoctor,  setBDoctor]  = useState("");
  const [bDate,    setBDate]    = useState("");
  const [bTime,    setBTime]    = useState("");
  const [bNotes,   setBNotes]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, docs] = await Promise.all([
        api.getPatientAppointments() as Promise<Appointment[]>,
        api.getPatientDoctors() as Promise<Doctor[]>,
      ]);
      setAppointments(data);
      setDoctors(docs);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load appointments");
    }
    finally { setLoading(false); }
  }, []);

  useMountFetch(load, [load]);
  useRealtime({ table: "appointments", onchange: load });

  const filtered = filter === "all"
    ? appointments
    : appointments.filter(a => a.status === filter);

  useEffect(() => {
    if (!bDoctor || !bDate) {
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      setSlotLoading(true);
      api.getPatientDoctorAvailability(bDoctor, bDate)
        .then((data) => {
          if (alive) setSlots(((data as { slots: AvailabilitySlot[] }).slots || []).filter(s => s.available !== false));
        })
        .catch(() => {
          if (alive) {
            setSlots([]);
            toast.error("Failed to load available slots");
          }
        })
        .finally(() => alive && setSlotLoading(false));
    }, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [bDoctor, bDate]);

  const resetBookingForm = () => {
    setShowBook(false);
    setRescheduling(null);
    setBDoctor("");
    setBDate("");
    setBTime("");
    setBNotes("");
    setSlots([]);
  };

  const openReschedule = (appointment: Appointment) => {
    setRescheduling(appointment);
    setBDoctor(appointment.doctor_id || "");
    setBDate("");
    setBTime("");
    setBNotes(appointment.notes || "");
    setShowBook(true);
  };

  const cancelAppointment = async (id: string) => {
    try {
      await api.cancelPatientAppointment(id);
      toast.success("Appointment cancelled");
      load();
    } catch { toast.error("Failed to cancel appointment"); }
  };

  const bookAppointment = async () => {
    if (!bDoctor || !bDate || !bTime) { toast.error("Please fill all required fields"); return; }
    const slot = slots.find(s => s.start === bTime);
    if (!slot) { toast.error("Please choose an available slot"); return; }
    setBooking(true);
    try {
      const body = {
        doctor_id: bDoctor,
        slot_start: slot.start,
        slot_end: slot.end,
        notes: bNotes || undefined,
      };
      if (rescheduling) {
        await api.updatePatientAppointment(rescheduling.id, body);
        toast.success("Appointment rescheduled");
      } else {
        await api.createPatientAppointment(body);
        toast.success("Appointment booked successfully!");
      }
      resetBookingForm();
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to save appointment");
    } finally {
      setBooking(false);
    }
  };

  const upcoming = appointments.filter(a => a.status === "scheduled" || a.status === "confirmed");
  const past     = appointments.filter(a => a.status === "completed" || a.status === "cancelled");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav
        title="My Appointments"
        subtitle={`${upcoming.length} upcoming`}
        onRefresh={load}
        loading={loading}
        actions={
          <button
            onClick={() => setShowBook(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              background: "linear-gradient(135deg,#7c3aed,#6366f1)",
              border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Plus size={14} /> Book Appointment
          </button>
        }
      />

      <div className="page-enter" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px" }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Upcoming",   value: upcoming.length, color: "#a78bfa", border: "rgba(124,58,237,0.25)" },
            { label: "Completed",  value: past.filter(a => a.status === "completed").length, color: "#34d399", border: "rgba(52,211,153,0.25)" },
            { label: "Total",      value: appointments.length, color: "#60a5fa", border: "rgba(96,165,250,0.25)" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--card-bg)", border: `1px solid ${s.border}`,
              borderRadius: 14, padding: "16px 20px",
            }}>
              <p style={{ fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                {loading ? "—" : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {["all","scheduled","confirmed","rescheduled","completed","cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              background: filter === f ? "#7c3aed" : "rgba(255,255,255,0.06)",
              color: filter === f ? "#fff" : "var(--t2)",
              textTransform: "capitalize",
            }}>
              {f}
            </button>
          ))}
        </div>

        {/* Appointments list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
            <Calendar size={40} style={{ color: "var(--t3)", opacity: 0.4 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>No appointments found</p>
            <p style={{ fontSize: 12, color: "var(--t2)" }}>
              {filter === "all" ? "Book your first appointment to get started" : `No ${filter} appointments`}
            </p>
            <button onClick={() => setShowBook(true)} style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#7c3aed,#6366f1)",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Book Now
            </button>
          </div>
        ) : (
          <div className="animate-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {filtered.map(a => {
              const init   = getInitials(a.doctor_name || "D");
              const color  = avBg((a.doctor_name || "D")[0]);
              const status = STATUS_STYLE[a.status] ?? STATUS_STYLE.scheduled;
              const canCancel = a.status === "scheduled" || a.status === "confirmed";
              const dateStr = a.slot_start
                ? new Date(a.slot_start).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : formatDateTime(a.date);

              return (
                <div className="animate-fade-in" key={a.id}>
                  <div style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--bdr)",
                    borderRadius: 14,
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    transition: "border-color 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--bdr)")}
                  >
                    <div style={{
                      width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                      background: color, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff",
                    }}>
                      {init}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                        {a.doctor_name || "Doctor TBD"}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Clock size={11} style={{ color: "var(--t3)" }} />
                        <p style={{ fontSize: 12, color: "var(--t2)" }}>{dateStr}</p>
                      </div>
                      {a.notes && (
                        <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{a.notes}</p>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{
                        padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: status.bg, color: status.color, textTransform: "capitalize",
                      }}>
                        {a.status}
                      </span>
                      {canCancel && (
                        <>
                        <button
                          onClick={() => toast.info(`${a.doctor_name || "Doctor TBD"} • ${dateStr}${a.notes ? ` • ${a.notes}` : ""}`)}
                          title="View appointment"
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(96,165,250,0.3)",
                            background: "rgba(96,165,250,0.1)", color: "#60a5fa",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openReschedule(a)}
                          title="Reschedule appointment"
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(251,146,60,0.3)",
                            background: "rgba(251,146,60,0.1)", color: "#fb923c",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => cancelAppointment(a.id)}
                          title="Cancel appointment"
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
                            background: "rgba(239,68,68,0.1)", color: "#f87171",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <X size={14} />
                        </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {showBook && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center",
          padding: 20,
        }}
          onClick={e => { if (e.target === e.currentTarget) resetBookingForm(); }}
        >
          <div className="animate-fade-in"
            style={{
              width: "100%", maxWidth: 480,
              background: "var(--card-bg)",
              border: "1px solid rgba(124,58,237,0.4)",
              borderRadius: 20,
              padding: "28px 28px 24px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{rescheduling ? "Reschedule Appointment" : "Book Appointment"}</h2>
                <p style={{ fontSize: 12, color: "var(--t2)", marginTop: 2 }}>
                  Schedule a visit with our doctors
                </p>
              </div>
              <button onClick={resetBookingForm} style={{
                width: 30, height: 30, borderRadius: 8, border: "1px solid var(--bdr)",
                background: "transparent", color: "var(--t2)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Doctor select */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--t3)", display: "block", marginBottom: 6 }}>
                  Select Doctor
                </label>
                <select
                  value={bDoctor}
                  onChange={e => { setBDoctor(e.target.value); setBTime(""); setSlots([]); }}
                  style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--bdr)")}
                >
                  <option value="" style={{ background: "#1a1d2e" }}>Choose a doctor...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id} style={{ background: "#1a1d2e" }}>
                      {d.name} — {d.specialty}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--t3)", display: "block", marginBottom: 6 }}>
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={bDate}
                  onChange={e => { setBDate(e.target.value); setBTime(""); setSlots([]); }}
                  min={new Date().toISOString().split("T")[0]}
                  style={{ ...inputStyle, colorScheme: "dark" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--bdr)")}
                />
              </div>

              {/* Time */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--t3)", display: "block", marginBottom: 6 }}>
                  Preferred Time
                </label>
                <select
                  value={bTime}
                  onChange={e => setBTime(e.target.value)}
                  style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--bdr)")}
                >
                  <option value="" style={{ background: "#1a1d2e" }}>{slotLoading ? "Loading slots..." : "Select time slot..."}</option>
                  {slots.map(slot => (
                    <option key={slot.start} value={slot.start} style={{ background: "#1a1d2e" }}>
                      {new Date(slot.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </option>
                  ))}
                </select>
                {!slotLoading && bDoctor && bDate && slots.length === 0 && (
                  <p style={{ fontSize: 11, color: "#fca5a5", marginTop: 5 }}>No available slots for this date</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--t3)", display: "block", marginBottom: 6 }}>
                  Reason / Notes (optional)
                </label>
                <textarea
                  value={bNotes}
                  onChange={e => setBNotes(e.target.value)}
                  placeholder="Describe your symptoms or reason for visit..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    height: "auto",
                    padding: "12px 14px",
                    resize: "none",
                    lineHeight: 1.5,
                  }}
                  onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--bdr)")}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                onClick={resetBookingForm}
                style={{
                  flex: 1, height: 46, borderRadius: 10,
                  border: "1px solid var(--bdr)", background: "transparent",
                  color: "var(--t2)", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={bookAppointment}
                disabled={booking}
                style={{
                  flex: 2, height: 46, borderRadius: 10, border: "none",
                  background: booking ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#6366f1)",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: booking ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {booking ? (
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                ) : (
                  <Calendar size={15} />
                )}
                {booking ? "Saving..." : rescheduling ? "Confirm Reschedule" : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
