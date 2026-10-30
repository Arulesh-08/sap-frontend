import { useState } from "react";
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
  const [showConfigModal, setShowConfigModal] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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
            `Access restricted: "${email}" is not an authorized domain. Please sign in with an official @kongu.edu (Students) or @kongu.ac.in (Faculty/Staff) account.`
          );
        }
        return;
      }

      if (onSuccess) {
        onSuccess(token);
      }
    } catch (err) {
      if (onError) onError(err.message || "Google sign-in verification failed.");
    }
  };

  const handleGoogleError = () => {
    if (onError) {
      onError("Google sign-in was cancelled or encountered an error. Please try again.");
    }
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
        /* Fallback styled button if VITE_GOOGLE_CLIENT_ID is not configured yet */
        <button
          type="button"
          className="btn-google-custom"
          onClick={() => setShowConfigModal(true)}
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

      {/* Guidance Modal when Client ID needs configuration */}
      {showConfigModal && (
        <div className="google-modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="google-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.5rem" }}>🔐</span>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Google OAuth Setup Required</h3>
              </div>
              <button
                type="button"
                className="google-modal-close"
                onClick={() => setShowConfigModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="google-modal-body">
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                To enable 1-click Google Sign-In for students and faculty, please add your Google OAuth Client ID to your frontend environment configuration:
              </p>
              <div className="code-snippet-box">
                <code>VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com</code>
              </div>
              <div style={{ marginTop: "16px", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                <strong>Allowed Domains:</strong>
                <ul style={{ paddingLeft: "20px", marginTop: "6px" }}>
                  <li><code>@kongu.edu</code> — Auto-logs in students with their SAP profiles.</li>
                  <li><code>@kongu.ac.in</code> — Authenticates registered faculty and advisors.</li>
                </ul>
              </div>
            </div>
            <div className="google-modal-footer">
              <button
                type="button"
                className="btn-modal-action"
                onClick={() => setShowConfigModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
