import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPendingActivities, getAllActivities, reviewActivity } from "../api/points.js";
import KecLogo from "../components/KecLogo.jsx";
import CertificateModal from "../components/CertificateModal.jsx";
import ChangePasswordModal from "../components/ChangePasswordModal.jsx";

const CATEGORIES = [
  "1. Paper/Poster/Project Presentation",
  "2. Techno Managerial Events / Hackathon / Ideathon",
  "3. Sports & Games",
  "4. Membership & Social Activities",
  "5. Leadership/Organizing Events",
  "6. Non-Credit Value-Added Course/IPT",
  "7. Project to paper/Patent/Product Copyright",
  "8. GATE/CAT/Govt. Exams / Placement",
];

export default function ApproverDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [activitiesList, setActivitiesList] = useState([]);
  const [analytics, setAnalytics] = useState({
    mentorApprovedCount: 0,
    advisorApprovedCount: 0,
    hodApprovedCount: 0,
    totalEntries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [statusTab, setStatusTab] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [reviewInputs, setReviewInputs] = useState({});
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [activeModalActivity, setActiveModalActivity] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role === "student") {
      navigate("/dashboard");
      return;
    }

    setUser(parsedUser);
    fetchActivities("pending");
    fetchAnalytics();
  }, []);

  const fetchActivities = async (tab) => {
    setLoading(true);
    setLoadError("");
    try {
      const data = tab === "all" ? await getAllActivities() : await getPendingActivities();
      setActivitiesList(data);

      const initialInputs = {};
      data.forEach((item) => {
        initialInputs[item.activityId] = {
          pointsApproved: item.pointsApproved || item.pointsClaimed,
          remarks: item.remarks || "",
        };
      });
      setReviewInputs(initialInputs);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://sap-backend-1.onrender.com/api/points/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTabChange = (newTab) => {
    setStatusTab(newTab);
    fetchActivities(newTab);
  };

  const handleInputChange = (activityId, field, value) => {
    setReviewInputs((prev) => ({
      ...prev,
      [activityId]: { ...prev[activityId], [field]: value },
    }));
  };

  const handleReview = async (item, status) => {
    setActionError("");
    setActionSuccess("");
    const inputs = reviewInputs[item.activityId] || {};

    try {
      await reviewActivity(item.studentId, item.activityId, {
        status,
        pointsApproved: status === "approved" ? Number(inputs.pointsApproved || item.pointsClaimed) : 0,
        remarks: inputs.remarks || "",
      });

      const nextStep =
        user.role === "mentor"
          ? "Forwarded to Class Advisor for Stage 2 Review"
          : user.role === "advisor"
            ? "Forwarded to HOD for Final Stage 3 Verification"
            : "OFFICIALLY VERIFIED & APPROVED WITH UNIQUE SEAL!";

      setActionSuccess(`Activity for ${item.studentName} marked as ${status.toUpperCase()}! ${nextStep}`);

      fetchActivities(statusTab);
      fetchAnalytics();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleRevoke = async (item) => {
    setActionError("");
    const confirmed = window.confirm(
      `Revoke verification for ${item.studentName}'s "${item.title}"? This will remove their approved points.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `https://sap-backend-1.onrender.com/api/points/${item.studentId}/activity/${item.activityId}/revoke`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ remarks: "Revoked after re-review" }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Revoke failed");

      fetchActivities(statusTab);
      fetchAnalytics();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const roleTitle =
    user.role === "hod"
      ? "Head of Department (HOD)"
      : user.role === "advisor"
        ? "Class Advisor"
        : "Faculty Mentor";

  const stageNumber = user.role === "mentor" ? "1" : user.role === "advisor" ? "2" : "3";

  const filteredList = activitiesList.filter((item) => {
    if (categoryFilter === "All") return true;
    return item.category === categoryFilter;
  });

  return (
    <div className="portal-wrapper">
      {/* Top Header */}
      <header className="portal-header">
        <div className="header-left">
          <KecLogo size={44} />
        </div>
        <div className="header-right">
          <div className="user-badge">
            <span className="user-name">{user.name}</span>
            <span className="user-detail">{roleTitle} • Dept: {user.department}</span>
          </div>
          <button className="btn-change-password" onClick={() => setShowChangePassword(true)}>
            🔑 Change Password
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Ultra-Wide Content */}
      <main className="portal-main">
        {/* Banner */}
        <section className="welcome-banner approver-banner">
          <div>
            <div className="role-tag-pill">Stage {stageNumber}: {roleTitle} Approval Console</div>
            <h2>Sequential 3-Tier Verification: 1st Mentor → 2nd Class Advisor → 3rd HOD</h2>
            <p>Order Enforced: Review attached certificates (Photo or PDF) and verify points for your stage.</p>
          </div>
        </section>

        {actionError && <div className="alert alert-error">{actionError}</div>}
        {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}

        {/* Analytics & Counts Row */}
        <section className="stats-grid">
          <div className="stat-card gold">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-label">Total SAP Entries</span>
              <span className="stat-value">{analytics.totalEntries}</span>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">👨‍🏫</div>
            <div className="stat-info">
              <span className="stat-label">Mentor Approved Count</span>
              <span className="stat-value">{analytics.mentorApprovedCount} <span className="stat-denom">entries</span></span>
            </div>
          </div>

          <div className="stat-card blue">
            <div className="stat-icon">📑</div>
            <div className="stat-info">
              <span className="stat-label">Advisor Approved Count</span>
              <span className="stat-value">{analytics.advisorApprovedCount} <span className="stat-denom">entries</span></span>
            </div>
          </div>

          <div className="stat-card emerald">
            <div className="stat-icon">🏛️</div>
            <div className="stat-info">
              <span className="stat-label">HOD Verified Count</span>
              <span className="stat-value">{analytics.hodApprovedCount} <span className="stat-denom">entries</span></span>
            </div>
          </div>
        </section>

        {/* Table Container Card */}
        <section className="glass-card full-width-card">
          <div className="card-header flex-between flex-wrap">
            <div>
              <h3>Stage {stageNumber} ({roleTitle}) Pending Submissions Queue</h3>
              <span className="card-subtitle">Inspect certificate proof files and click approve to pass to the next stage</span>
            </div>

            {/* View Mode Switcher */}
            <div className="tab-switcher">
              <button
                className={`switch-btn ${statusTab === "pending" ? "active" : ""}`}
                onClick={() => handleTabChange("pending")}
              >
                My Stage Queue ({activitiesList.length})
              </button>
              <button
                className={`switch-btn ${statusTab === "all" ? "active" : ""}`}
                onClick={() => handleTabChange("all")}
              >
                All Submissions Overview
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="category-tabs">
            <button
              className={`tab-btn ${categoryFilter === "All" ? "active" : ""}`}
              onClick={() => setCategoryFilter("All")}
            >
              All Categories ({activitiesList.length})
            </button>
            {CATEGORIES.map((cat) => {
              const catCount = activitiesList.filter((a) => a.category === cat).length;
              return (
                <button
                  key={cat}
                  className={`tab-btn ${categoryFilter === cat ? "active" : ""}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat.substring(0, 18)}... ({catCount})
                </button>
              );
            })}
          </div>

          {loading && <p className="loading-state">Loading submissions queue...</p>}
          {loadError && <div className="alert alert-error">{loadError}</div>}

          {!loading && filteredList.length === 0 && (
            <div className="empty-state">
              <p>No pending submissions waiting for {roleTitle} review at this stage.</p>
            </div>
          )}

          {!loading && filteredList.length > 0 && (
            <div className="table-responsive">
              <table className="custom-table approver-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Category & Activity Title</th>
                    <th>Claimed</th>
                    <th>Certificate Proof</th>
                    <th>Points Approved</th>
                    <th>Remarks</th>
                    <th>Approval Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => {
                    const isMyStage = item.currentStage === user.role;
                    const isCompleted = item.currentStage === "completed";

                    return (
                      <tr key={item.activityId} className={isCompleted ? "row-approved" : ""}>
                        {/* Student Details */}
                        <td>
                          <div className="student-info-cell">
                            <strong>{item.studentName}</strong>
                            <span className="sub-text">Roll: {item.rollNumber || "N/A"}</span>
                            <span className="sub-text">Dept: {item.department}</span>
                          </div>
                        </td>

                        {/* Category & Title */}
                        <td>
                          <span className="category-chip">{item.category}</span>
                          <div className="title-text">{item.title}</div>
                        </td>

                        {/* Claimed */}
                        <td>
                          <strong>{item.pointsClaimed}</strong> pts
                        </td>

                        {/* Proof Modal */}
                        <td>
                          {item.proofUrl ? (
                            <button
                              className="btn-view-proof"
                              onClick={() => setActiveModalActivity(item)}
                            >
                              🔍 View Proof (PDF/Photo)
                            </button>
                          ) : (
                            <span className="no-proof">No File Uploaded</span>
                          )}
                        </td>

                        {/* Points Approved Input */}
                        <td>
                          {isMyStage ? (
                            <input
                              type="number"
                              min="0"
                              className="inline-number-input"
                              value={reviewInputs[item.activityId]?.pointsApproved ?? item.pointsClaimed}
                              onChange={(e) =>
                                handleInputChange(item.activityId, "pointsApproved", e.target.value)
                              }
                            />
                          ) : (
                            <strong className="approved-pts">{item.pointsApproved} pts</strong>
                          )}
                        </td>

                        {/* Remarks Input */}
                        <td>
                          {isMyStage ? (
                            <input
                              type="text"
                              className="inline-text-input"
                              placeholder="Optional remarks"
                              value={reviewInputs[item.activityId]?.remarks || ""}
                              onChange={(e) =>
                                handleInputChange(item.activityId, "remarks", e.target.value)
                              }
                            />
                          ) : (
                            <span className="sub-text">{item.remarks || "—"}</span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td>
                          {isMyStage ? (
                            <div className="action-button-group">
                              <button
                                className="btn-approve"
                                onClick={() => handleReview(item, "approved")}
                              >
                                ✔ Approve ({user.role.toUpperCase()})
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => handleReview(item, "rejected")}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          ) : isCompleted ? (
                            <div className="verified-seal-badge">
                              <span className="verified-icon">✔</span>
                              <div className="verified-text">
                                <span className="v-status">OFFICIALLY VERIFIED</span>
                                <span className="v-code">{item.verificationCode || "KEC-VERIFIED"}</span>
                              </div>
                              <button
                                className="btn-reject"
                                style={{ marginLeft: 8 }}
                                onClick={() => handleRevoke(item)}
                              >
                                Revoke
                              </button>
                            </div>
                          ) : (
                            <span className="status-pill status-pending">
                              ⌛ Pending {(item.currentStage || "mentor").toUpperCase()} Stage
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Certificate Modal */}
      {activeModalActivity && (
        <CertificateModal
          activity={activeModalActivity}
          onClose={() => setActiveModalActivity(null)}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
}
