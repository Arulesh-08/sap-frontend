import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifyReset, resetPassword } from "../api/auth.js";
import KecLogo from "../components/KecLogo.jsx";
import itParkBg from "../assets/it_park.webp";

// Two-step flow:
// Step 1 — student enters roll number + registered email; backend verifies they
//           match, returns a short-lived token (valid 10 min).
// Step 2 — student sets a new password; token is consumed and cleared server-side.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Held in component state only — never persisted to localStorage
  const [resetSession, setResetSession] = useState(null); // { token, userId }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isStaff = email.toLowerCase().trim().endsWith("@kongu.ac.in");

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await verifyReset({
        rollNumber: isStaff ? "" : rollNumber.trim(),
        email: email.trim(),
      });
      setResetSession({ token: result.token, userId: result.userId });
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({
        userId: resetSession.userId,
        token: resetSession.token,
        newPassword,
      });
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ backgroundImage: `url(${itParkBg})` }}>
      <div className="auth-card-wrapper">
        <div className="auth-header">
          <KecLogo size={56} />
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">
            {step === 1
              ? "Verify your identity using your roll number and registered email"
              : "Choose a new password for your account"}
          </p>
        </div>

        {step === 1 && (
          <form className="auth-form" onSubmit={handleVerify}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Registered College Email</label>
              <input
                type="email"
                placeholder="e.g. student@kongu.edu or staff@kongu.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>

            {!isStaff && (
              <div className="form-group">
                <label>Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. 22IT011"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required={!isStaff}
                  className="form-input"
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-auth-submit">
              {loading ? "Verifying..." : "Verify Identity →"}
            </button>

            <p className="auth-footer-link">
              Remembered it? <Link to="/login">Back to Login</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form className="auth-form" onSubmit={handleReset}>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <button type="submit" disabled={loading || !!success} className="btn-auth-submit">
              {loading ? "Resetting..." : "Reset Password →"}
            </button>

            <p className="auth-footer-link">
              <button
                type="button"
                className="btn-link"
                onClick={() => { setStep(1); setError(""); setResetSession(null); }}
              >
                ← Start over
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
