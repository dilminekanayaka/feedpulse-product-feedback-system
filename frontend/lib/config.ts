const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const adminTokenKey = "feedpulse_admin_token";
const adminEmailKey = "feedpulse_admin_email";
const adminSessionSavedAtKey = "feedpulse_admin_saved_at";
const pendingToastKey = "feedpulse_pending_toast";
const sessionMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

type AdminSession = {
  token: string;
  email: string;
};

type PendingToast = {
  id: string;
  tone: "success" | "error";
  message: string;
};

function getStoredAdminSession(): AdminSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(adminTokenKey);
  const email = window.localStorage.getItem(adminEmailKey);
  const savedAt = Number(window.localStorage.getItem(adminSessionSavedAtKey) || "0");

  if (!token || !email || !savedAt) {
    clearAdminSession();
    return null;
  }

  if (Date.now() - savedAt > sessionMaxAgeMs) {
    clearAdminSession();
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
  window.localStorage.setItem(adminSessionSavedAtKey, String(Date.now()));
}

function clearAdminSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(adminTokenKey);
  window.localStorage.removeItem(adminEmailKey);
  window.localStorage.removeItem(adminSessionSavedAtKey);
}

function setPendingToast(toast: PendingToast) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(pendingToastKey, JSON.stringify(toast));
}

function consumePendingToast(): PendingToast | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(pendingToastKey);
  if (!raw) {
    return null;
  }

  window.sessionStorage.removeItem(pendingToastKey);

  try {
    const parsed = JSON.parse(raw) as PendingToast;
    if (!parsed?.message || !parsed?.tone || !parsed?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export { apiBaseUrl, clearAdminSession, consumePendingToast, getStoredAdminSession, saveAdminSession, setPendingToast };
export type { AdminSession, PendingToast };
