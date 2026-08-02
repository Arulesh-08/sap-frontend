import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth.js";
import KecLogo from "../components/KecLogo.jsx";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    rollNumber: "",
    department: "Information Technology",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await registerUser(form);
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card-wrapper wide-auth">
        <div className="auth-header">
          <KecLogo size={56} />
          <h2 className="auth-title">Create SAP Portal Account</h2>
          <p className="auth-subtitle">Register as Student, Mentor, Class Advisor, or HOD</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="form-grid-2">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Dr. K. Ramesh / Student Name"
                value={form.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>College Email</label>
              <input
                type="email"
                name="email"
                placeholder="user@kongu.ac.in"
                value={form.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Select Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="form-input">
                <option value="student">Student</option>
                <option value="mentor">Faculty Mentor</option>
                <option value="advisor">Class Advisor</option>
                <option value="hod">Head of Department (HOD)</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            {form.role === "student" && (
              <div className="form-group">
                <label>Roll Number</label>
                <input
                  type="text"
                  name="rollNumber"
                  placeholder="e.g. 21ITR042"
                  value={form.rollNumber}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group" style={{ gridColumn: form.role !== "student" ? "span 2" : "auto" }}>
              <label>Department</label>
              <input
                type="text"
                name="department"
                placeholder="e.g. Information Technology"
                value={form.department}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-auth-submit">
            {loading ? "Registering..." : "Create Account →"}
          </button>

          <p className="auth-footer-link">
            Already registered? <Link to="/login">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
