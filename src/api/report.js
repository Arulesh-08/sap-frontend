const BASE_URL = "http://localhost:5000/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

// Downloads the filled evaluation sheet + certificates PDF and triggers a browser save
export async function downloadReport(studentId, rollNumber) {
  const res = await fetch(`${BASE_URL}/report/${studentId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const result = await res.json().catch(() => ({}));
    throw new Error(result.message || "Failed to generate report");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `SAP_Report_${rollNumber || studentId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
