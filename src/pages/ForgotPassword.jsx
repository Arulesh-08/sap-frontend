import { Link } from "react-router-dom";
import KecLogo from "../components/KecLogo.jsx";
import itParkBg from "../assets/it_park.webp";

// Self-service password reset has been disabled. It previously returned the
// reset token directly in the API response with no proof of email ownership,
// which was a real account-takeover risk. Password resets are now handled
// only by an admin, from the admin dashboard.
export default function ForgotPassword() {
  return (
    <div className="auth-wrapper" style={{ backgroundImage: `url(${itParkBg})` }}>
      <div className="auth-card-wrapper">
        <div className="auth-header">
          <KecLogo size={56} />
          <h2 className="auth-title">Forgot Password?</h2>
          <p className="auth-subtitle">
            Password resets are handled by your admin. Please reach out to your
            Class Advisor, HOD, or the SAP admin, and they'll reset your password
            for you from the admin dashboard.
          </p>
        </div>

        <p className="auth-footer-link">
          <Link to="/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
