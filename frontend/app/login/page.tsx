"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ToastStack, type ToastNotice } from "../../components/toast-stack";
import { apiBaseUrl, getStoredAdminSession, saveAdminSession } from "../../lib/config";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  useEffect(() => {
    if (getStoredAdminSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

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
      router.push("/dashboard");
    } catch (error) {
      setToast({ id: "login-error", tone: "error", message: error instanceof Error ? error.message : "Unable to log in." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <div className="app-glow app-glow-left" />
      <div className="app-glow app-glow-right" />

      <section className="page-frame auth-frame auth-frame-tight">
        <div className="auth-header auth-header-tight">
          <div className="brand-copy brand-copy-centered">
            <span className="brand-name">FeedPulse</span>
            <span className="brand-meta">Admin workspace</span>
          </div>
        </div>

        <article className="panel auth-panel auth-panel-tight">
          <div className="panel-header auth-panel-header">
            <div>
              <span className="eyebrow">Secure access</span>
              <h1 className="panel-title panel-title-large">Admin Login</h1>
              <p className="panel-description">Sign in to manage feedback, triage submissions, and review AI insights.</p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@feedpulse.com" autoComplete="email" />
            </div>

            <div className="field-group">
              <div className="field-label-row field-label-row-split">
                <label htmlFor="password">Password</label>
                <span className="field-helper">Protected access</span>
              </div>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" autoComplete="current-password" />
            </div>

            <div className="form-actions auth-form-actions">
              <button className="button button-primary button-large" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
              <p className="support-copy">Use the admin credentials configured in your backend environment.</p>
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
