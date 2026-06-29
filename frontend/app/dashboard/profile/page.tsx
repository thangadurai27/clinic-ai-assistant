"use client";
import { useState } from "react";
import { UserCircle, Phone, Mail, Save, Lock } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { authAPI, tokenManager, type User } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

const inputStyle: React.CSSProperties = {
  width: "100%", height: 46,
  background: "var(--card-bg2)",
  border: "1px solid var(--bdr)",
  borderRadius: 10,
  color: "#fff", fontSize: 14,
  padding: "0 14px", outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.08em", textTransform: "uppercase" as const,
  color: "var(--t3)", marginBottom: 6,
};

export default function ReceptionistProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(78,168,255,0.2)", borderTopColor: "var(--blue)", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return <ReceptionistProfileForm key={user.id} user={user} />;
}

function ReceptionistProfileForm({ user }: { user: User }) {
  const [fullName, setFullName] = useState(user.full_name || "");
  const [phone,    setPhone]    = useState(user.phone || "");
  const [oldPw,    setOldPw]    = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async () => {
    if (!fullName.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      await api.updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
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

  const initials = getInitials(user.full_name);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav title="My Profile" subtitle="Account & preferences" />

      <div className="page-enter" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        <div style={{ maxWidth: 580 }}>

          {/* Avatar card */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#14b8a6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff" }}>
              {initials}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                {user.full_name || "Receptionist"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 6 }}>{user.email}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(78,168,255,0.15)", color: "#4ea8ff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Receptionist
                </span>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <UserCircle size={16} style={{ color: "var(--blue)" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Personal Information</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "rgba(78,168,255,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--bdr)")} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <div style={{ position: "relative" }}>
                  <Phone size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }} />
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX"
                    style={{ ...inputStyle, paddingLeft: 34 }}
                    onFocus={e => (e.target.style.borderColor = "rgba(78,168,255,0.5)")}
                    onBlur={e  => (e.target.style.borderColor = "var(--bdr)")} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }} />
                  <input value={user.email} disabled style={{ ...inputStyle, paddingLeft: 34, opacity: 0.5, cursor: "not-allowed" }} />
                </div>
                <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>Email cannot be changed.</p>
              </div>
            </div>

            <button onClick={saveProfile} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 20, height: 44, padding: "0 20px", borderRadius: 10,
              border: "none",
              background: saving ? "rgba(78,168,255,0.4)" : "linear-gradient(135deg,#4ea8ff,#6366f1)",
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

          {/* Change Password */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Lock size={16} style={{ color: "var(--blue)" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Change Password</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="••••••••" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "rgba(78,168,255,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--bdr)")} />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Minimum 8 characters" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "rgba(78,168,255,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--bdr)")} />
              </div>
            </div>

            <button onClick={savePassword} disabled={savingPw} style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 20, height: 44, padding: "0 20px", borderRadius: 10,
              border: "1px solid rgba(78,168,255,0.3)",
              background: "rgba(78,168,255,0.08)",
              color: "#4ea8ff", fontSize: 13, fontWeight: 700,
              cursor: savingPw ? "not-allowed" : "pointer",
            }}>
              {savingPw ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(78,168,255,0.3)", borderTopColor: "#4ea8ff", animation: "spin 0.7s linear infinite" }} /> : <Lock size={14} />}
              {savingPw ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
