// Single source of truth for the backend API URL.
// In production (Vercel), set VITE_API_URL=https://sap-backend-1.onrender.com/api
// For local dev it auto-falls back to localhost:5000.
const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default BASE_URL;
