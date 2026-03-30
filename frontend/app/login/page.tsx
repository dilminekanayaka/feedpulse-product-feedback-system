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
      setToast({
        id: "login-empty",
        tone: "error",
        message: "Please enter both email and password.",
      });
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
      setToast({
        id: "login-error",
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to log in.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="feedback-glow feedback-glow-left" />
      <div className="feedback-glow feedback-glow-right" />

      <section className="login-stage">
        <div className="login-brand-row">
          <span className="login-brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="login-brand-name">FeedPulse</span>
        </div>

        <article className="login-card">
          <div className="login-header-block">
            <h1 className="login-page-title">Admin Login</h1>
            <p className="login-page-subtitle">Sign in to manage feedback and insights.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@feedpulse.com"
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            <button className="login-submit-button" type="submit" disabled={isSubmitting}>
              <span className="login-submit-arrow" aria-hidden="true">→</span>
              <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
            </button>
          </form>

          <p className="login-helper-text">Use the admin credentials configured in your backend environment.</p>
        </article>

        <Link href="/" className="login-back-link">
          ← Back to Home
        </Link>
      </section>

      <ToastStack notices={toast ? [toast] : []} onDismiss={() => setToast(null)} />
    </main>
  );
}
