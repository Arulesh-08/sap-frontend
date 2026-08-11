import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitActivity, getMyPoints, getCategories } from "../api/points.js";
import { downloadReport } from "../api/report.js";
import KecLogo from "../components/KecLogo.jsx";
import CertificateModal from "../components/CertificateModal.jsx";
import ChangePasswordModal from "../components/ChangePasswordModal.jsx";

function calculateSAPMark(points) {
  if (points >= 150) return 5;
  if (points >= 100) return 4;
  if (points >= 50) return 3;
  if (points >= 25) return 2;
  if (points >= 10) return 1;
  return 0;
}

const EMPTY_FORM = { category: "", type: "", tier: "", title: "" };

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Category -> Type -> Tier -> points, fetched from the backend. This drives the
  // cascading dropdowns below and is the ONLY source of point values in the UI —
  // the server computes the real points on submit, this is just for the live preview.
  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(true);
  const [structureError, setStructureError] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
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
  const [showChangePassword, setShowChangePassword] = useState(false);

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
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setStructureLoading(true);
    setStructureError("");
    try {
      const result = await getCategories();
      setStructure(result);
    } catch (err) {
      setStructureError(err.message);
    } finally {
      setStructureLoading(false);
    }
  };

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

  // Category list, in the exact order the backend defines them.
  const categoryOptions = structure ? Object.keys(structure) : [];
  const typeOptions =
    structure && form.category ? Object.keys(structure[form.category].types) : [];
  const tierOptions =
    structure && form.category && form.type
      ? Object.keys(structure[form.category].types[form.type])
      : [];
  const previewPoints =
    structure && form.category && form.type && form.tier
      ? structure[form.category].types[form.type][form.tier]
      : null;
  const categoryMax = structure && form.category ? structure[form.category].max : null;

  const handleCategoryChange = (e) => {
    // Changing the category invalidates whatever type/tier was picked, so clear both.
    setForm({ ...form, category: e.target.value, type: "", tier: "" });
  };

  const handleTypeChange = (e) => {
    setForm({ ...form, type: e.target.value, tier: "" });
  };

  const handleTierChange = (e) => {
    setForm({ ...form, tier: e.target.value });
  };

  const handleTitleChange = (e) => {
    setForm({ ...form, title: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!form.category || !form.type || !form.tier) {
      setSubmitError("Please select a Category, Type, and Tier.");
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append("category", form.category);
      data.append("type", form.type);
      data.append("tier", form.tier);
      data.append("title", form.title);
      // No pointsClaimed field — the server looks up the exact point value from
      // category/type/tier itself, so nothing here can be tampered with client-side.
      if (certificate) data.append("certificate", certificate);

      await submitActivity(data);

      setSubmitSuccess("Activity certificate submitted for 3-tier approval (Mentor → Class Advisor → HOD)!");
      setForm(EMPTY_FORM);
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

  // Tabs are built from whatever categories actually appear in the student's own
  // submissions, not from the point-structure keys — that way older entries (from
  // before a category was renamed/removed) never disappear from the filter list.
  const activityCategories = [...new Set(activities.map((a) => a.category))];

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
          <button className="btn-change-password" onClick={() => setShowChangePassword(true)}>
            🔑 Change Password
          </button>
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

            {structureError && (
              <div className="alert alert-error">
                Could not load activity categories: {structureError}{" "}
                <button type="button" className="btn-view-proof" onClick={loadCategories}>
                  Retry
                </button>
              </div>
            )}
            {submitError && <div className="alert alert-error">{submitError}</div>}
            {submitSuccess && <div className="alert alert-success">{submitSuccess}</div>}

            {structureLoading ? (
              <p className="loading-state">Loading activity categories...</p>
            ) : (
              <form onSubmit={handleSubmit} className="activity-form">
                <div className="form-group">
                  <label>Category{categoryMax !== null && ` (Max ${categoryMax} pts)`}</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleCategoryChange}
                    required
                    className="form-input"
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleTypeChange}
                    required
                    disabled={!form.category}
                    className="form-input"
                  >
                    <option value="" disabled>
                      {form.category ? "Select a type" : "Select a category first"}
                    </option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tier</label>
                  <select
                    name="tier"
                    value={form.tier}
                    onChange={handleTierChange}
                    required
                    disabled={!form.type}
                    className="form-input"
                  >
                    <option value="" disabled>
                      {form.type ? "Select a tier" : "Select a type first"}
                    </option>
                    {tierOptions.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </div>

                {previewPoints !== null && (
                  <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
                    This combination is worth <strong>{previewPoints} points</strong> (subject to approval).
                  </div>
                )}

                <div className="form-group">
                  <label>Activity Title</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="e.g. IEEE Conference Paper / Hackathon 1st Prize"
                    value={form.title}
                    onChange={handleTitleChange}
                    required
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
            )}
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
              {activityCategories.map((cat) => {
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

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
}
