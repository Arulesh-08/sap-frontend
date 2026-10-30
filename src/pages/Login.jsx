import { useState } from "react";
import { getItem, setItem, removeItem, storageAvailable } from "../utils/storage.js";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput.jsx";
import { loginUser, loginWithGoogle } from "../api/auth.js";
import KecLogo from "../components/KecLogo.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import itParkBg from "../assets/it_park.webp";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLoginSuccess = (result) => {
    setItem("token", result.token);
    setItem("user", JSON.stringify(result.user));

    const role = result.user.role;
    if (role === "student") {
      navigate("/dashboard");
    } else if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/approver");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await loginUser(form);
      handleLoginSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (data) => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(data);
      handleLoginSuccess(result);
    } catch (err) {
      if (err.notRegistered) {
        setError(`⚠️ ${err.message || "Account not registered yet. Redirecting to sign up..."}`);
        setTimeout(() => {
          navigate(
            `/register?email=${encodeURIComponent(err.email || "")}&name=${encodeURIComponent(err.name || "")}`
          );
        }, 1500);
      } else {
        setError(err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (errMsg) => {
    setError(errMsg);
  };

  return (
    <>
      {!storageAvailable && (
        <div className="storage-alert-banner">
          ⚠️ Your browser is blocking storage access. Please disable Private/Incognito mode or allow storage for this site to use the portal.
        </div>
      )}

      <div className="auth-wrapper" style={{ backgroundImage: `url(${itParkBg})` }}>
        {/* Floating Theme Switcher */}
        <div className="auth-theme-switch-container">
          <ThemeToggle />
        </div>

        <div className="auth-card-wrapper">
          <div className="auth-header">
            <KecLogo size={52} />
            <h1 className="auth-title">SAP Points Portal</h1>
            <p className="auth-subtitle">Kongu Engineering College Official Activity Verification System</p>
            
            {/* Allowed Domain Indicators */}
            <div className="domain-badge-group">
              <span className="domain-badge">
                <span className="domain-dot"></span>
                @kongu.edu
              </span>
              <span className="domain-badge">
                <span className="domain-dot"></span>
                @kongu.ac.in
              </span>
            </div>
          </div>

          {error && (
            <div className="alert alert-error auth-alert">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">{error}</span>
            </div>
          )}

          {/* Google Sign-In Option */}
          <div className="google-auth-block">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              loading={loading || googleLoading}
            />
            {googleLoading && (
              <p className="google-loading-hint">Signing in with Google account...</p>
            )}
          </div>

          <div className="auth-divider">
            <span>or sign in with email</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">College Email Address</label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="student@kongu.edu or faculty@kongu.ac.in"
                value={form.email}
                onChange={handleChange}
                required
                className="form-input"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot Password?
                </Link>
              </div>
              <PasswordInput
                id="login-password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-auth-submit"
            >
              {loading ? (
                <span className="btn-loading-flex">
                  <span className="spinner-mini"></span> Verifying...
                </span>
              ) : (
                "Secure Login →"
              )}
            </button>

            <div className="auth-footer-container">
              <p className="auth-footer-link">
                Don't have an account? <Link to="/register">Register here</Link>
              </p>
              <p className="auth-domain-footnote">
                Students use <strong>@kongu.edu</strong> • Faculty use <strong>@kongu.ac.in</strong>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
