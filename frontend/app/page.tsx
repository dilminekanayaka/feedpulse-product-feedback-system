"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";

import { apiBaseUrl } from "../lib/config";

type Category = "Bug" | "Feature Request" | "Improvement" | "Other";
type FormDataState = { title: string; description: string; category: Category; submitterName: string; submitterEmail: string; };
type FormErrors = Partial<Record<keyof FormDataState, string>>;
type ApiSuccessResponse = { success: boolean; message: string; };

const initialForm: FormDataState = { title: "", description: "", category: "Feature Request", submitterName: "", submitterEmail: "" };

function validateForm(values: FormDataState) {
  const errors: FormErrors = {};
  if (!values.title.trim()) errors.title = "Please add a short title for your feedback.";
  if (!values.description.trim()) errors.description = "Please describe the issue or idea.";
  else if (values.description.trim().length < 20) errors.description = "Description must be at least 20 characters long.";
  if (values.submitterEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.submitterEmail.trim())) errors.submitterEmail = "Please enter a valid email address.";
  return errors;
}

export default function HomePage() {
  const [form, setForm] = useState<FormDataState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) { setErrors(nextErrors); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = (await response.json()) as ApiSuccessResponse & { error?: string | null };
      if (!response.ok || !result.success) throw new Error(result.message || "Something went wrong while sending feedback.");
      setSuccessMessage("Feedback submitted successfully. Thanks for helping us improve FeedPulse.");
      setForm(initialForm);
      setErrors({});
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const descriptionLength = form.description.trim().length;

  return (
    <main className="page-shell">
      <div className="page-grid">
        <section className="hero-card">
          <span className="hero-kicker">FeedPulse Public Portal</span>
          <h1 className="hero-title">Tell us what should get better next.</h1>
          <p className="hero-text">Share bugs, product ideas, improvements, or rough edges. Every submission is stored, analyzed, and routed into our review workflow.</p>
          <ul className="hero-list">
            <li><strong>No login needed</strong>Anyone can submit product feedback in a few minutes.</li>
            <li><strong>Built for real product teams</strong>Each response is categorized and prepared for admin review.</li>
            <li><strong>Clear and respectful</strong>Leave as much detail as you can. Better detail leads to better decisions.</li>
          </ul>
          <div className="tag-row"><Link href="/login" className="secondary-button">Admin login</Link></div>
        </section>
        <section className="form-card">
          <div className="form-header">
            <h2 className="form-title">Submit feedback</h2>
            <p className="form-subtitle">A strong submission explains what happened, where it happened, and why it matters. The more specific you are, the easier it is to act on it.</p>
          </div>
          <form className="feedback-form" onSubmit={handleSubmit} noValidate>
            <div className="field"><label htmlFor="title">Title</label><input id="title" name="title" type="text" placeholder="Example: Dashboard needs dark mode" value={form.title} onChange={handleChange} maxLength={120} />{errors.title ? <span className="error-text">{errors.title}</span> : null}</div>
            <div className="field"><label htmlFor="description">Description</label><textarea id="description" name="description" placeholder="Describe the issue or request in at least 20 characters." value={form.description} onChange={handleChange} /><div className="field-hint-row"><span>Minimum 20 characters.</span><span>{descriptionLength} characters</span></div>{errors.description ? <span className="error-text">{errors.description}</span> : null}</div>
            <div className="field-grid"><div className="field"><label htmlFor="category">Category</label><select id="category" name="category" value={form.category} onChange={handleChange}><option value="Bug">Bug</option><option value="Feature Request">Feature Request</option><option value="Improvement">Improvement</option><option value="Other">Other</option></select></div><div className="field"><label htmlFor="submitterName">Name (optional)</label><input id="submitterName" name="submitterName" type="text" placeholder="Your name" value={form.submitterName} onChange={handleChange} /></div></div>
            <div className="field"><label htmlFor="submitterEmail">Email (optional)</label><input id="submitterEmail" name="submitterEmail" type="email" placeholder="you@example.com" value={form.submitterEmail} onChange={handleChange} />{errors.submitterEmail ? <span className="error-text">{errors.submitterEmail}</span> : null}</div>
            {successMessage ? <div className="status-banner success">{successMessage}</div> : null}
            {errorMessage ? <div className="status-banner error">{errorMessage}</div> : null}
            <div className="submit-row"><p className="submit-note">By submitting, you are helping the team prioritize what matters most. We only use your email if you choose to include it.</p><button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Send feedback"}</button></div>
          </form>
        </section>
      </div>
    </main>
  );
}

