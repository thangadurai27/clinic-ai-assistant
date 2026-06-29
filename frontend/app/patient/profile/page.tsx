"use client";

import { useCallback, useState } from "react";
import { UserCircle, Phone, Mail, Save, Lock, ShieldPlus, Image as ImageIcon } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { authAPI, tokenManager, type User } from "@/lib/auth";
import { useMountFetch } from "@/hooks/useMountFetch";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import type { PatientProfile } from "@/types";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  background: "var(--card-bg2)",
  border: "1px solid var(--bdr)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 14,
  padding: "0 14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--t3)",
  marginBottom: 6,
};

const emptyProfile = (user: User): PatientProfile => ({
  id: user.id,
  patient_id: user.id,
  name: user.full_name || "",
  full_name: user.full_name || "",
  email: user.email,
  phone: user.phone || "",
  preferred_channel: "web",
});

export default function PatientProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(124,58,237,0.2)", borderTopColor: "#a78bfa", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return <PatientProfileForm key={user.id} user={user} />;
}

function PatientProfileForm({ user }: { user: User }) {
  const [profile, setProfile] = useState<PatientProfile>(() => emptyProfile(user));
  const [oldPw,    setOldPw]    = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPatientProfile() as PatientProfile;
      setProfile({ ...emptyProfile(user), ...data });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useMountFetch(load, [load]);

  const setField = (field: keyof PatientProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    if (!profile.full_name?.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const updated = await api.updatePatientProfile({
        name: profile.full_name.trim(),
        phone: profile.phone?.trim(),
        preferred_channel: profile.preferred_channel,
        dob: profile.dob || undefined,
        gender: profile.gender || undefined,
        address: profile.address || undefined,
        emergency_contact: profile.emergency_contact || undefined,
        medical_history: profile.medical_history || undefined,
        allergies: profile.allergies || undefined,
        profile_photo: profile.profile_photo || undefined,
      }) as PatientProfile;
      setProfile(updated);
      toast.success("Profile updated successfully");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!oldPw || !newPw) { toast.error("Enter both current and new password"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      const token = tokenManager.getToken();
      if (!token) throw new Error("Not authenticated");
      await authAPI.changePassword(token, oldPw, newPw);
      toast.success("Password changed successfully");
      setOldPw(""); setNewPw("");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  const initials = getInitials(profile.full_name || user.full_name);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav title="My Profile" subtitle="Manage your health portal details" onRefresh={load} loading={loading} />

      <div className="page-enter" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--bdr)",
            borderRadius: 16,
            padding: "24px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              backgroundImage: profile.profile_photo ? `url(${profile.profile_photo})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "#fff",
            }}>
              {!profile.profile_photo && initials}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                {profile.full_name || "Patient"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 4 }}>{profile.email}</p>
              <span style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(124,58,237,0.2)",
                color: "#a78bfa",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                Patient
              </span>
            </div>
          </div>

          <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <UserCircle size={16} style={{ color: "#a78bfa" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Personal Information</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={profile.full_name || ""} onChange={e => setField("full_name", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <div style={{ position: "relative" }}>
                  <Phone size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }} />
                  <input value={profile.phone || ""} onChange={e => setField("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" style={{ ...inputStyle, paddingLeft: 34 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }} />
                  <input value={profile.email || ""} disabled style={{ ...inputStyle, paddingLeft: 34, opacity: 0.5, cursor: "not-allowed" }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Preferred Channel</label>
                <select value={profile.preferred_channel || "web"} onChange={e => setField("preferred_channel", e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                  <option value="web" style={{ background: "#1a1d2e" }}>Web</option>
                  <option value="email" style={{ background: "#1a1d2e" }}>Email</option>
                  <option value="whatsapp" style={{ background: "#1a1d2e" }}>WhatsApp</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input type="date" value={profile.dob || ""} onChange={e => setField("dob", e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <input value={profile.gender || ""} onChange={e => setField("gender", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Address</label>
                <input value={profile.address || ""} onChange={e => setField("address", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Profile Photo URL</label>
                <div style={{ position: "relative" }}>
                  <ImageIcon size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }} />
                  <input value={profile.profile_photo || ""} onChange={e => setField("profile_photo", e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <ShieldPlus size={16} style={{ color: "#a78bfa" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Medical Details</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Emergency Contact</label>
                <input value={profile.emergency_contact || ""} onChange={e => setField("emergency_contact", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Medical History</label>
                <textarea value={profile.medical_history || ""} onChange={e => setField("medical_history", e.target.value)} rows={4} style={{ ...inputStyle, height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }} />
              </div>
              <div>
                <label style={labelStyle}>Allergies</label>
                <textarea value={profile.allergies || ""} onChange={e => setField("allergies", e.target.value)} rows={3} style={{ ...inputStyle, height: "auto", padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }} />
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
              height: 44,
              padding: "0 20px",
              borderRadius: 10,
              border: "none",
              background: saving ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#6366f1)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

          <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Lock size={16} style={{ color: "#a78bfa" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Change Password</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16 }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <button onClick={savePassword} disabled={savingPw} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
              height: 44,
              padding: "0 20px",
              borderRadius: 10,
              border: "none",
              background: savingPw ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.2)",
              color: "#a78bfa",
              fontSize: 13,
              fontWeight: 700,
              cursor: savingPw ? "not-allowed" : "pointer",
            }}>
              {savingPw ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(167,139,250,0.3)", borderTopColor: "#a78bfa", animation: "spin 0.7s linear infinite" }} /> : <Lock size={14} />}
              {savingPw ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
