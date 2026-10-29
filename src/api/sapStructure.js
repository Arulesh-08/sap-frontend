import { getItem } from "../utils/storage.js";
import BASE_URL from "./config.js";


function authHeaders() {
  return { Authorization: `Bearer ${getItem("token")}` };
}

/** Upload the college SAP file and get back extracted table data */
export async function extractSapFile(file) {
  const formData = new FormData();
  formData.append("sapFile", file);
  const res = await fetch(`${BASE_URL}/admin/sap-structure/extract`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Extraction failed.");
  // Pass kecFormatDetected flag through to the caller
  return data; // { sheets } or { kecFormatDetected: true, sheets: [] }
}

/** Publish the admin-confirmed mapped structure to DB and optionally notify users */
export async function publishSapStructure(structure, sendNotifications = false) {
  const res = await fetch(`${BASE_URL}/admin/sap-structure/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ structure, sendNotifications }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Publish failed.");
  return data; // { message, notifiedCount }
}

/** Publish the built-in KEC SAP default structure without uploading a file */
export async function publishKecDefault(sendNotifications = false) {
  const res = await fetch(`${BASE_URL}/admin/sap-structure/reset-to-default`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sendNotifications }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to publish default.");
  return data;
}

/** Remove any custom structure — reverts to static KEC default */
export async function revertToDefault() {
  const res = await fetch(`${BASE_URL}/admin/sap-structure/custom`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to revert.");
  return data;
}

export async function getCurrentSapStructure() {
  const res = await fetch(`${BASE_URL}/admin/sap-structure/current`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch structure.");
  return data;
}
