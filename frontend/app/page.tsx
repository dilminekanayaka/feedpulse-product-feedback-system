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

  if (
    values.submitterEmail.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.submitterEmail.trim())
  ) {
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

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
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
      setToast({
        id: "feedback-success",
        tone: "success",
        message: "Feedback submitted successfully. It is now ready for review.",
      });
    } catch (error) {
      setToast({
        id: "feedback-error",
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to submit feedback.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="feedback-shell">
      <div className="feedback-glow feedback-glow-left" />
      <div className="feedback-glow feedback-glow-right" />

      <section className="feedback-stage">
        <div className="feedback-topbar">
          <div />
          <Link href="/login" className="feedback-admin-button">
            Admin Login
          </Link>
        </div>

        <div className="feedback-heading-block">
          <h1 className="feedback-title">FeedPulse</h1>
          <p className="feedback-subtitle">
            Share your feedback. Help us build better products with AI-powered insights.
          </p>
        </div>

        <article className="feedback-card">
          <form className="feedback-form" onSubmit={handleSubmit} noValidate>
            <div className="feedback-field">
              <div className="feedback-label-row">
                <label htmlFor="title">Title</label>
                <span className="field-required">*</span>
              </div>
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g., Dark mode is too bright"
                maxLength={120}
              />
              {errors.title ? <span className="field-error">{errors.title}</span> : null}
            </div>

            <div className="feedback-field">
              <div className="feedback-label-row feedback-label-row-split">
                <div>
                  <label htmlFor="description">Description</label>
                  <span className="field-required">*</span>
                </div>
                <span className="field-counter">{descriptionLength}/500</span>
              </div>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Please provide as much detail as possible..."
                maxLength={500}
              />
              {errors.description ? <span className="field-error">{errors.description}</span> : null}
            </div>

            <div className="feedback-field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" value={form.category} onChange={handleChange}>
                <option value="Bug">Bug</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Improvement">Improvement</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="feedback-row">
              <div className="feedback-field">
                <label htmlFor="submitterName">Name (Optional)</label>
                <input
                  id="submitterName"
                  name="submitterName"
                  type="text"
                  value={form.submitterName}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                />
              </div>

              <div className="feedback-field">
                <label htmlFor="submitterEmail">Email (Optional)</label>
                <input
                  id="submitterEmail"
                  name="submitterEmail"
                  type="email"
                  value={form.submitterEmail}
                  onChange={handleChange}
                  placeholder="jane@example.com"
                />
                {errors.submitterEmail ? <span className="field-error">{errors.submitterEmail}</span> : null}
              </div>
            </div>

            <button className="feedback-submit-button" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Submitting..." : "Submit Feedback"}</span>
            </button>
          </form>
        </article>

        <div className="feedback-footer">
          <p className="feedback-footnote">
            Protected by rate limits and subject to the Privacy Policy and Terms of Service.
          </p>
        </div>
      </section>

      <ToastStack notices={toast ? [toast] : []} onDismiss={() => setToast(null)} />
    </main>
  );
}
