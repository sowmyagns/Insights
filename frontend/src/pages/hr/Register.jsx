import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../api";

const ROLES = [
  { value: "employee", label: "Employee" },
  { value: "hr", label: "HR Manager" },
  { value: "admin", label: "Admin" },
];

export default function Register({ onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("employee");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.signup(name, email, password, role);
      login(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-page" style={{ maxWidth: 480, paddingTop: 40, paddingBottom: 40 }}>
      <div className="ui-card" style={{ padding: "32px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-primary)", letterSpacing: "-0.02em" }}>Insights Iva</div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>Human Resources Platform</div>
        </div>

        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>Create Account</h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--color-text-muted)" }}>Register to get started with HRMS</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="ui-label">Full Name</label>
            <input className="ui-input" type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="ui-label">Email</label>
            <input className="ui-input" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="ui-label">Role</label>
            <select className="ui-select" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="ui-label">Password</label>
            <div style={{ position: "relative" }}>
              <input className="ui-input" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPassword((p) => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-muted)" }} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--color-danger-soft)", color: "var(--color-danger)", fontSize: 13, border: "1px solid var(--color-danger-soft)" }}>{error}</div>
          )}

          <button type="submit" className="ui-btn-primary ui-btn--block" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--color-text-muted)" }}>
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontWeight: 600, fontSize: 13 }}>
            Login
          </button>
        </p>
      </div>
    </div>
  );
}
