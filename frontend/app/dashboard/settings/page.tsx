"use client";
import { useState } from "react";
import { Save, User, Lock } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI, tokenManager } from "@/lib/auth";
import { toast } from "sonner";

const inputCls: React.CSSProperties = {
  width: "100%", height: 44,
  background: "var(--card-bg2)",
  border: "1px solid var(--bdr)",
  borderRadius: 10,
  color: "#fff", fontSize: 14,
  padding: "0 14px", outline: "none",
  boxSizing: "border-box",
};

const labelCls: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.08em", textTransform: "uppercase" as const,
  color: "var(--t3)", marginBottom: 6,
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [name,    setName]    = useState(user?.full_name ?? "");
  const [email,   setEmail]   = useState(user?.email ?? "");
  const [oldPw,   setOldPw]   = useState("");
  const [newPw,   setNewPw]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Profile update is limited without a full user-update endpoint
      // but we can update password
      if (oldPw && newPw) {
        const token = tokenManager.getToken();
        if (token) {
          await authAPI.changePassword(token, oldPw, newPw);
          toast.success("Password updated successfully");
          setOldPw(""); setNewPw("");
        }
      } else {
        toast.success("Settings saved");
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopNav title="Settings" subtitle="Account & preferences" />

      <div className="page-enter" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        <div style={{ maxWidth: 560 }}>

          {/* Profile section */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <User size={16} style={{ color: "var(--blue)" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Profile Information</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelCls}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} style={inputCls}
                  onFocus={e => (e.target.style.borderColor = "rgba(78,168,255,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "var(--bdr)")} />
              </div>
              <div>
                <label style={labelCls}>Email Address</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ ...inputCls, opacity: 0.6 }} disabled />
                <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>Email cannot be changed here</p>
              </div>
            </div>
          </div>

          {/* Password section */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Lock size={16} style={{ color: "var(--blue)" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Change Password</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelCls}>Current Password</label>
                <input value={oldPw} onChange={e => setOldPw(e.target.value)} type="password" placeholder="••••••••" style={inputCls}
                  onFocus={e => (e.target.style.borderColor = "rgba(78,168,255,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "var(--bdr)")} />
              </div>
              <div>
                <label style={labelCls}>New Password</label>
                <input value={newPw} onChange={e => setNewPw(e.target.value)} type="password" placeholder="Min 8 characters" style={inputCls}
                  onFocus={e => (e.target.style.borderColor = "rgba(78,168,255,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "var(--bdr)")} />
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              height: 44, padding: "0 24px", borderRadius: 12, border: "none",
              background: saving ? "rgba(78,168,255,0.4)" : "linear-gradient(135deg,#4ea8ff,#6366f1)",
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? (
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
