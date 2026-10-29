import { useState, useMemo } from "react";
import { getItem, setItem, removeItem, storageAvailable } from "../utils/storage.js";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import { registerUser } from "../api/auth.js";
import KecLogo from "../components/KecLogo.jsx";
import itParkBg from "../assets/it_park.webp";

// Returns { score: 0-4, label, color } for the given password string
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "#334155" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { label: "Too short", color: "#ef4444" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#eab308" },
    { label: "Good", color: "#22c55e" },
    { label: "Strong", color: "#10b981" },
  ];
  return { score, ...levels[score] };
}

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

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side strength gate — mirrors server rule
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/\d/.test(form.password)) {
      setError("Password must contain at least one number.");
      return;
    }

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
    <div className="auth-wrapper" style={{ backgroundImage: `url(${itParkBg})` }}>
      <div className="auth-card-wrapper wide-auth">
        <div className="auth-header">
          <KecLogo size={56} />
          <h2 className="auth-title">Create SAP Portal Account</h2>
          <p className="auth-subtitle">Register as a Student. Faculty accounts are created by the Admin.</p>
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
              <PasswordInput
                name="password"
                placeholder="Min 8 chars + 1 number"
                value={form.password}
                onChange={handleChange}
                required
              />
              {/* Password strength meter */}
              {form.password && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        style={{
                          flex: 1,
                          height: "4px",
                          borderRadius: "2px",
                          background: strength.score >= seg ? strength.color : "#334155",
                          transition: "background 0.3s ease",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: strength.color, fontWeight: 600 }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Select Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="form-input" disabled>
                <option value="student">Student</option>
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

          <div className="form-grid-2">
            <div className="form-group">
              <label>Year of Study</label>
              <select name="year" value={form.year || 2} onChange={handleChange} className="form-input">
                <option value={1}>1st Year (I Year)</option>
                <option value={2}>2nd Year (II Year)</option>
                <option value={3}>3rd Year (III Year)</option>
                <option value={4}>4th Year (IV Year)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Class Section</label>
              <select name="section" value={form.section || "A"} onChange={handleChange} className="form-input">
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
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
