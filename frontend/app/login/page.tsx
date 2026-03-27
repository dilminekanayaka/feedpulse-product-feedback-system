"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (getStoredAdminSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to log in.");
      }

      saveAdminSession({ token: result.data.token, email: result.data.admin.email });
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell page-shell-centered">
      <div className="auth-card">
        <span className="hero-kicker">FeedPulse Admin</span>
        <h1 className="auth-title">Sign in to review product feedback.</h1>
        <p className="auth-text">
          Use the hardcoded admin account from your backend `.env` file. Once logged in,
          you can review AI summaries, search submissions, and update feedback status.
        </p>

        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Admin email</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter admin password" />
          </div>

          {errorMessage ? <div className="status-banner error">{errorMessage}</div> : null}

          <div className="submit-row auth-submit-row">
            <Link href="/" className="subtle-link">Back to public feedback form</Link>
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Log in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

