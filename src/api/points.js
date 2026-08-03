const BASE_URL = "https://sap-backend-1.onrender.com/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

// Category -> Type -> Tier -> points, straight from the backend's pointStructure.js.
// This is the single source of truth for the cascading dropdown UI, so the frontend
// can never drift out of sync with what the server will actually accept/compute.
export async function getCategories() {
  const res = await fetch(`${BASE_URL}/points/categories`, {
    headers: authHeaders(),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Failed to load categories");
  return result;
}

export async function submitActivity(formData) {
  const res = await fetch(`${BASE_URL}/points/submit`, {
    method: "POST",
    headers: authHeaders(), // don't set Content-Type manually — browser sets it for FormData
    body: formData,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Submission failed");
  return result;
}

export async function getMyPoints() {
  const res = await fetch(`${BASE_URL}/points/my-points`, {
    headers: authHeaders(),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Failed to load points");
  return result;
}

export async function getPendingActivities() {
  const res = await fetch(`${BASE_URL}/points/pending`, {
    headers: authHeaders(),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Failed to load pending activities");
  return result;
}

export async function getAllActivities() {
  const res = await fetch(`${BASE_URL}/points/all`, {
    headers: authHeaders(),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Failed to load all activities");
  return result;
}

export async function reviewActivity(studentId, activityId, payload) {
  const res = await fetch(`${BASE_URL}/points/${studentId}/activity/${activityId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Review failed");
  return result;
}
