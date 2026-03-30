"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { ToastStack, type ToastNotice } from "../../components/toast-stack";
import { apiBaseUrl, clearAdminSession, getStoredAdminSession, type AdminSession } from "../../lib/config";

type FeedbackStatus = "New" | "In Review" | "Resolved";
type FeedbackCategory = "Bug" | "Feature Request" | "Improvement" | "Other";
type FeedbackSentiment = "Positive" | "Neutral" | "Negative";

type FeedbackItem = {
  _id: string;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  submitterName?: string;
  submitterEmail?: string;
  ai_sentiment?: FeedbackSentiment;
  ai_priority?: number;
  ai_summary?: string;
  createdAt: string;
};

type FeedbackApiResponse = {
  success?: boolean;
  message?: string;
  data?: FeedbackItem[];
  meta?: {
    page?: number;
    totalPages?: number;
    total?: number;
  };
};

type FeedbackUpdateResponse = {
  success?: boolean;
  message?: string;
  data?: FeedbackItem;
};

type FiltersState = {
  search: string;
  category: string;
  status: string;
  sortBy: string;
};

const initialFilters: FiltersState = {
  search: "",
  category: "",
  status: "",
  sortBy: "newest",
};

const statusOptions: FeedbackStatus[] = ["New", "In Review", "Resolved"];

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getSentimentTone(sentiment?: FeedbackSentiment) {
  if (sentiment === "Positive") return "positive";
  if (sentiment === "Negative") return "negative";
  return "neutral";
}

function getCategoryTone(category: FeedbackCategory) {
  if (category === "Bug") return "danger";
  if (category === "Feature Request") return "accent";
  if (category === "Improvement") return "success";
  return "muted";
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const storedSession = getStoredAdminSession();

    if (!storedSession) {
      router.replace("/login");
      return;
    }

    setSession(storedSession);
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!session) return;

    const activeSession = session;
    let isMounted = true;

    async function loadFeedback() {
      if (isMounted) {
        page === 1 ? setIsLoading(true) : setIsRefreshing(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "10");

        if (filters.search.trim()) params.set("search", filters.search.trim());
        if (filters.category) params.set("category", filters.category);
        if (filters.status) params.set("status", filters.status);

        if (filters.sortBy === "newest") {
          params.set("sortBy", "createdAt");
          params.set("sortOrder", "desc");
        } else if (filters.sortBy === "oldest") {
          params.set("sortBy", "createdAt");
          params.set("sortOrder", "asc");
        } else if (filters.sortBy === "priority") {
          params.set("sortBy", "ai_priority");
          params.set("sortOrder", "desc");
        }

        const response = await fetch(`${apiBaseUrl}/api/feedback?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${activeSession.token}`,
          },
          cache: "no-store",
        });

        const result = (await response.json()) as FeedbackApiResponse;

        if (!response.ok) {
          throw new Error(result.message || "Unable to load feedback.");
        }

        if (!isMounted) return;

        setFeedback(Array.isArray(result.data) ? result.data : []);
        setTotalPages(Math.max(result.meta?.totalPages || 1, 1));
        setTotalItems(result.meta?.total || 0);
      } catch (error) {
        if (!isMounted) return;
        setToast({
          id: "dashboard-load-error",
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to load feedback.",
        });
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    loadFeedback();

    return () => {
      isMounted = false;
    };
  }, [filters, page, session]);

  const metrics = useMemo(() => {
    const openItems = feedback.filter((item) => item.status !== "Resolved").length;
    const priorities = feedback
      .map((item) => item.ai_priority)
      .filter((value): value is number => typeof value === "number");
    const avgPriority = priorities.length
      ? (priorities.reduce((sum, value) => sum + value, 0) / priorities.length).toFixed(1)
      : "0.0";

    const categoryCounts = feedback.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.category] = (accumulator[item.category] || 0) + 1;
      return accumulator;
    }, {});

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return [
      { label: "Total Feedback", value: totalItems || feedback.length, tone: "blue" },
      { label: "Open Items", value: openItems, tone: "orange" },
      { label: "Avg Priority", value: avgPriority, tone: "purple" },
      { label: "Top Category", value: topCategory, tone: "green" },
    ];
  }, [feedback, totalItems]);

  function handleFilterChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function handleStatusChange(feedbackId: string, status: FeedbackStatus) {
    if (!session) return;

    const activeSession = session;
    setActiveItemId(feedbackId);

    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeSession.token}`,
        },
        body: JSON.stringify({ status }),
      });

      const result = (await response.json()) as FeedbackUpdateResponse;

      if (!response.ok || !result.data) {
        throw new Error(result.message || "Unable to update status.");
      }

      setFeedback((current) => current.map((item) => (item._id === feedbackId ? result.data! : item)));
      setToast({
        id: `status-${feedbackId}`,
        tone: "success",
        message: "Feedback status updated.",
      });
    } catch (error) {
      setToast({
        id: `status-error-${feedbackId}`,
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to update status.",
      });
    } finally {
      setActiveItemId(null);
    }
  }

  function handleLogout() {
    clearAdminSession();
    router.replace("/login");
  }

  return (
    <main className="dashboard-shell">
      <div className="feedback-glow feedback-glow-left" />
      <div className="feedback-glow feedback-glow-right" />

      <section className="dashboard-stage">
        <header className="dashboard-topbar">
          <div className="dashboard-brand">
            <span className="dashboard-brand-mark" aria-hidden="true" />
            <div className="dashboard-brand-copy">
              <span className="dashboard-brand-name">FeedPulse</span>
              <span className="dashboard-brand-meta">Admin</span>
            </div>
          </div>

          <div className="dashboard-topbar-actions">
            <span className="dashboard-user-chip">{session?.email || "Admin"}</span>
            <button type="button" className="dashboard-logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-metrics-grid" aria-label="Dashboard metrics">
          {metrics.map((item) => (
            <article key={item.label} className="dashboard-metric-card">
              <div className={`dashboard-metric-icon dashboard-metric-icon-${item.tone}`} aria-hidden="true" />
              <span className="dashboard-metric-label">{item.label}</span>
              <strong className="dashboard-metric-value">{item.value}</strong>
            </article>
          ))}
        </section>

        <section className="dashboard-filter-bar" aria-label="Feedback filters">
          <div className="dashboard-search-field">
            <input
              type="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by title or summary..."
            />
          </div>

          <select name="category" value={filters.category} onChange={handleFilterChange}>
            <option value="">All Categories</option>
            <option value="Bug">Bug</option>
            <option value="Feature Request">Feature Request</option>
            <option value="Improvement">Improvement</option>
            <option value="Other">Other</option>
          </select>

          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="In Review">In Review</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Highest Priority</option>
          </select>
        </section>

        <section className="dashboard-list-shell">
          <div className="dashboard-list-header">
            <div>
              <h1>Feedback Queue</h1>
              <p>Review incoming feedback, update status, and keep your team aligned.</p>
            </div>
            {isRefreshing ? <span className="dashboard-refresh-state">Refreshing...</span> : null}
          </div>

          {isLoading ? (
            <div className="dashboard-loading-list" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="dashboard-skeleton-row" />
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <div className="dashboard-empty-state">
              <h2>No feedback found</h2>
              <p>Try adjusting your filters or search terms to see more results.</p>
            </div>
          ) : (
            <div className="dashboard-feedback-list">
              {feedback.map((item) => (
                <article key={item._id} className="dashboard-feedback-row">
                  <div className="dashboard-feedback-main">
                    <div className="dashboard-feedback-title-row">
                      <h2>{item.title}</h2>
                      <div className="dashboard-pill-group">
                        <span className={`dashboard-pill dashboard-pill-${getCategoryTone(item.category)}`}>
                          {item.category}
                        </span>
                        {item.ai_sentiment ? (
                          <span className={`dashboard-pill dashboard-pill-${getSentimentTone(item.ai_sentiment)}`}>
                            {item.ai_sentiment}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <p className="dashboard-feedback-summary">{item.ai_summary || item.description}</p>

                    <div className="dashboard-feedback-meta">
                      <span>{item.ai_priority ? `P${item.ai_priority}` : "No priority"}</span>
                      <span>{item.status}</span>
                      <span>{formatDate(item.createdAt)}</span>
                      <span>{item.submitterName || item.submitterEmail || "Anonymous"}</span>
                    </div>
                  </div>

                  <div className="dashboard-feedback-actions">
                    <select
                      value={item.status}
                      onChange={(event) => handleStatusChange(item._id, event.target.value as FeedbackStatus)}
                      disabled={activeItemId === item._id}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <Link href={`/dashboard?feedback=${item._id}`} className="dashboard-view-link">
                      View
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <footer className="dashboard-pagination">
            <span>
              Showing {feedback.length === 0 ? 0 : (page - 1) * 10 + 1}-{(page - 1) * 10 + feedback.length} of {totalItems}
            </span>

            <div className="dashboard-pagination-controls">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                Prev
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      </section>

      <ToastStack notices={toast ? [toast] : []} onDismiss={() => setToast(null)} />
    </main>
  );
}
