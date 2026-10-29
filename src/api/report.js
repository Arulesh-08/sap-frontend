import { getItem } from "../utils/storage.js";
import BASE_URL from "./config.js";

function authHeaders() {
  const token = getItem("token");
  return { Authorization: `Bearer ${token}` };
}

/**
 * Universal file download helper that guarantees proper file extension and browser compatibility.
 */
export function triggerFileDownload(blob, filename, mimeType = "application/pdf") {
  const hasExt = filename.toLowerCase().endsWith(".pdf") || filename.toLowerCase().endsWith(".csv");
  const cleanFilename = hasExt ? filename : `${filename}.pdf`;

  const typedBlob = new Blob([blob], { type: mimeType });
  const url = window.URL.createObjectURL(typedBlob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.setAttribute("download", cleanFilename);
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore cleanup error if any
    }
  }, 1500);
}

// Downloads the student's filled evaluation sheet + certificates PDF
export async function downloadReport(studentId, rollNumber) {
  const res = await fetch(`${BASE_URL}/report/${studentId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const result = await res.json().catch(() => ({}));
    throw new Error(result.message || "Failed to generate report");
  }

  const blob = await res.blob();
  const filename = `SAP_Report_${rollNumber || studentId}.pdf`;
  triggerFileDownload(blob, filename, "application/pdf");
}

// Downloads the class advisor summary sheet as a PDF
export async function downloadAdvisorSummaryPdf(year = "", section = "") {
  const query = new URLSearchParams();
  if (year) query.append("year", year);
  if (section) query.append("section", section);
  const qStr = query.toString() ? `?${query.toString()}` : "";

  const res = await fetch(`${BASE_URL}/report/summary/advisor${qStr}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "PDF download failed");
  }

  const blob = await res.blob();
  const filename = `SAP_Advisor_Summary_${Date.now()}.pdf`;
  triggerFileDownload(blob, filename, "application/pdf");
}

// Fetches category analytics data for approvers
export async function getCategoryAnalytics(params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      query.append(key, params[key]);
    }
  });
  const qStr = query.toString() ? `?${query.toString()}` : "";

  const res = await fetch(`${BASE_URL}/report/category-analytics${qStr}`, {
    headers: authHeaders(),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Failed to load category analytics");
  return result;
}

// Downloads Category-wise / Semester-wise / Year-wise PDF Report
export async function downloadCategoryPdf(params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      query.append(key, params[key]);
    }
  });
  const qStr = query.toString() ? `?${query.toString()}` : "";

  const res = await fetch(`${BASE_URL}/report/category-pdf${qStr}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Category PDF download failed");
  }

  const blob = await res.blob();
  const cat = params.category ? params.category.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) : "All_Categories";
  const filename = `KEC_SAP_${cat}_Report_${Date.now()}.pdf`;
  triggerFileDownload(blob, filename, "application/pdf");
}

// Downloads Category-wise / Semester-wise / Year-wise CSV / Excel Report
export async function downloadCategoryExcel(params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      query.append(key, params[key]);
    }
  });
  const qStr = query.toString() ? `?${query.toString()}` : "";

  const res = await fetch(`${BASE_URL}/report/category-excel${qStr}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Category Excel download failed");
  }

  const blob = await res.blob();
  const cat = params.category ? params.category.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 25) : "All_Categories";
  const filename = `KEC_SAP_${cat}_Report_${Date.now()}.csv`;
  triggerFileDownload(blob, filename, "text/csv");
}
