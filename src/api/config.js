// Single source of truth for the backend API URL.
// Defaults directly to the live Render cloud backend.
const BASE_URL =
  import.meta.env.VITE_API_URL || "https://sap-backend-1.onrender.com/api";

export default BASE_URL;
