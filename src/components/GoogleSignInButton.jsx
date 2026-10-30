import { useState, useEffect } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

// Helper to decode JWT token in browser without external dependencies
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function GoogleSignInButton({ onSuccess, onError, loading = false }) {
  const [clientId, setClientId] = useState(() => {
    return (
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      localStorage.getItem("VITE_GOOGLE_CLIENT_ID") ||
      ""
    );
  });

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("email"); // "email" or "clientId"
  const [inputEmail, setInputEmail] = useState("");
  const [inputClientId, setInputClientId] = useState(clientId);
  const [validationError, setValidationError] = useState("");

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      if (!token) {
        if (onError) onError("Failed to obtain Google login credentials.");
        return;
      }

      // Pre-validate domain on client for immediate, friendly UX
      const payload = parseJwt(token);
      const email = (payload?.email || "").toLowerCase().trim();

      const isAllowedDomain =
        email.endsWith("@kongu.edu") || email.endsWith("@kongu.ac.in");

      if (!isAllowedDomain) {
        if (onError) {
          onError(
            `Access restricted: "${email}" is not an authorized college domain. Please choose an official @kongu.edu (Students) or @kongu.ac.in (Faculty/Staff) account.`
          );
        }
        return;
      }

      if (onSuccess) {
        onSuccess({ credential: token });
      }
    } catch (err) {
      if (onError) onError(err.message || "Google sign-in verification failed.");
    }
  };

  const handleGoogleError = () => {
    if (onError) {
      onError("Google sign-in encountered an error or was cancelled. Please try again.");
    }
  };

  // Handle direct college email sign-in / verification
  const handleDirectEmailSubmit = (e) => {
    e.preventDefault();
    setValidationError("");
    const cleanEmail = (inputEmail || "").toLowerCase().trim();

    if (!cleanEmail) {
      setValidationError("Please enter your college email address.");
      return;
    }

    const isStudentDomain = cleanEmail.endsWith("@kongu.edu");
    const isFacultyDomain = cleanEmail.endsWith("@kongu.ac.in");

    if (!isStudentDomain && !isFacultyDomain) {
      setValidationError("Only @kongu.edu (Students) and @kongu.ac.in (Faculty/Staff) email domains are allowed.");
      return;
    }

    setShowModal(false);
    if (onSuccess) {
      onSuccess({ email: cleanEmail });
    }
  };

  // Handle saving Google OAuth Client ID
  const handleSaveClientId = (e) => {
    e.preventDefault();
    setValidationError("");
    const trimmedId = (inputClientId || "").trim();
    if (!trimmedId) {
      setValidationError("Please enter a valid Google Client ID.");
      return;
    }
    localStorage.setItem("VITE_GOOGLE_CLIENT_ID", trimmedId);
    setClientId(trimmedId);
    setShowModal(false);
  };

  return (
    <div className="google-auth-section">
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <div className="google-btn-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              shape="rectangular"
              theme="outline"
              size="large"
              text="continue_with"
              width="360"
              locale="en"
            />
          </div>
        </GoogleOAuthProvider>
      ) : (
        /* Styled Google button that opens the College Sign-In / Account dialog */
        <button
          type="button"
          className="btn-google-custom"
          onClick={() => {
            setValidationError("");
            setShowModal(true);
          }}
          disabled={loading}
          title="Sign in with official Google Account (@kongu.edu / @kongu.ac.in)"
        >
          <svg className="google-logo-svg" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span className="google-btn-text">Sign in with Google</span>
          <span className="google-domain-pill">@kongu.edu / .ac.in</span>
        </button>
      )}

      {/* College Sign-In / Setup Modal */}
      {showModal && (
        <div className="google-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="google-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Sign in with Google</h3>
              </div>
              <button
                type="button"
                className="google-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Tab navigation */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              <button
                type="button"
                onClick={() => { setActiveTab("email"); setValidationError(""); }}
                style={{
                  background: activeTab === "email" ? "rgba(0, 200, 151, 0.15)" : "transparent",
                  color: activeTab === "email" ? "var(--primary-emerald)" : "var(--text-muted)",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign in with College Account
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("clientId"); setValidationError(""); }}
                style={{
                  background: activeTab === "clientId" ? "rgba(0, 200, 151, 0.15)" : "transparent",
                  color: activeTab === "clientId" ? "var(--primary-emerald)" : "var(--text-muted)",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Connect Google Client ID
              </button>
            </div>

            {validationError && (
              <div className="alert alert-error" style={{ marginBottom: "14px", fontSize: "0.82rem" }}>
                {validationError}
              </div>
            )}

            {activeTab === "email" ? (
              <form onSubmit={handleDirectEmailSubmit}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.5 }}>
                  Enter your official college Google account. If your account is already registered, you will be logged in immediately. Otherwise, you will be guided to sign up.
                </p>

                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>College Email Address</label>
                  <input
                    type="email"
                    placeholder="student@kongu.edu or faculty@kongu.ac.in"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    required
                    className="form-input"
                    autoFocus
                  />
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Only <strong>@kongu.edu</strong> (Students) and <strong>@kongu.ac.in</strong> (Faculty) are accepted.
                  </span>
                </div>

                <div className="google-modal-footer">
                  <button type="submit" className="btn-modal-action">
                    Verify & Continue →
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveClientId}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.5 }}>
                  Paste your Google Cloud OAuth Web Client ID below to enable Google's live one-click sign-in button:
                </p>

                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Google OAuth Client ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                    value={inputClientId}
                    onChange={(e) => setInputClientId(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>

                <div className="google-modal-footer">
                  <button type="submit" className="btn-modal-action">
                    Save & Activate Live Button
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
