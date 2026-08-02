import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitActivity, getMyPoints } from "../api/points.js";
import { downloadReport } from "../api/report.js";
import KecLogo from "../components/KecLogo.jsx";
import CertificateModal from "../components/CertificateModal.jsx";

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

function calculateSAPMark(points) {
  if (points >= 150) return 5;
  if (points >= 100) return 4;
  if (points >= 50) return 3;
  if (points >= 25) return 2;
  if (points >= 10) return 1;
  return 0;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    category: CATEGORIES[0],
    title: "",
    pointsClaimed: "",
  });
  const [certificate, setCertificate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const [record, setRecord] = useState({ activities: [], totalPointsApproved: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [activeModalActivity, setActiveModalActivity] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "student") {
      navigate("/approver");
      return;
    }

    setUser(parsedUser);
    loadPoints();
  }, []);

  const loadPoints = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await getMyPoints();
      setRecord(result);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append("category", form.category);
      data.append("title", form.title);
      data.append("pointsClaimed", form.pointsClaimed);
      if (certificate) data.append("certificate", certificate);

      await submitActivity(data);

      setSubmitSuccess("Activity certificate submitted for 3-tier approval (Mentor → Class Advisor → HOD)!");
      setForm({ category: CATEGORIES[0], title: "", pointsClaimed: "" });
      setCertificate(null);
      e.target.reset();

      loadPoints();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleDownload = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      await downloadReport(user.id, user.rollNumber);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!user) return null;

  const activities = record.activities || [];
  const totalApproved = record.totalPointsApproved || 0;
  const sapMark = calculateSAPMark(totalApproved);

  const filteredActivities =
    selectedCategoryFilter === "All"
      ? activities
      : activities.filter((a) => a.category === selectedCategoryFilter);

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
            <span className="user-detail">Roll: {user.rollNumber || "N/A"} • Dept: {user.department}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Full-Screen Layout */}
      <main className="portal-main">
        {/* Banner Section */}
        <section className="welcome-banner">
          <div>
            <h2>Student Activity Points (SAP) Dashboard</h2>
            <p>Sequential 3-Tier Approval Workflow: 1st Mentor → 2nd Class Advisor → 3rd HOD Verification</p>
          </div>
          <button className="btn-primary-pdf" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating PDF Sheet..." : "📥 Download SAP Evaluation Sheet (PDF)"}
          </button>
        </section>

        {downloadError && <div className="alert alert-error">{downloadError}</div>}

        {/* Stats Row */}
        <section className="stats-grid">
          <div className="stat-card gold">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <span className="stat-label">SAP Grade Mark</span>
              <span className="stat-value">{sapMark} <span className="stat-denom">/ 5</span></span>
            </div>
          </div>

          <div className="stat-card emerald">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <span className="stat-label">Total Approved Points</span>
              <span className="stat-value">{totalApproved} <span className="stat-denom">pts</span></span>
            </div>
          </div>

          <div className="stat-card blue">
            <div className="stat-icon">📁</div>
            <div className="stat-info">
              <span className="stat-label">Submissions</span>
              <span className="stat-value">{activities.length}</span>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="dashboard-layout">
          {/* Submission Form */}
          <section className="glass-card form-card">
            <div className="card-header">
              <h3>Submit Activity Certificate</h3>
              <span className="card-subtitle">Attach certificate (JPG, PNG, or PDF)</span>
            </div>

            {submitError && <div className="alert alert-error">{submitError}</div>}
            {submitSuccess && <div className="alert alert-success">{submitSuccess}</div>}

            <form onSubmit={handleSubmit} className="activity-form">
              <div className="form-group">
                <label>Category</label>
                <select name="category" value={form.category} onChange={handleChange} required className="form-input">
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Activity Title</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. IEEE Conference Paper / Hackathon 1st Prize"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Points Claimed</label>
                <input
                  type="number"
                  name="pointsClaimed"
                  placeholder="e.g. 50"
                  value={form.pointsClaimed}
                  onChange={handleChange}
                  required
                  min="1"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Certificate File (Photo or PDF)</label>
                <div className="file-upload-box">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setCertificate(e.target.files[0])}
                    id="certificate-file"
                  />
                  <span className="file-hint">
                    {certificate ? `Selected: ${certificate.name}` : "Upload JPG, PNG, or PDF Certificate"}
                  </span>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="btn-submit">
                {submitting ? "Submitting..." : "Submit for Mentor Review →"}
              </button>
            </form>
          </section>

          {/* Activities List Section */}
          <section className="glass-card table-card">
            <div className="card-header flex-between">
              <div>
                <h3>My SAP Format Sheet Submissions</h3>
                <span className="card-subtitle">Showing {filteredActivities.length} entries</span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="category-tabs">
              <button
                className={`tab-btn ${selectedCategoryFilter === "All" ? "active" : ""}`}
                onClick={() => setSelectedCategoryFilter("All")}
              >
                All Categories ({activities.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = activities.filter((a) => a.category === cat).length;
                return (
                  <button
                    key={cat}
                    className={`tab-btn ${selectedCategoryFilter === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategoryFilter(cat)}
                  >
                    {cat.substring(0, 20)}... ({count})
                  </button>
                );
              })}
            </div>

            {loading && <p className="loading-state">Loading activities...</p>}
            {loadError && <div className="alert alert-error">{loadError}</div>}

            {!loading && filteredActivities.length === 0 && (
              <div className="empty-state">
                <p>No activities submitted under this category yet.</p>
              </div>
            )}

            {!loading && filteredActivities.length > 0 && (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Title</th>
                      <th>Claimed</th>
                      <th>Proof</th>
                      <th>3-Tier Approval Pipeline</th>
                      <th>Status & Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((activity, idx) => {
                      const stage = activity.currentStage || "mentor";
                      const isCompleted = stage === "completed";

                      return (
                        <tr key={idx}>
                          <td>
                            <span className="category-chip">{activity.category}</span>
                          </td>
                          <td className="title-cell">{activity.title}</td>
                          <td><strong>{activity.pointsClaimed}</strong> pts</td>
                          <td>
                            {activity.proofUrl ? (
                              <button
                                className="btn-view-proof"
                                onClick={() => setActiveModalActivity(activity)}
                              >
                                📄 Certificate
                              </button>
                            ) : (
                              <span className="no-proof">No file</span>
                            )}
                          </td>
                          <td>
                            <div className="pipeline-steps">
                              <span className={`step-badge ${activity.mentorApproval?.status === "approved" ? "done" : stage === "mentor" ? "current" : ""}`}>
                                1. Mentor: {activity.mentorApproval?.status === "approved" ? "✔" : "⌛"}
                              </span>
                              <span className={`step-badge ${activity.advisorApproval?.status === "approved" ? "done" : stage === "advisor" ? "current" : ""}`}>
                                2. Advisor: {activity.advisorApproval?.status === "approved" ? "✔" : "⌛"}
                              </span>
                              <span className={`step-badge ${activity.hodApproval?.status === "approved" ? "done" : stage === "hod" ? "current" : ""}`}>
                                3. HOD: {activity.hodApproval?.status === "approved" ? "✔" : "⌛"}
                              </span>
                            </div>
                          </td>
                          <td>
                            {isCompleted ? (
                              <div className="verified-seal-badge">
                                <span className="verified-icon">✔</span>
                                <div className="verified-text">
                                  <span className="v-status">OFFICIALLY VERIFIED</span>
                                  <span className="v-code">{activity.verificationCode || "KEC-VERIFIED"}</span>
                                </div>
                              </div>
                            ) : stage === "rejected" ? (
                              <span className="status-pill status-rejected">✕ Rejected</span>
                            ) : (
                              <span className="status-pill status-pending">⌛ In Review ({stage.toUpperCase()})</span>
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
        </div>
      </main>

      {/* Certificate Modal */}
      {activeModalActivity && (
        <CertificateModal
          activity={activeModalActivity}
          onClose={() => setActiveModalActivity(null)}
        />
      )}
    </div>
  );
}
