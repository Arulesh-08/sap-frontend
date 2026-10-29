import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import KecLogo from "../components/KecLogo.jsx";
import SapStructureManager from "../components/SapStructureManager.jsx";
import { getItem, removeItem } from "../utils/storage.js";
import { getStudentSummary, downloadAdvisorSummaryPdf } from "../api/points.js";
import {
  downloadReport,
  getCategoryAnalytics,
  downloadCategoryPdf,
  downloadCategoryExcel,
  triggerFileDownload,
} from "../api/report.js";
import BASE_URL from "../api/config.js";

const calculateSAPMark = (points) => {
  if (points >= 150) return 5;
  if (points >= 100) return 4;
  if (points >= 50) return 3;
  if (points >= 25) return 2;
  if (points >= 10) return 1;
  return 0;
};

function authHeaders() {
  const token = getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("users"); // "users" | "summary" | "activities" | "sap"

  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters for users
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userYearFilter, setUserYearFilter] = useState("");
  const [userSectionFilter, setUserSectionFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Filters for activities
  const [activityYearFilter, setActivityYearFilter] = useState("");
  const [activitySectionFilter, setActivitySectionFilter] = useState("");

  // Class & Student Summary state
  const [summaryYear, setSummaryYear] = useState("2");
  const [summarySection, setSummarySection] = useState("A");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Category Reports state
  const [selectedReportCategory, setSelectedReportCategory] = useState("1. Paper/Poster/Project Presentation");
  const [reportYear, setReportYear] = useState("");
  const [reportSemester, setReportSemester] = useState("");
  const [reportSection, setReportSection] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportInsideOutside, setReportInsideOutside] = useState("all");
  const [reportIsNational, setReportIsNational] = useState("all");
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [categoryPdfDownloading, setCategoryPdfDownloading] = useState(false);
  const [categoryExcelDownloading, setCategoryExcelDownloading] = useState(false);
  const [studentReportDownloading, setStudentReportDownloading] = useState({});

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    rollNumber: "",
    department: "Information Technology",
    year: 2,
    section: "A",
    assignedClass: "",
  });
  const [renameInputs, setRenameInputs] = useState({});
  const [reviewInputs, setReviewInputs] = useState({});

  useEffect(() => {
    const storedUser = getItem("user");
    const token = getItem("token");
    if (!token || !storedUser) {
      navigate("/login");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "admin") {
      navigate("/login");
      return;
    }
    setUser(parsedUser);
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/admin/users`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/admin/all-activities`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setActivities(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (yr = summaryYear, sec = summarySection) => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await getStudentSummary(yr, sec);
      setSummary(data);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setError("");
    setSuccess("");
    if (t === "users") loadUsers();
    else if (t === "summary") loadSummary(summaryYear, summarySection);
    else if (t === "activities") loadActivities();
    else if (t === "reports") fetchCategoryReportData();
    // "sap" tab loads its own data internally
  };

  const fetchCategoryReportData = async (
    cat = selectedReportCategory,
    yr = reportYear,
    sem = reportSemester,
    sec = reportSection,
    stat = reportStatus,
    loc = reportInsideOutside,
    nat = reportIsNational
  ) => {
    setReportLoading(true);
    setReportError("");
    try {
      const data = await getCategoryAnalytics({
        category: cat,
        year: yr,
        semester: sem,
        section: sec,
        participationStatus: stat !== "all" ? stat : undefined,
        insideOrOutside: loc !== "all" ? loc : undefined,
        isNational: nat !== "all" ? nat : undefined,
      });
      setReportData(data);
    } catch (err) {
      setReportError(err.message || "Failed to load category analytics");
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!summary) return;
    const { categories, students } = summary;
    const SHORT = ["Paper Pres.", "Techno Mgr.", "Sports", "Membership",
      "Leadership", "Value-Added", "Project/Patent", "GATE/CAT"];
    const header = ["S.No", "Roll No.", "Name", "Email", "Class Year", "Section", "Class Advisor", ...SHORT, "Total Submissions", "SAP Mark (/5)"];
    const rows = students.map((s, idx) => {
      const mark = s.sapMark !== undefined ? s.sapMark : calculateSAPMark(s.totalPoints || 0);
      const yrRoman = s.year === 1 ? "I" : s.year === 2 ? "II" : s.year === 3 ? "III" : "IV";
      return [
        idx + 1,
        s.rollNumber,
        s.name,
        s.email || "",
        `${yrRoman} Year`,
        s.section || "A",
        s.advisor?.name || "Ms.Deenu Mol",
        ...categories.map((cat) => s.categoryCounts[cat] || 0),
        s.total,
        `${mark} / 5`,
      ];
    });
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    triggerFileDownload(blob, `SAP_Class_Summary_${Date.now()}.csv`, "text/csv");
  };

  const handleDownloadPdf = async () => {
    setPdfDownloading(true);
    try {
      await downloadAdvisorSummaryPdf(summaryYear, summarySection);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleDownloadCategoryPdfAction = async () => {
    setCategoryPdfDownloading(true);
    try {
      await downloadCategoryPdf({
        category: selectedReportCategory,
        year: reportYear,
        semester: reportSemester,
        section: reportSection,
        participationStatus: reportStatus !== "all" ? reportStatus : undefined,
        insideOrOutside: reportInsideOutside !== "all" ? reportInsideOutside : undefined,
        isNational: reportIsNational !== "all" ? reportIsNational : undefined,
      });
    } catch (err) {
      setError(err.message || "Failed to download category PDF");
    } finally {
      setCategoryPdfDownloading(false);
    }
  };

  const handleDownloadCategoryExcelAction = async () => {
    setCategoryExcelDownloading(true);
    try {
      await downloadCategoryExcel({
        category: selectedReportCategory,
        year: reportYear,
        semester: reportSemester,
        section: reportSection,
        participationStatus: reportStatus !== "all" ? reportStatus : undefined,
        insideOrOutside: reportInsideOutside !== "all" ? reportInsideOutside : undefined,
        isNational: reportIsNational !== "all" ? reportIsNational : undefined,
      });
    } catch (err) {
      setError(err.message || "Failed to download category Excel");
    } finally {
      setCategoryExcelDownloading(false);
    }
  };

  const handleDownloadStudentSheet = async (studentId, rollNumber) => {
    setStudentReportDownloading((prev) => ({ ...prev, [studentId]: true }));
    try {
      await downloadReport(studentId, rollNumber);
    } catch (err) {
      setError(err.message || "Failed to download student evaluation PDF");
    } finally {
      setStudentReportDownloading((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${BASE_URL}/admin/create-user`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`Created ${createForm.role}: ${createForm.name}`);
      setCreateForm({ name: "", email: "", password: "", role: "student", rollNumber: "", department: "Information Technology", year: 2, section: "A", assignedClass: "" });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRename = async (userId) => {
    const newName = renameInputs[userId];
    if (!newName) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${BASE_URL}/admin/rename/${userId}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess("Renamed successfully");
      setRenameInputs({ ...renameInputs, [userId]: "" });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${BASE_URL}/admin/user/${userId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess("User deleted");
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReview = async (item, status) => {
    setError("");
    setSuccess("");
    const inputs = reviewInputs[item.activityId] || {};
    try {
      const res = await fetch(
        `${BASE_URL}/admin/activity/${item.studentId}/${item.activityId}/approve`,
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            pointsApproved: inputs.pointsApproved || item.pointsClaimed,
            remarks: inputs.remarks || "",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`Activity ${status}`);
      loadActivities();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    removeItem("token");
    removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter && u.role !== userRoleFilter) return false;
    if (userYearFilter && String(u.year || 2) !== String(userYearFilter)) return false;
    if (userSectionFilter && (u.section || "A") !== userSectionFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchRoll = u.rollNumber?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchEmail) return false;
    }
    return true;
  });

  const filteredActivities = activities.filter((item) => {
    if (activityYearFilter && String(item.year || 2) !== String(activityYearFilter)) return false;
    if (activitySectionFilter && (item.section || "A") !== activitySectionFilter) return false;
    return true;
  });

  return (
    <div className="portal-wrapper">
      <header className="portal-header">
        <div className="header-left">
          <KecLogo size={44} />
        </div>
        <div className="header-right">
          <div className="user-badge">
            <span className="user-name">{user.name}</span>
            <span className="user-detail">Administrator</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="portal-main">
        <section className="welcome-banner">
          <div>
            <h2>Admin Control Panel</h2>
            <p>Full access — manage all accounts and review any submission at any stage.</p>
          </div>
        </section>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="tab-switcher" style={{ marginBottom: 16 }}>
          <button className={`switch-btn ${tab === "users" ? "active" : ""}`} onClick={() => switchTab("users")}>
            Manage Users
          </button>
          <button className={`switch-btn ${tab === "reports" ? "active" : ""}`} onClick={() => switchTab("reports")}>
            📈 Category Reports
          </button>
          <button className={`switch-btn ${tab === "summary" ? "active" : ""}`} onClick={() => switchTab("summary")}>
            📊 Class Summary
          </button>
          <button className={`switch-btn ${tab === "activities" ? "active" : ""}`} onClick={() => switchTab("activities")}>
            All Submissions
          </button>
          <button className={`switch-btn ${tab === "sap" ? "active" : ""}`} onClick={() => switchTab("sap")}>
            📋 SAP Structure
          </button>
        </div>

        {tab === "users" && (
          <div className="dashboard-layout">
            <section className="glass-card form-card">
              <div className="card-header">
                <h3>Create New Account</h3>
                <span className="card-subtitle">Student, Mentor, Advisor, or HOD</span>
              </div>
              <form onSubmit={handleCreateUser} className="activity-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    className="form-input"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    className="form-input"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  >
                    <option value="student">Student</option>
                    <option value="mentor">Faculty Mentor</option>
                    <option value="advisor">Class Advisor</option>
                    <option value="hod">Head of Department (HOD)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Year of Study / Class Year</label>
                  <select
                    className="form-input"
                    value={createForm.year}
                    onChange={(e) => setCreateForm({ ...createForm, year: Number(e.target.value) })}
                  >
                    <option value={1}>1st Year (I Year)</option>
                    <option value={2}>2nd Year (II Year)</option>
                    <option value={3}>3rd Year (III Year)</option>
                    <option value={4}>4th Year (IV Year)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{createForm.role === "advisor" ? "Assigned Section (e.g. Section A / B / C)" : "Section"}</label>
                  <select
                    className="form-input"
                    value={createForm.section}
                    onChange={(e) => {
                      const sec = e.target.value;
                      const yrRoman = createForm.year === 1 ? "I" : createForm.year === 2 ? "II" : createForm.year === 3 ? "III" : "IV";
                      const assigned = `${yrRoman}-IT-${sec}`;
                      setCreateForm({ ...createForm, section: sec, assignedClass: assigned });
                    }}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                {createForm.role === "student" && (
                  <div className="form-group">
                    <label>Roll Number</label>
                    <input
                      className="form-input"
                      value={createForm.rollNumber}
                      onChange={(e) => setCreateForm({ ...createForm, rollNumber: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Department</label>
                  <input
                    className="form-input"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn-submit">
                  Create Account
                </button>
              </form>
            </section>

            <section className="glass-card table-card">
              <div className="card-header flex-between flex-wrap" style={{ gap: "10px" }}>
                <div>
                  <h3>All Users ({filteredUsers.length} / {users.length})</h3>
                  <span className="card-subtitle">Filter & manage student accounts class-wise</span>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    className="inline-text-input"
                    placeholder="🔍 Search name, roll, email..."
                    style={{ width: "180px", fontSize: "0.8rem", padding: "4px 8px" }}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <select
                    className="inline-text-input"
                    style={{ width: "auto", fontSize: "0.8rem", padding: "4px 8px" }}
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="advisor">Class Advisor</option>
                    <option value="mentor">Mentor</option>
                    <option value="hod">HOD</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    className="inline-text-input"
                    style={{ width: "auto", fontSize: "0.8rem", padding: "4px 8px" }}
                    value={userYearFilter}
                    onChange={(e) => setUserYearFilter(e.target.value)}
                  >
                    <option value="">All Years</option>
                    <option value="1">1st Year (I Yr)</option>
                    <option value="2">2nd Year (II Yr)</option>
                    <option value="3">3rd Year (III Yr)</option>
                    <option value="4">4th Year (IV Yr)</option>
                  </select>
                  <select
                    className="inline-text-input"
                    style={{ width: "auto", fontSize: "0.8rem", padding: "4px 8px" }}
                    value={userSectionFilter}
                    onChange={(e) => setUserSectionFilter(e.target.value)}
                  >
                    <option value="">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </div>

              {loading && <p className="loading-state">Loading...</p>}
              {!loading && (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Name & Roll</th>
                        <th>Email</th>
                        <th>Role & Class Assignment</th>
                        <th>Assigned Advisor</th>
                        <th>Rename</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const yrRoman = u.year === 1 ? "I" : u.year === 2 ? "II" : u.year === 3 ? "III" : "IV";
                        const assignedLabel = u.role === "advisor"
                          ? `Class Advisor - Sec ${u.section || "A"} (${u.assignedClass || `${yrRoman}-IT-${u.section || "A"}`})`
                          : u.role === "student"
                            ? `Student (${yrRoman} Yr - Sec ${u.section || "A"})`
                            : u.role.toUpperCase();

                        return (
                          <tr key={u._id}>
                            <td>
                              <strong>{u.name}</strong>
                              {u.rollNumber && <span className="sub-text" style={{ display: "block" }}>Roll: {u.rollNumber}</span>}
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  background: u.role === "advisor" ? "rgba(26, 122, 76, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                  color: u.role === "advisor" ? "#1a7a4c" : "inherit",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                {assignedLabel}
                              </span>
                            </td>
                            <td>
                              {u.role === "student" ? (
                                <span style={{ fontSize: "0.8rem", color: "var(--accent-primary, #1a7a4c)", fontWeight: 500 }}>
                                  {u.advisor?.name || "Ms.Deenu Mol"}
                                </span>
                              ) : (
                                <span className="sub-text">-</span>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="inline-text-input"
                                placeholder="New name"
                                value={renameInputs[u._id] || ""}
                                onChange={(e) => setRenameInputs({ ...renameInputs, [u._id]: e.target.value })}
                              />
                              <button className="btn-view-proof" onClick={() => handleRename(u._id)} style={{ marginLeft: 6 }}>
                                Save
                              </button>
                            </td>
                            <td>
                              {u.role !== "admin" && (
                                <button className="btn-reject" onClick={() => handleDelete(u._id, u.name)}>
                                  Delete
                                </button>
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
        )}

        {/* ===== CLASS SUMMARY TAB ===== */}
        {tab === "summary" && (
          <section className="glass-card full-width-card">
            <div className="card-header flex-between flex-wrap" style={{ gap: "12px" }}>
              <div>
                <h3>Class & Year Wise Student Summary</h3>
                <span className="card-subtitle">
                  Submission counts and verified SAP marks (out of 5) per student
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Class:</span>
                  <select
                    className="inline-text-input"
                    style={{ width: "auto", padding: "4px 8px", fontSize: "0.8rem" }}
                    value={summaryYear}
                    onChange={(e) => {
                      setSummaryYear(e.target.value);
                      loadSummary(e.target.value, summarySection);
                    }}
                  >
                    <option value="">All Years</option>
                    <option value="1">1st Year (I Year)</option>
                    <option value="2">2nd Year (II Year)</option>
                    <option value="3">3rd Year (III Year)</option>
                    <option value="4">4th Year (IV Year)</option>
                  </select>
                  <select
                    className="inline-text-input"
                    style={{ width: "auto", padding: "4px 8px", fontSize: "0.8rem" }}
                    value={summarySection}
                    onChange={(e) => {
                      setSummarySection(e.target.value);
                      loadSummary(summaryYear, e.target.value);
                    }}
                  >
                    <option value="">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
                <button className="btn-primary-pdf" onClick={handleDownloadExcel} disabled={!summary}>
                  📥 Download Excel (.csv)
                </button>
                <button className="btn-primary-pdf" onClick={handleDownloadPdf} disabled={pdfDownloading}>
                  {pdfDownloading ? "Generating..." : "📄 Download PDF"}
                </button>
              </div>
            </div>

            {summaryLoading && <p className="loading-state">Loading student summary...</p>}
            {summaryError && <div className="alert alert-error">{summaryError}</div>}

            {summary && !summaryLoading && (
              <div className="table-responsive">
                <table className="custom-table" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Roll No.</th>
                      <th>Name</th>
                      <th>Class Year</th>
                      <th>Section</th>
                      <th>Class Advisor</th>
                      <th>Paper Pres.</th>
                      <th>Techno Mgr.</th>
                      <th>Sports</th>
                      <th>Membership</th>
                      <th>Leadership</th>
                      <th>Value-Added</th>
                      <th>Project/Patent</th>
                      <th>GATE/CAT</th>
                      <th>Total Submissions</th>
                      <th>SAP Mark (out of 5)</th>
                      <th>Individual Sheet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.students.map((s, idx) => {
                      const mark = s.sapMark !== undefined ? s.sapMark : calculateSAPMark(s.totalPoints || 0);
                      const yrRoman = s.year === 1 ? "I" : s.year === 2 ? "II" : s.year === 3 ? "III" : "IV";
                      return (
                        <tr key={s.studentId}>
                          <td>{idx + 1}</td>
                          <td><strong>{s.rollNumber}</strong></td>
                          <td>
                            <strong>{s.name}</strong>
                            {s.email && <div className="sub-text" style={{ fontSize: "11px" }}>{s.email}</div>}
                          </td>
                          <td>
                            <strong style={{ color: "var(--accent-primary, #1a7a4c)" }}>{yrRoman} Year</strong>
                          </td>
                          <td>
                            <span className="category-chip" style={{ fontSize: "11px", padding: "2px 6px" }}>
                              Sec {s.section || "A"}
                            </span>
                          </td>
                          <td>
                            <span className="sub-text" style={{ fontSize: "11px", fontWeight: 500 }}>
                              {s.advisor?.name || "Ms.Deenu Mol"}
                            </span>
                          </td>
                          {summary.categories.map((cat) => (
                            <td key={cat} style={{ textAlign: "center" }}>
                              {s.categoryCounts[cat] > 0 ? (
                                <strong style={{ color: "#1a7a4c" }}>{s.categoryCounts[cat]}</strong>
                              ) : (
                                <span style={{ color: "#aaa" }}>0</span>
                              )}
                            </td>
                          ))}
                          <td style={{ textAlign: "center" }}>
                            <strong style={{ color: s.total > 0 ? "#1a3c34" : "#aaa" }}>{s.total}</strong>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <strong style={{ color: mark > 0 ? "#1a7a4c" : "#aaa" }}>
                              {mark} / 5
                            </strong>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="btn-view-proof"
                              onClick={() => handleDownloadStudentSheet(s.studentId, s.rollNumber)}
                              disabled={studentReportDownloading[s.studentId]}
                              style={{ fontSize: "10px", padding: "3px 8px" }}
                            >
                              {studentReportDownloading[s.studentId] ? "..." : "📄 PDF"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ===== TAB: CATEGORY & EVENT REPORTS ===== */}
        {tab === "reports" && (
          <section className="glass-card full-width-card">
            <div className="card-header flex-between flex-wrap">
              <div>
                <h3>SAP Category & Event Analytics Center</h3>
                <span className="card-subtitle">
                  Retrieve multi-year and semester-wise student reports across all 4 years with winner and cash prize breakdowns
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn-primary-pdf"
                  onClick={handleDownloadCategoryExcelAction}
                  disabled={categoryExcelDownloading || !reportData}
                >
                  {categoryExcelDownloading ? "Generating..." : "📥 Export Category Excel (.csv)"}
                </button>
                <button
                  className="btn-primary-pdf"
                  onClick={handleDownloadCategoryPdfAction}
                  disabled={categoryPdfDownloading || !reportData}
                  style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}
                >
                  {categoryPdfDownloading ? "Generating..." : "📄 Export Category PDF"}
                </button>
              </div>
            </div>

            {/* Category Selector Chips */}
            <div style={{ margin: "14px 0" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>
                SELECT ACTIVITY CATEGORY:
              </div>
              <div className="category-tabs" style={{ flexWrap: "wrap", gap: "8px" }}>
                <button
                  className={`tab-btn ${selectedReportCategory === "all" ? "active" : ""}`}
                  onClick={() => {
                    setSelectedReportCategory("all");
                    fetchCategoryReportData("all", reportYear, reportSemester, reportSection, reportStatus, reportInsideOutside, reportIsNational);
                  }}
                >
                  All Categories Combined
                </button>
                {[
                  "1. Paper/Poster/Project Presentation",
                  "2. Techno Managerial Events",
                  "3. Sports & Games",
                  "4. Membership & Social Activities",
                  "5. Leadership/Organizing Events",
                  "6. Non-Credit Value-Added Course/IPT",
                  "7. Project to paper/Patent/Product Copyright",
                  "8. GATE/CAT/Govt. Exams"
                ].map((cat) => (
                  <button
                    key={cat}
                    className={`tab-btn ${selectedReportCategory === cat ? "active" : ""}`}
                    onClick={() => {
                      setSelectedReportCategory(cat);
                      fetchCategoryReportData(cat, reportYear, reportSemester, reportSection, reportStatus, reportInsideOutside, reportIsNational);
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Filter Bar */}
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "14px",
              margin: "14px 0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
              alignItems: "end"
            }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Class Year:
                </label>
                <select
                  className="inline-text-input"
                  style={{ width: "100%", padding: "6px 10px" }}
                  value={reportYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportYear(val);
                    fetchCategoryReportData(selectedReportCategory, val, reportSemester, reportSection, reportStatus, reportInsideOutside, reportIsNational);
                  }}
                >
                  <option value="">All 4 Years (I to IV)</option>
                  <option value="1">1st Year (I Year)</option>
                  <option value="2">2nd Year (II Year)</option>
                  <option value="3">3rd Year (III Year)</option>
                  <option value="4">4th Year (IV Year)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Semester:
                </label>
                <select
                  className="inline-text-input"
                  style={{ width: "100%", padding: "6px 10px" }}
                  value={reportSemester}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportSemester(val);
                    fetchCategoryReportData(selectedReportCategory, reportYear, val, reportSection, reportStatus, reportInsideOutside, reportIsNational);
                  }}
                >
                  <option value="">All Semesters (1 to 8)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Section:
                </label>
                <select
                  className="inline-text-input"
                  style={{ width: "100%", padding: "6px 10px" }}
                  value={reportSection}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportSection(val);
                    fetchCategoryReportData(selectedReportCategory, reportYear, reportSemester, val, reportStatus, reportInsideOutside, reportIsNational);
                  }}
                >
                  <option value="">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Result / Award Status:
                </label>
                <select
                  className="inline-text-input"
                  style={{ width: "100%", padding: "6px 10px" }}
                  value={reportStatus}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportStatus(val);
                    fetchCategoryReportData(selectedReportCategory, reportYear, reportSemester, reportSection, val, reportInsideOutside, reportIsNational);
                  }}
                >
                  <option value="all">All Records</option>
                  <option value="Winner">Winners / Prize Won Only</option>
                  <option value="CashPrize">Cash Prize Recipients Only</option>
                  <option value="Participant">Participants Only</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Location:
                </label>
                <select
                  className="inline-text-input"
                  style={{ width: "100%", padding: "6px 10px" }}
                  value={reportInsideOutside}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportInsideOutside(val);
                    fetchCategoryReportData(selectedReportCategory, reportYear, reportSemester, reportSection, reportStatus, val, reportIsNational);
                  }}
                >
                  <option value="all">All Locations</option>
                  <option value="Inside KEC">Inside KEC Only</option>
                  <option value="Outside KEC">Outside KEC Only</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Event Level:
                </label>
                <select
                  className="inline-text-input"
                  style={{ width: "100%", padding: "6px 10px" }}
                  value={reportIsNational}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportIsNational(val);
                    fetchCategoryReportData(selectedReportCategory, reportYear, reportSemester, reportSection, reportStatus, reportInsideOutside, val);
                  }}
                >
                  <option value="all">All Levels</option>
                  <option value="true">National Level Events Only</option>
                  <option value="false">Non-National Only</option>
                </select>
              </div>
            </div>

            {reportLoading && <p className="loading-state">Compiling category report data...</p>}
            {reportError && <div className="alert alert-error">{reportError}</div>}

            {reportData && !reportLoading && (
              <>
                {/* KPI Cards */}
                <section className="stats-grid approver-kpi-grid" style={{ margin: "16px 0" }}>
                  <div className="stat-card blue">
                    <div className="stat-icon">📑</div>
                    <div className="stat-info">
                      <span className="stat-label">Total Submissions</span>
                      <span className="stat-value">{reportData.summary.totalSubmissions}</span>
                    </div>
                  </div>

                  <div className="stat-card emerald">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-info">
                      <span className="stat-label">Unique Participants</span>
                      <span className="stat-value">{reportData.summary.totalParticipants}</span>
                    </div>
                  </div>

                  <div className="stat-card gold">
                    <div className="stat-icon">🏆</div>
                    <div className="stat-info">
                      <span className="stat-label">Winners & Prizes</span>
                      <span className="stat-value">{reportData.summary.totalWinners}</span>
                    </div>
                  </div>

                  <div className="stat-card purple">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                      <span className="stat-label">Cash Prize Won</span>
                      <span className="stat-value">
                        {reportData.summary.totalCashPrizeWinners}{" "}
                        <span className="stat-denom" style={{ fontSize: "0.9rem", color: "#10b981", fontWeight: 700 }}>
                          (₹{reportData.summary.totalCashPrizeAmount.toLocaleString("en-IN")})
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="stat-card emerald">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-info">
                      <span className="stat-label">Approved Points</span>
                      <span className="stat-value">{reportData.summary.totalPointsApproved} pts</span>
                    </div>
                  </div>
                </section>

                {/* Class-Wise Breakdown */}
                {reportData.summary.classBreakdown && Object.keys(reportData.summary.classBreakdown).length > 0 && (
                  <div style={{ margin: "20px 0" }}>
                    <h4 style={{ color: "var(--accent-primary, #1a7a4c)", marginBottom: "8px" }}>
                      🏛️ Class-Wise Breakdown (Participants, Winners & Cash Prizes)
                    </h4>
                    <div className="table-responsive">
                      <table className="custom-table" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>Class (Year & Section)</th>
                            <th style={{ textAlign: "center" }}>Unique Participants</th>
                            <th style={{ textAlign: "center" }}>Winners Count</th>
                            <th style={{ textAlign: "center" }}>Cash Prize Recipients</th>
                            <th style={{ textAlign: "right" }}>Total Cash Won (₹)</th>
                            <th style={{ textAlign: "center" }}>Total SAP Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(reportData.summary.classBreakdown).sort().map((cName) => {
                            const cb = reportData.summary.classBreakdown[cName];
                            return (
                              <tr key={cName}>
                                <td><strong>{cName}</strong></td>
                                <td style={{ textAlign: "center" }}><strong>{cb.participants || 0}</strong></td>
                                <td style={{ textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>{cb.winners || 0}</td>
                                <td style={{ textAlign: "center", color: "#10b981", fontWeight: 700 }}>{cb.cashWinners || 0}</td>
                                <td style={{ textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                                  ₹{(cb.cashAmount || 0).toLocaleString("en-IN")}
                                </td>
                                <td style={{ textAlign: "center", color: "var(--accent-primary, #1a7a4c)", fontWeight: 700 }}>
                                  {cb.points || 0} pts
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Detailed Student Records Table */}
                <div style={{ marginTop: "24px" }}>
                  <div className="flex-between flex-wrap" style={{ marginBottom: "10px" }}>
                    <h4 style={{ color: "var(--text-main)", margin: 0 }}>
                      📋 Detailed Student Records ({reportData.records.length} Activities)
                    </h4>
                  </div>

                  {reportData.records.length === 0 ? (
                    <div className="empty-state">
                      <p>No student submissions found matching the selected category and filters.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="custom-table" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>S.No</th>
                            <th>Roll No.</th>
                            <th>Student Name</th>
                            <th>Class</th>
                            <th>Sem</th>
                            <th>Date</th>
                            <th>College / Institution</th>
                            <th>Event Title</th>
                            <th>Location</th>
                            <th>Result</th>
                            <th>Cash Prize</th>
                            <th>Pts</th>
                            <th>Individual Report</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.records.map((rec, idx) => {
                            const yrRoman = rec.year === 1 ? "I" : rec.year === 2 ? "II" : rec.year === 3 ? "III" : "IV";
                            const hasCash = rec.hasCashPrize && rec.cashPrizeAmount > 0;
                            const isWinner = rec.participationStatus === "Winner";
                            const dateStr = rec.eventDate ? new Date(rec.eventDate).toLocaleDateString("en-IN") : "-";

                            return (
                              <tr key={rec.activityId || idx}>
                                <td>{idx + 1}</td>
                                <td><strong>{rec.rollNumber}</strong></td>
                                <td><strong>{rec.studentName}</strong></td>
                                <td>
                                  <span className="category-chip" style={{ fontSize: "11px", padding: "2px 6px" }}>
                                    {yrRoman}-{rec.section || "A"}
                                  </span>
                                </td>
                                <td><strong>Sem {rec.semester || 1}</strong></td>
                                <td>{dateStr}</td>
                                <td><div style={{ fontWeight: 600, color: "#10b981" }}>{rec.collegeName}</div></td>
                                <td><div style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>{rec.title}</div></td>
                                <td>
                                  <span style={{ fontSize: "11px" }}>
                                    {rec.insideOrOutside === "Outside KEC" ? "Outside KEC" : "Inside KEC"}
                                    {rec.isNational && <strong style={{ color: "#f59e0b", display: "block" }}>[National]</strong>}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: isWinner ? "#f59e0b" : "inherit" }}>
                                    {isWinner ? "🏆 Winner" : rec.participationStatus === "Runner" ? "🥈 Runner" : "🎓 Participant"}
                                  </strong>
                                </td>
                                <td>
                                  {hasCash ? (
                                    <strong style={{ color: "#10b981" }}>
                                      ₹{rec.cashPrizeAmount.toLocaleString("en-IN")}
                                    </strong>
                                  ) : (
                                    <span style={{ color: "var(--text-muted)" }}>—</span>
                                  )}
                                </td>
                                <td>
                                  <strong style={{ color: "var(--accent-primary, #1a7a4c)" }}>
                                    {rec.pointsApproved || rec.pointsClaimed} pts
                                  </strong>
                                </td>
                                <td>
                                  <button
                                    className="btn-view-proof"
                                    onClick={() => handleDownloadStudentSheet(rec.studentId, rec.rollNumber)}
                                    disabled={studentReportDownloading[rec.studentId]}
                                    style={{ fontSize: "10px", padding: "3px 6px", background: "rgba(59, 130, 246, 0.15)", borderColor: "#3b82f6", color: "#60a5fa" }}
                                    title="Download Student SAP Evaluation PDF"
                                  >
                                    📄 PDF
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {tab === "activities" && (
          <section className="glass-card full-width-card">
            <div className="card-header flex-between flex-wrap" style={{ gap: "10px" }}>
              <div>
                <h3>All Submissions ({filteredActivities.length} / {activities.length})</h3>
                <span className="card-subtitle">Admin can approve/reject at any stage</span>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Filter Class:</span>
                <select
                  className="inline-text-input"
                  style={{ width: "auto", fontSize: "0.8rem", padding: "4px 8px" }}
                  value={activityYearFilter}
                  onChange={(e) => setActivityYearFilter(e.target.value)}
                >
                  <option value="">All Years</option>
                  <option value="1">1st Year (I Yr)</option>
                  <option value="2">2nd Year (II Yr)</option>
                  <option value="3">3rd Year (III Yr)</option>
                  <option value="4">4th Year (IV Yr)</option>
                </select>
                <select
                  className="inline-text-input"
                  style={{ width: "auto", fontSize: "0.8rem", padding: "4px 8px" }}
                  value={activitySectionFilter}
                  onChange={(e) => setActivitySectionFilter(e.target.value)}
                >
                  <option value="">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>
            </div>
            {loading && <p className="loading-state">Loading...</p>}
            {!loading && (
              <div className="table-responsive">
                <table className="custom-table approver-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Category</th>
                      <th>Claimed</th>
                      <th>Stage</th>
                      <th>Points</th>
                      <th>Remarks</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((item) => {
                      const actionable = ["mentor", "advisor", "hod"].includes(item.currentStage);
                      const yrRoman = item.year === 1 ? "I" : item.year === 2 ? "II" : item.year === 3 ? "III" : "IV";
                      return (
                        <tr key={item.activityId}>
                          <td>
                            <strong>{item.studentName}</strong>
                            <br />
                            <span className="sub-text">{item.rollNumber}</span>
                            <br />
                            <span className="sub-text" style={{ color: "var(--accent-primary, #1a7a4c)", fontWeight: 600 }}>
                              Class: {yrRoman} Yr — Sec {item.section || "A"}
                            </span>
                          </td>
                          <td>
                            <span className="category-chip">{item.category}</span>
                            <div className="title-text">
                              {item.type} - {item.tier}
                            </div>
                          </td>
                          <td>{item.pointsClaimed} pts</td>
                          <td>
                            {item.currentStage === "completed" ? (
                              <span className="status-pill">✔ {item.verificationCode}</span>
                            ) : item.currentStage === "rejected" ? (
                              <span className="status-pill status-rejected">Rejected</span>
                            ) : (
                              <span className="status-pill status-pending">{item.currentStage}</span>
                            )}
                          </td>
                          <td>
                            {actionable && (
                              <input
                                type="number"
                                className="inline-number-input"
                                placeholder={item.pointsClaimed}
                                value={reviewInputs[item.activityId]?.pointsApproved || ""}
                                onChange={(e) =>
                                  setReviewInputs({
                                    ...reviewInputs,
                                    [item.activityId]: { ...reviewInputs[item.activityId], pointsApproved: e.target.value },
                                  })
                                }
                              />
                            )}
                          </td>
                          <td>
                            {actionable && (
                              <input
                                type="text"
                                className="inline-text-input"
                                placeholder="Optional"
                                value={reviewInputs[item.activityId]?.remarks || ""}
                                onChange={(e) =>
                                  setReviewInputs({
                                    ...reviewInputs,
                                    [item.activityId]: { ...reviewInputs[item.activityId], remarks: e.target.value },
                                  })
                                }
                              />
                            )}
                          </td>
                          <td className="action-button-group">
                            {actionable && (
                              <>
                                <button className="btn-approve" onClick={() => handleReview(item, "approved")}>
                                  Approve
                                </button>
                                <button className="btn-reject" onClick={() => handleReview(item, "rejected")}>
                                  Reject
                                </button>
                              </>
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
        )}
        {tab === "sap" && (
          <section className="glass-card full-width-card">
            <div className="card-header">
              <h3>SAP Point Structure</h3>
              <span className="card-subtitle">Upload the college SAP document to update categories, types, tiers and points</span>
            </div>
            <SapStructureManager />
          </section>
        )}
      </main>
    </div>
  );
}
