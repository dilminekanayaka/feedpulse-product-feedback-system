"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiBaseUrl, clearAdminSession, getStoredAdminSession } from "../../lib/config";

type FeedbackItem = {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  submitterName: string;
  submitterEmail: string;
  ai_category: string | null;
  ai_sentiment: string | null;
  ai_priority: number | null;
  ai_summary: string;
  ai_tags: string[];
  ai_processed: boolean;
  createdAt: string;
  updatedAt: string;
};

type FeedbackListResponse = {
  success: boolean;
  message: string;
  data: FeedbackItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sortBy: string;
    sortOrder: string;
    search: string;
  };
};

type SummaryResponse = {
  success: boolean;
  data?: {
    period_days: number;
    total_feedback: number;
    summary: string;
    themes: string[];
  };
  message: string;
};

const categoryOptions = ["", "Bug", "Feature Request", "Improvement", "Other"];
const statusOptions = ["", "New", "In Review", "Resolved"];
const sortOptions = [
  { value: "createdAt", label: "Newest" },
  { value: "ai_priority", label: "Priority" },
  { value: "ai_sentiment", label: "Sentiment" },
  { value: "title", label: "Title" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [summary, setSummary] = useState<SummaryResponse["data"]>();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    const session = getStoredAdminSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    setToken(session.token);
    setAdminEmail(session.email);
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function loadFeedback() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sortBy,
          sortOrder,
        });

        if (category) params.set("category", category);
        if (status) params.set("status", status);
        if (search) params.set("search", search);

        const response = await fetch(`${apiBaseUrl}/api/feedback?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = (await response.json()) as FeedbackListResponse & { error?: string | null };

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load feedback.");
        }

        setFeedback(result.data);
        setTotalPages(result.meta?.totalPages || 1);
        setTotal(result.meta?.total || result.data.length);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load feedback.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadFeedback();
  }, [category, limit, page, search, sortBy, sortOrder, status, token]);

  useEffect(() => {
    if (!token) return;

    async function loadSummary() {
      setIsSummaryLoading(true);

      try {
        const response = await fetch(`${apiBaseUrl}/api/feedback/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = (await response.json()) as SummaryResponse & { error?: string | null };

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Unable to load summary.");
        }

        setSummary(result.data);
      } catch {
        setSummary(undefined);
      } finally {
        setIsSummaryLoading(false);
      }
    }

    void loadSummary();
  }, [token]);

  const openCount = useMemo(() => feedback.filter((item) => item.status !== "Resolved").length, [feedback]);

  const averagePriority = useMemo(() => {
    const values = feedback.map((item) => item.ai_priority).filter((value): value is number => typeof value === "number");
    if (values.length === 0) return "-";
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
  }, [feedback]);

  function handleLogout() {
    clearAdminSession();
    router.push("/login");
  }

  async function handleStatusUpdate(id: string, nextStatus: string) {
    if (!token) return;
    setUpdatingId(id);
    setActionMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = (await response.json()) as { success: boolean; message: string; data?: FeedbackItem };
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to update status.");
      }

      setFeedback((current) => current.map((item) => (item._id === id ? result.data! : item)));
      setActionMessage("Feedback status updated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update status.");
    } finally {
      setUpdatingId("");
    }
  }

  async function handleReanalyze(id: string) {
    if (!token) return;
    setUpdatingId(id);
    setActionMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback/${id}/reanalyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = (await response.json()) as { success: boolean; message: string; data?: FeedbackItem };
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to re-run AI analysis.");
      }

      setFeedback((current) => current.map((item) => (item._id === id ? result.data! : item)));
      setActionMessage("AI analysis refreshed for the selected feedback item.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to re-run AI analysis.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="page-shell">
      <div className="dashboard-shell">
        <section className="dashboard-header-card">
          <div>
            <span className="hero-kicker">Admin Dashboard</span>
            <h1 className="dashboard-title">Review feedback, trends, and AI insights.</h1>
            <p className="dashboard-text">
              Signed in as <strong>{adminEmail || "admin"}</strong>. Search the incoming queue, re-run AI analysis, and move feedback through the review flow.
            </p>
          </div>
          <div className="dashboard-header-actions">
            <Link href="/" className="subtle-link">Open public form</Link>
            <button type="button" className="secondary-button" onClick={handleLogout}>Log out</button>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card"><span className="stat-label">Visible feedback</span><strong className="stat-value">{total}</strong></article>
          <article className="stat-card"><span className="stat-label">Open items on this page</span><strong className="stat-value">{openCount}</strong></article>
          <article className="stat-card"><span className="stat-label">Average AI priority</span><strong className="stat-value">{averagePriority}</strong></article>
          <article className="stat-card stat-card-wide">
            <span className="stat-label">Last 7 days summary</span>
            {isSummaryLoading ? <p className="stat-copy">Loading summary...</p> : summary ? <><p className="stat-copy">{summary.summary}</p><div className="tag-row">{summary.themes.map((theme) => <span key={theme} className="tag-chip">{theme}</span>)}</div></> : <p className="stat-copy">Summary unavailable right now.</p>}
          </article>
        </section>

        <section className="dashboard-panel">
          <div className="filters-grid">
            <div className="field"><label htmlFor="search">Search</label><input id="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Search title or AI summary" /></div>
            <div className="field"><label htmlFor="category-filter">Category</label><select id="category-filter" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>{categoryOptions.map((option) => <option key={option || "all"} value={option}>{option || "All categories"}</option>)}</select></div>
            <div className="field"><label htmlFor="status-filter">Status</label><select id="status-filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{statusOptions.map((option) => <option key={option || "all"} value={option}>{option || "All statuses"}</option>)}</select></div>
            <div className="field"><label htmlFor="sort-by">Sort by</label><select id="sort-by" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <div className="field"><label htmlFor="sort-order">Order</label><select id="sort-order" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></div>
          </div>

          {actionMessage ? <div className="status-banner success">{actionMessage}</div> : null}
          {errorMessage ? <div className="status-banner error">{errorMessage}</div> : null}

          {isLoading ? <div className="dashboard-empty">Loading feedback...</div> : feedback.length === 0 ? <div className="dashboard-empty">No feedback matches the current filters.</div> : <div className="feedback-list">{feedback.map((item) => <article key={item._id} className="feedback-item-card"><div className="feedback-item-header"><div><h2>{item.title}</h2><p className="feedback-meta-line">{item.category} · {new Date(item.createdAt).toLocaleString()}</p></div><div className="feedback-badges"><span className="badge neutral">Status: {item.status}</span><span className={`badge ${(item.ai_sentiment || "neutral").toLowerCase()}`}>{item.ai_sentiment || "No sentiment"}</span><span className="badge priority">Priority: {item.ai_priority ?? "-"}</span></div></div><p className="feedback-description">{item.description}</p><div className="feedback-ai-panel"><strong>AI summary</strong><p>{item.ai_summary || "Gemini summary not available yet."}</p><div className="tag-row">{item.ai_tags.length > 0 ? item.ai_tags.map((tag) => <span key={tag} className="tag-chip">{tag}</span>) : <span className="tag-chip muted">No tags</span>}</div></div><div className="feedback-footer-row"><div className="feedback-contact"><span>{item.submitterName || "Anonymous"}</span><span>{item.submitterEmail || "No email provided"}</span></div><div className="feedback-actions"><select value={item.status} disabled={updatingId === item._id} onChange={(event) => void handleStatusUpdate(item._id, event.target.value)}><option value="New">New</option><option value="In Review">In Review</option><option value="Resolved">Resolved</option></select><button type="button" className="secondary-button" disabled={updatingId === item._id} onClick={() => void handleReanalyze(item._id)}>{updatingId === item._id ? "Working..." : "Re-run AI"}</button></div></div></article>)}</div>}

          <div className="pagination-row"><span>Page {page} of {totalPages}</span><div className="pagination-actions"><button type="button" className="secondary-button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)}>Previous</button><button type="button" className="secondary-button" disabled={page >= totalPages || isLoading} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
        </section>
      </div>
    </main>
  );
}

