"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ToastStack, type ToastNotice } from "../../components/toast-stack";
import { apiBaseUrl, consumePendingToast, getStoredAdminSession, saveAdminSession, setPendingToast } from "../../lib/config";

type LoginResponse = {
  success: boolean;
  message: string;
  data?: {
    token: string;
    admin: {
      email: string;
      role: string;
    };
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  useEffect(() => {
    if (getStoredAdminSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const pendingToast = consumePendingToast();
    if (pendingToast) {
      setToast(pendingToast);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setToast({ id: "login-empty", tone: "error", message: "Please enter both email and password." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to log in.");
      }

      saveAdminSession({ token: result.data.token, email: result.data.admin.email });
      setPendingToast({ id: "login-success", tone: "success", message: "Logged in successfully." });
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to log in.";
      setToast({ id: "login-error", tone: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <div className="app-glow app-glow-left" />
      <div className="app-glow app-glow-right" />

      <section className="page-frame auth-frame auth-frame-tight">
        <header className="topbar topbar-compact auth-topbar page-header">
          <div className="brand-copy brand-copy-standalone">
            <span className="brand-name">FeedPulse</span>
          </div>
        </header>

        <article className="panel auth-panel auth-panel-tight">
          <div className="panel-header auth-panel-header">
            <div>
              <span className="eyebrow">Secure access</span>
              <h1 className="panel-title panel-title-large">Admin Login</h1>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter email" autoComplete="email" />
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrap">
                <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" autoComplete="current-password" />
                <button
                  type="button"
                  className="password-visibility-button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.7a3 3 0 0 0 4 4" />
                      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.3 0 9.3 4.5 10 6.9a1 1 0 0 1 0 .2 1 1 0 0 1 0 .2 12.2 12.2 0 0 1-4 5.3" />
                      <path d="M6.2 6.2A12.4 12.4 0 0 0 2 12a12.3 12.3 0 0 0 6.1 6.3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-actions auth-form-actions">
              <button className="button button-primary button-large" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>
        </article>

        <Link href="/" className="text-link auth-back-link">
          Back to Home
        </Link>
      </section>

      <ToastStack notices={toast ? [toast] : []} onDismiss={() => setToast(null)} />
    </main>
  );
}
