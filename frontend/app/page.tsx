"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { ToastStack, type ToastNotice } from "../components/toast-stack";
import { apiBaseUrl } from "../lib/config";

type Category = "Bug" | "Feature Request" | "Improvement" | "Other";

type FormDataState = {
  title: string;
  description: string;
  category: Category;
  submitterName: string;
  submitterEmail: string;
};

type FormErrors = Partial<Record<keyof FormDataState, string>>;

type ApiSuccessResponse = {
  success: boolean;
  message: string;
};

const initialForm: FormDataState = {
  title: "",
  description: "",
  category: "Improvement",
  submitterName: "",
  submitterEmail: "",
};

function validateForm(values: FormDataState) {
  const errors: FormErrors = {};

  if (!values.title.trim()) {
    errors.title = "Please add a short title for your feedback.";
  }

  if (!values.description.trim()) {
    errors.description = "Please describe the issue or idea.";
  } else if (values.description.trim().length < 20) {
    errors.description = "Description must be at least 20 characters long.";
  }

  if (values.submitterEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.submitterEmail.trim())) {
    errors.submitterEmail = "Please enter a valid email address.";
  }

  return errors;
}

export default function HomePage() {
  const [form, setForm] = useState<FormDataState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const descriptionLength = useMemo(() => form.description.trim().length, [form.description]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as ApiSuccessResponse & { error?: string | null };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Something went wrong while sending feedback.");
      }

      setForm(initialForm);
      setErrors({});
      setToast({ id: "feedback-success", tone: "success", message: "Feedback submitted successfully. It is now ready for review." });
    } catch (error) {
      setToast({ id: "feedback-error", tone: "error", message: error instanceof Error ? error.message : "Unable to submit feedback." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="app-glow app-glow-left" />
      <div className="app-glow app-glow-right" />

      <section className="page-frame feedback-frame">
        <header className="topbar topbar-compact feedback-topbar-row">
          <div className="brand-copy brand-copy-standalone">
            <span className="brand-name">FeedPulse</span>
            <span className="brand-meta">AI feedback system</span>
          </div>

          <Link href="/login" className="button button-secondary topbar-link-button">
            Admin Login
          </Link>
        </header>

        <section className="hero-block hero-block-centered feedback-hero-block">
          <span className="eyebrow">Customer feedback portal</span>
          <h1 className="hero-title">Share feedback that helps us build better.</h1>
          <p className="hero-subtitle">
            Report bugs, suggest features, or share improvements. Every submission goes directly into the FeedPulse review workflow.
          </p>
        </section>

        <article className="panel form-panel feedback-panel">
          <div className="panel-header feedback-panel-header">
            <div>
              <h2 className="panel-title">Submit feedback</h2>
              <p className="panel-description">Clear details help the team understand impact, urgency, and next steps faster.</p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <div className="field-label-row">
                <label htmlFor="title">Title</label>
                <span className="field-required">Required</span>
              </div>
              <input id="title" name="title" type="text" value={form.title} onChange={handleChange} placeholder="e.g. Dark mode is too bright" maxLength={120} aria-invalid={errors.title ? "true" : "false"} />
              {errors.title ? <span className="field-error">{errors.title}</span> : null}
            </div>

            <div className="field-group">
              <div className="field-label-row field-label-row-split">
                <div>
                  <label htmlFor="description">Description</label>
                  <span className="field-required">Required</span>
                </div>
                <span className="field-counter">{descriptionLength}/500</span>
              </div>
              <textarea id="description" name="description" value={form.description} onChange={handleChange} placeholder="Tell us what happened, where you saw it, and how it affects the experience." maxLength={500} aria-invalid={errors.description ? "true" : "false"} />
              {errors.description ? <span className="field-error">{errors.description}</span> : null}
            </div>

            <div className="field-group">
              <label htmlFor="category">Category</label>
              <div className="select-wrap select-wrap-modern">
                <select id="category" name="category" value={form.category} onChange={handleChange}>
                  <option value="Bug">Bug</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Improvement">Improvement</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="field-row-two">
              <div className="field-group">
                <label htmlFor="submitterName">Name</label>
                <input id="submitterName" name="submitterName" type="text" value={form.submitterName} onChange={handleChange} placeholder="Optional" />
              </div>

              <div className="field-group">
                <label htmlFor="submitterEmail">Email</label>
                <input id="submitterEmail" name="submitterEmail" type="email" value={form.submitterEmail} onChange={handleChange} placeholder="Optional" aria-invalid={errors.submitterEmail ? "true" : "false"} />
                {errors.submitterEmail ? <span className="field-error">{errors.submitterEmail}</span> : null}
              </div>
            </div>

            <div className="form-actions">
              <button className="button button-primary button-large" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </button>
              <div className="trust-strip" aria-label="Submission safeguards">
                <span>Private review workflow</span>
                <span>Rate-limited protection</span>
                <span>Accessible on all devices</span>
              </div>
            </div>
          </form>
        </article>
      </section>

      <ToastStack notices={toast ? [toast] : []} onDismiss={() => setToast(null)} />
    </main>
  );
}
