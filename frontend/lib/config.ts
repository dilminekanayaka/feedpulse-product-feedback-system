const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const adminTokenKey = "feedpulse_admin_token";
const adminEmailKey = "feedpulse_admin_email";

type AdminSession = {
  token: string;
  email: string;
};

function getStoredAdminSession(): AdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(adminTokenKey);
  const email = window.localStorage.getItem(adminEmailKey);

  if (!token || !email) {
    return null;
  }

  return { token, email };
}

function saveAdminSession(session: AdminSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(adminTokenKey, session.token);
  window.localStorage.setItem(adminEmailKey, session.email);
}

function clearAdminSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(adminTokenKey);
  window.localStorage.removeItem(adminEmailKey);
}

export { apiBaseUrl, clearAdminSession, getStoredAdminSession, saveAdminSession };
export type { AdminSession };

