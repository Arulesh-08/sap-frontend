import { useState } from "react";
import { getItem, setItem, removeItem, storageAvailable } from "../utils/storage.js";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import { loginUser } from "../api/auth.js";
import KecLogo from "../components/KecLogo.jsx";
import itParkBg from "../assets/it_park.webp";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await loginUser(form);
      setItem("token", result.token);
      setItem("user", JSON.stringify(result.user));

      navigate(result.user.role === "student" ? "/dashboard" : "/approver");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {!storageAvailable && (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#b91c1c", color: "#fff", textAlign: "center",
        padding: "10px 16px", fontSize: "0.85rem", fontWeight: 600
      }}>
        ⚠️ Your browser is blocking storage access. Please disable Private/Incognito mode or allow storage for this site to use the portal.
      </div>
    )}
    <div className="auth-wrapper" style={{ backgroundImage: `url(${itParkBg})` }}>
      <div className="auth-card-wrapper">
        <div className="auth-header">
          <KecLogo size={56} />
          <h2 className="auth-title">SAP Points Portal</h2>
          <p className="auth-subtitle">Kongu Engineering College Official Activity Verification System</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>College Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="e.g. student@kongu.edu"
              value={form.email}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label style={{ margin: 0 }}>Password</label>
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot Password?
              </Link>
            </div>
            <PasswordInput
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-auth-submit">
            {loading ? "Logging in..." : "Secure Login →"}
          </button>

          <p className="auth-footer-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}