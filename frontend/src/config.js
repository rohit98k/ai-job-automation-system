// Use empty string so requests go to same origin (Vite proxy forwards /api to backend)
export const API_BASE = import.meta.env.VITE_API_URL || "";
