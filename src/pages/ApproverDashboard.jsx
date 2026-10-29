import { useEffect, useState } from "react";
import { getItem, setItem, removeItem } from "../utils/storage.js";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import {
  getPendingActivities,
  getAllActivities,
  reviewActivity,
  getStudentSummary,
  downloadAdvisorSummaryPdf,
} from "../api/points.js";
import {
  downloadReport,
  getCategoryAnalytics,
  downloadCategoryPdf,
  downloadCategoryExcel,
} from "../api/report.js";
import KecLogo from "../components/KecLogo.jsx";
import CertificateModal from "../components/CertificateModal.jsx";
import ChangePasswordModal from "../components/ChangePasswordModal.jsx";
import BASE_URL from "../api/config.js";

const CATEGORIES = [
  "1. Paper/Poster/Project Presentation",
  "2. Techno Managerial Events",
  "3. Sports & Games",
  "4. Membership & Social Activities",
  "5. Leadership/Organizing Events",
  "6. Non-Credit Value-Added Course/IPT",
  "7. Project to paper/Patent/Product Copyright",
  "8. GATE/CAT/Govt. Exams",
];

const calculateSAPMark = (points) => {
  if (points >= 150) return 5;
  if (points >= 100) return 4;
  if (points >= 50) return 3;
  if (points >= 25) return 2;
  if (points >= 10) return 1;
  return 0;
};

// Helper: Checks whether a student item belongs to the logged-in advisor's assigned class.
const isStudentInAdvisorClass = (advisorUser, item) => {
  if (!advisorUser || advisorUser.role !== "advisor") return true;
  if (item.advisorId && (String(item.advisorId) === String(advisorUser.id) || String(item.advisorId) === String(advisorUser._id))) {
    return true;
  }
  const itemYr = Number(item.year || 2);
  const userYr = Number(advisorUser.year || 2);
  const itemSec = String(item.section || "A").trim().toUpperCase();
  const userSec = String(advisorUser.section || "A").trim().toUpperCase();
  return itemYr === userYr && itemSec === userSec;
};

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
  const [yearFilter, setYearFilter] = useState(""); // "" = All Years, 1, 2, 3, 4
  const [sectionFilter, setSectionFilter] = useState(""); // "" = All Sections, "A", "B", "C"

  const [reviewInputs, setReviewInputs] = useState({});
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [activeModalActivity, setActiveModalActivity] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Main navigation tabs: "approvals" | "summary" | "reports"
  const [mainTab, setMainTab] = useState("approvals");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Category Reports State
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

  useEffect(() => {
    const storedUser = getItem("user");
    const token = getItem("token");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const fresh = await res.json();
          setItem("user", JSON.stringify(fresh));
          setUser(fresh);
        }
      } catch (e) {
        // Silent — cached user data works
      }
    })();

    if (parsedUser.role === "student") {
      navigate("/dashboard");
      return;
    }

    if (parsedUser.role === "advisor") {
      const initYr = parsedUser.year ? String(parsedUser.year) : "2";
      const initSec = parsedUser.section || "A";
      setYearFilter(initYr);
      setSectionFilter(initSec);
      setReportYear(initYr);
      setReportSection(initSec);
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
      const token = getItem("token");
      const res = await fetch(`${BASE_URL}/points/analytics`, {
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

  const fetchSummary = async (yr = yearFilter, sec = sectionFilter) => {
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

  const handleYearFilterChange = (yr) => {
    setYearFilter(yr);
    if (mainTab === "summary") fetchSummary(yr, sectionFilter);
  };

  const handleSectionFilterChange = (sec) => {
    setSectionFilter(sec);
    if (mainTab === "summary") fetchSummary(yearFilter, sec);
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SAP_Advisor_Summary_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  };

  const handleDownloadPdf = async () => {
    setPdfDownloading(true);
    try {
      await downloadAdvisorSummaryPdf(yearFilter, sectionFilter);
    } catch (err) {
      setActionError(err.message);
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
      setActionError(err.message || "Failed to download category PDF");
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
      setActionError(err.message || "Failed to download category Excel");
    } finally {
      setCategoryExcelDownloading(false);
    }
  };

  const handleDownloadStudentSheet = async (studentId, rollNumber) => {
    setStudentReportDownloading((prev) => ({ ...prev, [studentId]: true }));
    try {
      await downloadReport(studentId, rollNumber);
    } catch (err) {
      setActionError(err.message || "Failed to download student evaluation PDF");
    } finally {
      setStudentReportDownloading((prev) => ({ ...prev, [studentId]: false }));
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

    if (user.role === "advisor" && !isStudentInAdvisorClass(user, item)) {
      setActionError("Access denied. You can only review submissions for your own assigned class.");
      return;
    }

    const inputs = reviewInputs[item.activityId] || {};

    try {
      await reviewActivity(item.studentId, item.activityId, {
        status,
        pointsApproved: Number(inputs.pointsApproved ?? item.pointsClaimed),
        remarks: inputs.remarks || (status === "approved" ? "Approved by reviewer" : "Rejected"),
      });

      const nextStageMsg =
        status === "approved"
          ? user.role === "mentor"
            ? "Forwarded to Class Advisor for Stage 2 Review"
            : user.role === "advisor"
            ? "Forwarded to HOD for Final Stage 3 Verification"
            : "Activity fully approved & SAP points awarded!"
          : "Activity rejected and student notified.";

      setActionSuccess(`Success: ${nextStageMsg}`);
      fetchActivities(statusTab);
      fetchAnalytics();
      if (mainTab === "reports") fetchCategoryReportData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleRevoke = async (item) => {
    setActionError("");
    setActionSuccess("");

    if (user.role === "advisor" && !isStudentInAdvisorClass(user, item)) {
      setActionError("Access denied. You can only revoke submissions for your own assigned class.");
      return;
    }

    const confirmed = window.confirm(
      `Revoke verification for "${item.title}" (${item.studentName})?\n\nThis will reset approved points to 0 and mark the activity as rejected.`
    );
    if (!confirmed) return;

    try {
      const token = getItem("token");
      const res = await fetch(
        `${BASE_URL}/points/${item.studentId}/activity/${item.activityId}/revoke`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ remarks: "Revoked after re-review" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revoke verification");

      setActionSuccess(`Verification revoked for ${item.studentName}. Points reset to 0.`);
      fetchActivities(statusTab);
      fetchAnalytics();
      if (mainTab === "reports") fetchCategoryReportData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleLogout = () => {
    removeItem("token");
    removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const roleTitle =
    user.role === "mentor"
      ? "Faculty Mentor"
      : user.role === "advisor"
      ? "Class Advisor"
      : user.role === "hod"
      ? "Head of Department (HOD)"
      : "Administrator";

  const filteredList = activitiesList.filter((item) => {
    const matchCategory =
      categoryFilter === "All" || item.category === categoryFilter;
    const matchYear =
      !yearFilter || String(item.year || 2) === String(yearFilter);
    const matchSection =
      !sectionFilter || (item.section || "A").toUpperCase() === sectionFilter.toUpperCase();
    return matchCategory && matchYear && matchSection;
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
          {(user.role === "advisor" || user.role === "hod" || user.role === "admin") && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-download-summary"
                onClick={handleDownloadPdf}
                disabled={pdfDownloading}
                title="Download Student SAP Summary Sheet as PDF"
                style={{ background: "rgba(26, 122, 76, 0.2)", border: "1px solid var(--primary-emerald)" }}
              >
                {pdfDownloading ? "Generating..." : "📄 Summary PDF"}
              </button>
              <button
                className="btn-download-summary"
                onClick={handleDownloadExcel}
                title="Download Student SAP Summary as Excel / CSV"
              >
                📥 Summary CSV
              </button>
            </div>
          )}
          <ThemeToggle />
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Ultra-Wide Content */}
      <main className="portal-main">
        {/* Main Tab Switcher & Year/Section Filter Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", margin: "0 0 16px 0" }}>
          <div className="tab-switcher" style={{ margin: 0, display: "flex", gap: "6px" }}>
            <button
              className={`switch-btn ${mainTab === "approvals" ? "active" : ""}`}
              onClick={() => setMainTab("approvals")}
            >
              📋 Approval Queue
            </button>
            <button
              className={`switch-btn ${mainTab === "reports" ? "active" : ""}`}
              onClick={() => {
                setMainTab("reports");
                fetchCategoryReportData(selectedReportCategory, reportYear, reportSemester, reportSection, reportStatus, reportInsideOutside, reportIsNational);
              }}
            >
              📈 Category & Event Reports
            </button>
            {(user.role === "advisor" || user.role === "hod" || user.role === "admin") && (
              <button
                className={`switch-btn ${mainTab === "summary" ? "active" : ""}`}
                onClick={() => { setMainTab("summary"); fetchSummary(yearFilter, sectionFilter); }}
              >
                📊 Student Summary Sheet
              </button>
            )}
          </div>

          {/* Global Year & Section Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255, 255, 255, 0.05)", padding: "6px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>🔍 Filter Class:</span>
            <select
              className="inline-text-input"
              style={{ width: "auto", padding: "4px 8px", fontSize: "0.8rem" }}
              value={yearFilter}
              onChange={(e) => handleYearFilterChange(e.target.value)}
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
              value={sectionFilter}
              onChange={(e) => handleSectionFilterChange(e.target.value)}
            >
              <option value="">All Sections</option>
              <option value="A">Section A {user.role === "advisor" && (user.section || "A") === "A" ? "(Your Class)" : ""}</option>
              <option value="B">Section B {user.role === "advisor" && user.section === "B" ? "(Your Class)" : ""}</option>
              <option value="C">Section C {user.role === "advisor" && user.section === "C" ? "(Your Class)" : ""}</option>
            </select>

            {user.role === "advisor" && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background:
                    yearFilter === String(user.year || 2) && sectionFilter === (user.section || "A")
                      ? "rgba(26, 122, 76, 0.15)"
                      : "rgba(245, 158, 11, 0.15)",
                  color:
                    yearFilter === String(user.year || 2) && sectionFilter === (user.section || "A")
                      ? "#1a7a4c"
                      : "#b45309",
                  border:
                    yearFilter === String(user.year || 2) && sectionFilter === (user.section || "A")
                      ? "1px solid rgba(26, 122, 76, 0.3)"
                      : "1px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                {yearFilter === String(user.year || 2) && sectionFilter === (user.section || "A")
                  ? "✓ Your Assigned Class"
                  : "⚠️ Outside Class (Read-Only)"}
              </span>
            )}
          </div>
        </div>

        {/* Banner */}
        <section className="welcome-banner approver-banner">
          <div>
            <h2>
              {mainTab === "reports"
                ? "SAP Category & Event Analytics Center"
                : mainTab === "summary"
                ? "Class Student Summary & Mark Evaluation"
                : `${roleTitle} Review Portal`}
            </h2>
            <p>
              {mainTab === "reports"
                ? "Retrieve students year-wise and semester-wise across all 4 years. Analyze participants, winners, and cash prize recipients with instant PDF and Excel exports."
                : user.role === "advisor"
                ? `Assigned Class: ${user.assignedClass || `${user.year === 1 ? "I" : user.year === 2 ? "II" : user.year === 3 ? "III" : "IV"} Year - Section ${user.section || "A"}`}. Review and verify student certificates.`
                : "Verify student activity claims, review certificates, and track achievements."}
            </p>
          </div>
        </section>

        {actionError && <div className="alert alert-error">{actionError}</div>}
        {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}

        {/* ===== TAB 1: APPROVAL QUEUE ===== */}
        {mainTab === "approvals" && (
          <>
            {/* KPI Stat Cards */}
            <section className="stats-grid approver-kpi-grid">
              <div className="stat-card gold">
                <div className="stat-icon">📥</div>
                <div className="stat-info">
                  <span className="stat-label">Pending Your Review</span>
                  <span className="stat-value">{activitiesList.length}</span>
                </div>
              </div>

              <div className="stat-card emerald">
                <div className="stat-icon">🎓</div>
                <div className="stat-info">
                  <span className="stat-label">Advisor Approved</span>
                  <span className="stat-value">{analytics.advisorApprovedCount}</span>
                </div>
              </div>

              <div className="stat-card purple">
                <div className="stat-icon">🏛️</div>
                <div className="stat-info">
                  <span className="stat-label">HOD Verified (Final)</span>
                  <span className="stat-value">{analytics.hodApprovedCount}</span>
                </div>
              </div>

              <div className="stat-card blue">
                <div className="stat-icon">📑</div>
                <div className="stat-info">
                  <span className="stat-label">Total Dept Activities</span>
                  <span className="stat-value">{analytics.totalEntries}</span>
                </div>
              </div>
            </section>

            {/* Submissions Section */}
            <section className="glass-card full-width-card">
              <div className="card-header flex-between flex-wrap">
                <div>
                  <h3>Activity Submissions Queue</h3>
                  <span className="card-subtitle">
                    Showing {filteredList.length} submissions {yearFilter ? `(Year ${yearFilter})` : ""} {sectionFilter ? `(Sec ${sectionFilter})` : ""}
                  </span>
                </div>

                {/* View Mode Switcher */}
                <div className="tab-switcher">
                  <button
                    className={`switch-btn ${statusTab === "pending" ? "active" : ""}`}
                    onClick={() => handleTabChange("pending")}
                  >
                    ⏳ Pending Stage Action
                  </button>
                  <button
                    className={`switch-btn ${statusTab === "all" ? "active" : ""}`}
                    onClick={() => handleTabChange("all")}
                  >
                    👁️ All Submissions Overview
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="category-tabs" style={{ marginBottom: 16 }}>
                <button
                  className={`tab-btn ${categoryFilter === "All" ? "active" : ""}`}
                  onClick={() => setCategoryFilter("All")}
                >
                  All Categories ({activitiesList.length})
                </button>
                {CATEGORIES.map((cat) => {
                  const count = activitiesList.filter((a) => a.category === cat).length;
                  return (
                    <button
                      key={cat}
                      className={`tab-btn ${categoryFilter === cat ? "active" : ""}`}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat.substring(0, 20)}... ({count})
                    </button>
                  );
                })}
              </div>

              {loading && <p className="loading-state">Loading submissions...</p>}
              {loadError && <div className="alert alert-error">{loadError}</div>}

              {!loading && filteredList.length === 0 && (
                <div className="empty-state">
                  <p>No submissions found for the selected category/filters.</p>
                </div>
              )}

              {!loading && filteredList.length > 0 && (
                <div className="table-responsive">
                  <table className="custom-table approver-table">
                    <thead>
                      <tr>
                        <th>Student Details</th>
                        <th>Category & Title</th>
                        <th>Date & Sem</th>
                        <th>College & Location</th>
                        <th>Result / Cash Prize</th>
                        <th>Claimed</th>
                        <th>Proof & Report</th>
                        <th>Points Approved</th>
                        <th>Remarks</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.map((item) => {
                        const isMyClass = isStudentInAdvisorClass(user, item);
                        const isMyStage = item.currentStage === user.role;
                        const canApprove = isMyStage && (user.role !== "advisor" || isMyClass);
                        const isCompleted = item.currentStage === "completed";
                        const canRevoke = isCompleted && (user.role !== "advisor" || isMyClass);
                        const hasCash = item.hasCashPrize && item.cashPrizeAmount > 0;
                        const dateStr = item.eventDate ? new Date(item.eventDate).toLocaleDateString("en-IN") : "-";

                        return (
                          <tr key={item.activityId} className={isCompleted ? "row-approved" : ""}>
                            {/* Student Details */}
                            <td>
                              <div className="student-info-cell">
                                <strong>{item.studentName}</strong>
                                <span className="sub-text">Roll: {item.rollNumber || "N/A"}</span>
                                <span className="sub-text" style={{ fontWeight: 600, color: "var(--accent-primary, #1a7a4c)" }}>
                                  Class: {item.year === 1 ? "I" : item.year === 2 ? "II" : item.year === 3 ? "III" : "IV"} Year — Section {item.section || "A"}
                                </span>
                                {item.advisorName && (
                                  <span className="sub-text" style={{ fontSize: "0.72rem" }}>Advisor: {item.advisorName}</span>
                                )}
                                <div style={{ marginTop: "4px" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      background: "rgba(26, 122, 76, 0.15)",
                                      color: "#1a7a4c",
                                      border: "1px solid rgba(26, 122, 76, 0.3)",
                                    }}
                                  >
                                    🏆 SAP Mark: {item.sapMark !== undefined ? item.sapMark : calculateSAPMark(item.totalPointsApproved || 0)} / 5
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Category & Title */}
                            <td>
                              <span className="category-chip">{item.category}</span>
                              <div className="title-text" style={{ fontWeight: 600, marginTop: "4px" }}>{item.title}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.type} ({item.tier})</div>
                            </td>

                            {/* Date & Semester */}
                            <td>
                              <div style={{ fontSize: "12px", fontWeight: "600" }}>{dateStr}</div>
                              <span className="category-chip" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                Sem {item.semester || 1}
                              </span>
                            </td>

                            {/* College & Location */}
                            <td>
                              <div style={{ fontSize: "12px", fontWeight: "600", color: "#10b981" }}>
                                🏛️ {item.collegeName || "Kongu Engineering College"}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                {item.insideOrOutside === "Outside KEC" ? "📍 Outside KEC" : "📍 Inside KEC"}
                                {item.isNational && <span style={{ marginLeft: "4px", color: "#f59e0b", fontWeight: "bold" }}>[National]</span>}
                              </div>
                            </td>

                            {/* Result & Cash Prize */}
                            <td>
                              <div style={{ fontSize: "12px", fontWeight: "600", color: item.participationStatus === "Winner" ? "#f59e0b" : "inherit" }}>
                                {item.participationStatus === "Winner" ? "🏆 Winner" : item.participationStatus === "Runner" ? "🥈 Runner" : "🎓 Participant"}
                              </div>
                              {hasCash ? (
                                <div style={{ fontSize: "11px", color: "#10b981", fontWeight: "bold", marginTop: "2px" }}>
                                  💰 ₹{item.cashPrizeAmount.toLocaleString("en-IN")}
                                </div>
                              ) : (
                                <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>No Cash Prize</div>
                              )}
                            </td>

                            {/* Claimed */}
                            <td>
                              <strong>{item.pointsClaimed}</strong> pts
                            </td>

                            {/* Proof & Full Report */}
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {item.proofUrl ? (
                                  <button
                                    className="btn-view-proof"
                                    onClick={() => setActiveModalActivity(item)}
                                  >
                                    🔍 Certificate
                                  </button>
                                ) : (
                                  <span className="no-proof">No File</span>
                                )}
                                <button
                                  className="btn-view-proof"
                                  onClick={() => handleDownloadStudentSheet(item.studentId, item.rollNumber)}
                                  disabled={studentReportDownloading[item.studentId]}
                                  style={{ background: "rgba(59, 130, 246, 0.15)", borderColor: "#3b82f6", color: "#60a5fa" }}
                                  title="Download student's complete SAP Evaluation PDF"
                                >
                                  {studentReportDownloading[item.studentId] ? "..." : "📄 Sheet (PDF)"}
                                </button>
                              </div>
                            </td>

                            {/* Points Approved Input */}
                            <td>
                              {canApprove ? (
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
                                <strong className="approved-pts">{item.pointsApproved || item.pointsClaimed} pts</strong>
                              )}
                            </td>

                            {/* Remarks Input */}
                            <td>
                              {canApprove ? (
                                <input
                                  type="text"
                                  placeholder="Verification remarks..."
                                  className="inline-text-input"
                                  value={reviewInputs[item.activityId]?.remarks || ""}
                                  onChange={(e) =>
                                    handleInputChange(item.activityId, "remarks", e.target.value)
                                  }
                                />
                              ) : (
                                <span className="remarks-text">{item.remarks || "—"}</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td>
                              {canApprove ? (
                                <div className="action-buttons-cell">
                                  <button
                                    className="btn-approve"
                                    onClick={() => handleReview(item, "approved")}
                                  >
                                    ✔ Approve
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
                                  {canRevoke && (
                                    <button
                                      className="btn-reject"
                                      style={{ marginLeft: 8 }}
                                      onClick={() => handleRevoke(item)}
                                    >
                                      Revoke
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="status-pill status-pending">
                                  ⌛ Pending {(item.currentStage || "mentor").toUpperCase()}
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
          </>
        )}

        {/* ===== TAB 2: CATEGORY & EVENT REPORTS (NEW MASSIVE FEATURE) ===== */}
        {mainTab === "reports" && (
          <section className="glass-card full-width-card">
            <div className="card-header flex-between flex-wrap">
              <div>
                <h3>SAP Category & Event Analytics Center</h3>
                <span className="card-subtitle">
                  Filter by category, semester, year, and award status to view participants, winners, and cash prizes
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
                  {categoryPdfDownloading ? "Generating PDF..." : "📄 Export Category PDF"}
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
                {CATEGORIES.map((cat) => (
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

            {/* Comprehensive Multi-Filter Bar */}
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

            {reportLoading && <p className="loading-state">Compiling category report and statistics...</p>}
            {reportError && <div className="alert alert-error">{reportError}</div>}

            {reportData && !reportLoading && (
              <>
                {/* Real-time KPI Summary Grid */}
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

                {/* Class-Wise Breakdown Mini-Table */}
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

                {/* Detailed Student Participation Table */}
                <div style={{ marginTop: "24px" }}>
                  <div className="flex-between flex-wrap" style={{ marginBottom: "10px" }}>
                    <h4 style={{ color: "var(--text-main)", margin: 0 }}>
                      📋 Detailed Student Records ({reportData.records.length} Activities)
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Historical record persisted across all four years & semesters
                    </span>
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
                            <th>Status & Actions</th>
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
                                <td>
                                  <strong>{rec.studentName}</strong>
                                </td>
                                <td>
                                  <span className="category-chip" style={{ fontSize: "11px", padding: "2px 6px" }}>
                                    {yrRoman}-{rec.section || "A"}
                                  </span>
                                </td>
                                <td><strong>Sem {rec.semester || 1}</strong></td>
                                <td>{dateStr}</td>
                                <td>
                                  <div style={{ fontWeight: 600, color: "#10b981" }}>{rec.collegeName}</div>
                                </td>
                                <td>
                                  <div style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {rec.title}
                                  </div>
                                </td>
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
                                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                    {rec.proofUrl && (
                                      <button
                                        className="btn-view-proof"
                                        onClick={() => setActiveModalActivity(rec)}
                                        style={{ fontSize: "10px", padding: "3px 6px" }}
                                        title="View Certificate Proof"
                                      >
                                        🔍 Proof
                                      </button>
                                    )}
                                    <button
                                      className="btn-view-proof"
                                      onClick={() => handleDownloadStudentSheet(rec.studentId, rec.rollNumber)}
                                      disabled={studentReportDownloading[rec.studentId]}
                                      style={{ fontSize: "10px", padding: "3px 6px", background: "rgba(59, 130, 246, 0.15)", borderColor: "#3b82f6", color: "#60a5fa" }}
                                      title="Download complete Student SAP Evaluation PDF"
                                    >
                                      📄 PDF
                                    </button>
                                  </div>
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

        {/* ===== TAB 3: SUMMARY TABLE TAB ===== */}
        {mainTab === "summary" && (
          <section className="glass-card full-width-card">
            <div className="card-header flex-between flex-wrap">
              <div>
                <h3>Student SAP Summary — Advisor-Approved Submission Counts</h3>
                <span className="card-subtitle">Shows count of submissions approved by advisor or above, per category</span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
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
                      <th>Individual Report</th>
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
