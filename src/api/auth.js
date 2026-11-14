import { getItem } from "../utils/storage.js";
import BASE_URL from "./config.js";

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    let result = null;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      result = await res.json();
    } else {
      const text = await res.text();
      try {
        result = JSON.parse(text);
      } catch {
        result = { message: text || `Server error (${res.status})` };
      }
    }
    return { ok: res.ok, status: res.status, data: result };
  } catch (err) {
    if (err.name === "TypeError" && (err.message.includes("fetch") || err.message.includes("NetworkError"))) {
      throw new Error(
        "Backend server is currently unreachable. If the cloud backend is waking up, please wait 15 seconds and try again."
      );
    }
    throw err;
  }
}

export async function registerUser(data) {
  const { ok, data: result } = await safeFetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!ok) throw new Error(result?.message || "Registration failed");
  return result;
}

export async function changePassword(data, token) {
  const { ok, data: result } = await safeFetch(`${BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!ok) throw new Error(result?.message || "Password change failed");
  return result;
}

export async function verifyReset(data) {
  const { ok, data: result } = await safeFetch(`${BASE_URL}/auth/verify-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!ok) throw new Error(result?.message || "Verification failed");
  return result;
}

export async function resetPassword(data) {
  const { ok, data: result } = await safeFetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!ok) throw new Error(result?.message || "Reset failed");
  return result;
}

export async function loginUser(data) {
  const { ok, data: result } = await safeFetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!ok) throw new Error(result?.message || "Login failed");
  return result;
}

export async function loginWithGoogle(data) {
  const payload = typeof data === "string" ? { credential: data } : data;
  const { ok, data: result } = await safeFetch(`${BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!ok) {
    const error = new Error(result?.message || "Google authentication failed");
    error.notRegistered = Boolean(result?.notRegistered);
    error.email = result?.email;
    error.name = result?.name;
    throw error;
  }
  return result;
}
