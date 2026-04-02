
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { ToastStack, type ToastNotice } from "../../components/toast-stack";
import {
  apiBaseUrl,
  clearAdminSession,
  consumePendingToast,
  getStoredAdminSession,
  setPendingToast,
  type AdminSession,
} from "../../lib/config";

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
  ai_category?: FeedbackCategory;
  ai_sentiment?: FeedbackSentiment;
  ai_priority?: number;
  ai_summary?: string;
  ai_tags?: string[];
  ai_processed?: boolean;
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

type SummaryData = {
  period_days: number;
  total_feedback: number;
  summary: string;
  themes: string[];
};

type SummaryResponse = {
  success?: boolean;
  message?: string;
  data?: SummaryData;
};

type WeeklySummaryData = {
  source: string;
  periodStart: string;
  periodEnd: string;
  totalFeedback: number;
  summary: string;
  themes: string[];
  generatedAt: string;
};

type WeeklySummaryResponse = {
  success?: boolean;
  message?: string;
  data?: WeeklySummaryData;
};

type FiltersState = {
  search: string;
  category: string;
  status: string;
  sortBy: string;
};

type PendingDeleteState = {
  kind: "single" | "bulk";
  ids: string[];
  title?: string;
};

const statusOptions: FeedbackStatus[] = ["New", "In Review", "Resolved"];
const defaultFilters: FiltersState = { search: "", category: "", status: "", sortBy: "newest" };

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(value: string | null) {
  if (!value) return "Not refreshed yet";
  const date = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - date) / 60000));
  if (diffMinutes < 60) return `Generated ${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Generated ${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  return `Generated ${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function priorityLabel(value?: number) {
  if (typeof value !== "number") return "Low";
  if (value >= 8) return "Critical";
  if (value >= 6) return "High";
  if (value >= 4) return "Medium";
  return "Low";
}

function getPriorityClass(value?: number) {
  if (typeof value !== "number") return "low";
  if (value >= 8) return "critical";
  if (value >= 6) return "high";
  if (value >= 4) return "medium";
  return "low";
}

function getCategoryClass(category: FeedbackCategory) {
  if (category === "Bug") return "bug";
  if (category === "Feature Request") return "feature";
  if (category === "Improvement") return "improve";
  return "other";
}

function getSentimentClass(sentiment?: FeedbackSentiment) {
  if (sentiment === "Positive") return "positive";
  if (sentiment === "Negative") return "negative";
  return "neutral";
}

function getStatusClass(status: FeedbackStatus) {
  if (status === "Resolved") return "resolved";
  if (status === "In Review") return "in-progress";
  return "new";
}

function readFilters(searchParams: URLSearchParams): FiltersState {
  return {
    search: searchParams.get("search") ?? "",
    category: searchParams.get("category") ?? "",
    status: searchParams.get("status") ?? "",
    sortBy: searchParams.get("sort") ?? "newest",
  };
}

function readPage(searchParams: URLSearchParams) {
  const value = Number(searchParams.get("page") ?? "1");
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerPanelRef = useRef<HTMLElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const [session, setSession] = useState<AdminSession | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingError, setIsLoadingError] = useState<string | null>(null);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryRefreshedAt, setSummaryRefreshedAt] = useState<string | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);

  const selectedFeedback = useMemo(() => feedback.find((item) => item._id === selectedId) ?? null, [feedback, selectedId]);

  useEffect(() => {
    const storedSession = getStoredAdminSession();
    if (!storedSession) {
      router.replace("/login");
      return;
    }
    setSession(storedSession);
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextFilters = readFilters(params);
    const nextPage = readPage(params);
    const nextSelectedId = params.get("item");

    setFilters((current) =>
      current.search === nextFilters.search &&
      current.category === nextFilters.category &&
      current.status === nextFilters.status &&
      current.sortBy === nextFilters.sortBy
        ? current
        : nextFilters,
    );
    setSearchInput((current) => (current === nextFilters.search ? current : nextFilters.search));
    setPage((current) => (current === nextPage ? current : nextPage));
    setSelectedId((current) => (current === nextSelectedId ? current : nextSelectedId));
  }, [searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => (current.search === searchInput ? current : { ...current, search: searchInput }));
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.category) params.set("category", filters.category);
    if (filters.status) params.set("status", filters.status);
    if (filters.sortBy !== "newest") params.set("sort", filters.sortBy);
    if (page > 1) params.set("page", String(page));
    if (selectedId) params.set("item", selectedId);

    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const current = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [filters, page, pathname, router, searchParams, selectedId]);

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
  useEffect(() => {
    if (!selectedFeedback) return;

    detailCloseButtonRef.current?.focus();

    function handleDrawerKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Tab" || !drawerPanelRef.current) return;
      const focusable = drawerPanelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleDrawerKey);
    return () => {
      window.removeEventListener("keydown", handleDrawerKey);
      lastFocusedElementRef.current?.focus();
    };
  }, [selectedFeedback]);

  useEffect(() => {
    if (!selectedId || selectedFeedback) return;
    setSelectedId(null);
  }, [selectedFeedback, selectedId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!selectedId) return;
      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }

      const currentIndex = feedback.findIndex((item) => item._id === selectedId);
      if (currentIndex === -1) return;

      if (event.key.toLowerCase() === "j" && feedback[currentIndex + 1]) {
        setSelectedId(feedback[currentIndex + 1]._id);
      }

      if (event.key.toLowerCase() === "k" && feedback[currentIndex - 1]) {
        setSelectedId(feedback[currentIndex - 1]._id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [feedback, selectedId]);

  async function loadSummary(activeSession: AdminSession, silent = false) {
    if (!silent) setSummaryBusy(true);

    try {
      const [liveResponse, weeklyResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/feedback/summary`, {
          headers: { Authorization: `Bearer ${activeSession.token}` },
          cache: "no-store",
        }),
        fetch(`${apiBaseUrl}/api/feedback/summary/weekly/latest`, {
          headers: { Authorization: `Bearer ${activeSession.token}` },
          cache: "no-store",
        }),
      ]);

      const liveResult = (await liveResponse.json()) as SummaryResponse;
      const weeklyResult = (await weeklyResponse.json()) as WeeklySummaryResponse;

      if (!liveResponse.ok || !liveResult.data) {
        throw new Error(liveResult.message || "Unable to load AI summary.");
      }

      setSummary(liveResult.data);
      setSummaryRefreshedAt(new Date().toISOString());
      setWeeklySummary(weeklyResponse.ok && weeklyResult.data ? weeklyResult.data : null);
    } catch (error) {
      if (!silent) {
        setToast({ id: "dashboard-summary-error", tone: "error", message: error instanceof Error ? error.message : "Unable to load AI summary." });
      }
    } finally {
      setSummaryBusy(false);
    }
  }

  async function loadFeedback(activeSession: AdminSession) {
    setIsLoadingError(null);
    if (page === 1 && feedback.length === 0) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
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
      } else {
        params.set("sortBy", "ai_priority");
        params.set("sortOrder", "desc");
      }

      const response = await fetch(`${apiBaseUrl}/api/feedback?${params.toString()}`, {
        headers: { Authorization: `Bearer ${activeSession.token}` },
        cache: "no-store",
      });

      const result = (await response.json()) as FeedbackApiResponse;
      if (!response.ok) {
        throw new Error(result.message || "Unable to load feedback.");
      }

      setFeedback(Array.isArray(result.data) ? result.data : []);
      setTotalPages(Math.max(result.meta?.totalPages || 1, 1));
      setTotalItems(result.meta?.total || 0);
    } catch (error) {
      setIsLoadingError(error instanceof Error ? error.message : "Unable to load feedback.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    void loadFeedback(session);
    void loadSummary(session, true);
  }, [filters, page, session]);

  const metrics = useMemo(() => {
    const openItems = feedback.filter((item) => item.status !== "Resolved").length;
    const priorities = feedback.map((item) => item.ai_priority).filter((value): value is number => typeof value === "number");
    const avgPriority = priorities.length ? (priorities.reduce((sum, value) => sum + value, 0) / priorities.length).toFixed(1) : "0.0";
    const categoryCounts = feedback.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.category] = (accumulator[item.category] || 0) + 1;
      return accumulator;
    }, {});
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return [
      { label: "Total feedback", value: totalItems || feedback.length, context: "All submitted items" },
      { label: "Open items", value: openItems, context: "Needs triage or follow-up" },
      { label: "Avg priority", value: avgPriority, context: "Across AI-scored items" },
      { label: "Top category", value: topCategory, context: "Most common theme" },
    ];
  }, [feedback, totalItems]);

  function handleFilterChange(name: keyof FiltersState, value: string) {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setSearchInput("");
    setPage(1);
    setFilters(defaultFilters);
  }

  async function handleCopyPortal() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/`);
      setToast({ id: "portal-link", tone: "success", message: "Portal link copied to clipboard." });
    } catch {
      setToast({ id: "portal-link-error", tone: "error", message: "Unable to copy portal link." });
    }
  }

  async function handleStatusChange(feedbackId: string, status: FeedbackStatus) {
    if (!session) return;

    const previous = feedback.find((item) => item._id === feedbackId);
    if (!previous) return;

    setActiveActionKey(`status:${feedbackId}`);
    setFeedback((current) => current.map((item) => (item._id === feedbackId ? { ...item, status } : item)));

    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ status }),
      });

      const result = (await response.json()) as FeedbackUpdateResponse;
      if (!response.ok || !result.data) {
        throw new Error(result.message || "Unable to update status.");
      }

      setFeedback((current) => current.map((item) => (item._id === feedbackId ? result.data! : item)));
      setToast({ id: `status-${feedbackId}`, tone: "success", message: `Status updated to ${status}.` });
    } catch (error) {
      setFeedback((current) => current.map((item) => (item._id === feedbackId ? previous : item)));
      setToast({ id: `status-error-${feedbackId}`, tone: "error", message: error instanceof Error ? error.message : "Unable to update status." });
    } finally {
      setActiveActionKey(null);
    }
  }

  async function handleReanalyze(feedbackId: string) {
    if (!session) return;

    setActiveActionKey(`reanalyze:${feedbackId}`);
    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback/${feedbackId}/reanalyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });

      const result = (await response.json()) as FeedbackUpdateResponse;
      if (!response.ok || !result.data) {
        throw new Error(result.message || "Unable to re-run AI analysis.");
      }

      setFeedback((current) => current.map((item) => (item._id === feedbackId ? result.data! : item)));
      const tone = result.data.ai_processed === false ? "error" : "success";
      const message = tone === "success"
        ? result.message || `AI analysis refreshed for ${result.data.title}.`
        : result.message || `AI was unavailable for ${result.data.title}, so fallback values were kept.`;
      setToast({ id: `reanalyze-${feedbackId}`, tone, message });
      await Promise.all([loadFeedback(session), loadSummary(session, true)]);
    } catch (error) {
      setToast({ id: `reanalyze-error-${feedbackId}`, tone: "error", message: error instanceof Error ? error.message : "Unable to re-run AI analysis." });
    } finally {
      setActiveActionKey(null);
    }
  }
  async function handleDelete(feedbackId: string) {
    if (!session) return;

    const target = feedback.find((item) => item._id === feedbackId);
    if (!target) return;

    setActiveActionKey(`delete:${feedbackId}`);

    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback/${feedbackId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });

      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to delete feedback.");
      }

      setFeedback((current) => current.filter((item) => item._id !== feedbackId));
      setSelectedIds((current) => current.filter((id) => id !== feedbackId));
      setSelectedId((current) => (current === feedbackId ? null : current));
      setTotalItems((current) => Math.max(0, current - 1));
      setToast({ id: `delete-${feedbackId}`, tone: "success", message: "Feedback deleted successfully." });
      await Promise.all([loadSummary(session, true), loadFeedback(session)]);
    } catch (error) {
      setToast({ id: `delete-error-${feedbackId}`, tone: "error", message: error instanceof Error ? error.message : "Unable to delete feedback." });
    } finally {
      setActiveActionKey(null);
    }
  }

  function handleLogout() {
    clearAdminSession();
    setPendingToast({ id: "logout-success", tone: "success", message: "Logged out successfully." });
    router.replace("/login");
  }

  function toggleSelected(feedbackId: string) {
    setSelectedIds((current) => current.includes(feedbackId) ? current.filter((id) => id !== feedbackId) : [...current, feedbackId]);
  }

  async function handleBulkResolve() {
    if (!session || selectedIds.length === 0) return;
    setActiveActionKey("bulk:resolve");

    try {
      await Promise.all(
        selectedIds.map((feedbackId) =>
          fetch(`${apiBaseUrl}/api/feedback/${feedbackId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({ status: "Resolved" }),
          }),
        ),
      );

      await loadFeedback(session);
      setSelectedIds([]);
      setToast({ id: "bulk-resolve", tone: "success", message: "Selected feedback marked as resolved." });
    } catch {
      setToast({ id: "bulk-resolve-error", tone: "error", message: "Unable to update selected feedback." });
    } finally {
      setActiveActionKey(null);
    }
  }

  function toggleAllVisible() {
    const visibleIds = feedback.map((item) => item._id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allVisibleSelected ? [] : visibleIds);
  }

  async function handleBulkDelete() {
    if (!session || selectedIds.length === 0) return;
    setActiveActionKey("bulk:delete");

    try {
      await Promise.all(
        selectedIds.map((feedbackId) =>
          fetch(`${apiBaseUrl}/api/feedback/${feedbackId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.token}` },
          }),
        ),
      );

      await Promise.all([loadFeedback(session), loadSummary(session, true)]);
      setSelectedIds([]);
      setSelectedId(null);
      setToast({ id: "bulk-delete", tone: "success", message: "Selected feedback deleted." });
    } catch {
      setToast({ id: "bulk-delete-error", tone: "error", message: "Unable to delete selected feedback." });
    } finally {
      setActiveActionKey(null);
    }
  }

  function requestDelete(feedbackId: string) {
    const target = feedback.find((item) => item._id === feedbackId);
    if (!target) return;
    setPendingDelete({ kind: "single", ids: [feedbackId], title: target.title });
  }

  function requestBulkDelete() {
    if (selectedIds.length === 0) return;
    setPendingDelete({ kind: "bulk", ids: selectedIds });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.kind === "bulk") {
      await handleBulkDelete();
    } else {
      await handleDelete(pendingDelete.ids[0]);
    }

    setPendingDelete(null);
  }

  function handleOpenDetails(itemId: string) {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setSelectedId(itemId);
  }

  return (
    <main className="dashboard-shell layout-shell">
      <div className="app-glow app-glow-left" />
      <div className="app-glow app-glow-right" />

      <section className="dashboard-stage layout-content">
        <header className="dashboard-topbar page-header dashboard-topbar-premium">
          <div className="dashboard-hero-copy">
            <div className="brand-copy brand-copy-standalone">
              <span className="brand-name">FeedPulse</span>
            </div>
          </div>

          <div className="dashboard-topbar-actions">
            <span className="dashboard-user-chip">{session?.email || "Admin"}</span>
            <button type="button" className="button button-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="stats-grid" aria-label="Dashboard overview">
          {metrics.map((item) => (
            <article key={item.label} className="stat-card">
              <span className="stat-label">{item.label}</span>
              <strong className="stat-value">{item.value}</strong>
              <span className="stat-context">{item.context}</span>
            </article>
          ))}
        </section>

        <section className="ai-panels" aria-label="AI summaries">
          <article className="panel ai-summary-panel">
            <div className="panel-header ai-summary-panel-header">
              <div>
                <h2 className="panel-title">Last 7 Days AI Summary</h2>
                <p className="panel-description">Top patterns detected across the most recent feedback submissions.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => session && loadSummary(session)} disabled={summaryBusy} aria-label="Refresh AI summary" title="Refresh AI summary">
                ?
              </button>
            </div>

            <div className={`ai-summary-box ${summaryBusy ? "is-busy" : ""}`}>
              <p className="ai-summary-copy">{summary?.summary || "AI summary will appear here once feedback is available for analysis."}</p>
              <span className="ai-summary-freshness">{summaryBusy ? "Refreshing summary..." : formatRelativeTime(summaryRefreshedAt)}</span>
            </div>
          </article>

          <article className="panel ai-summary-panel">
            <div className="panel-header ai-summary-panel-header">
              <div>
                <h2 className="panel-title">Latest Weekly Summary</h2>
                <p className="panel-description">Most recent scheduled AI snapshot stored by the backend automation.</p>
              </div>
            </div>

            <div className="ai-summary-box ai-summary-box-secondary">
              <p className="ai-summary-copy">{weeklySummary?.summary || "No weekly snapshot has been generated yet. The scheduler will store one after the first configured run."}</p>
              <span className="ai-summary-freshness">{weeklySummary ? `Generated ${formatDateTime(weeklySummary.generatedAt)}` : "Waiting for the first scheduled run"}</span>
            </div>

            {weeklySummary ? (
              <div className="dashboard-weekly-meta">
                <span className="dashboard-meta-chip">{weeklySummary.totalFeedback} feedback items</span>
                <span className="dashboard-meta-chip">{formatDate(weeklySummary.periodStart)} - {formatDate(weeklySummary.periodEnd)}</span>
              </div>
            ) : null}
          </article>
        </section>

        <section className="panel filter-row" aria-label="Feedback filters">
          <div className="search-input-wrap">
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by title or AI summary" aria-label="Search feedback" />
            {searchInput ? (
              <button type="button" className="search-clear-button" onClick={() => setSearchInput("")} aria-label="Clear search">
                ×
              </button>
            ) : null}
          </div>

          <div className="select-wrap select-wrap-modern">
            <select name="category" value={filters.category} onChange={(event) => handleFilterChange("category", event.target.value)} aria-label="Filter by category">
              <option value="">All categories</option>
              <option value="Bug">Bug</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Improvement">Improvement</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="select-wrap select-wrap-modern">
            <select name="status" value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="New">New</option>
              <option value="In Review">In Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="select-wrap select-wrap-modern">
            <select name="sortBy" value={filters.sortBy} onChange={(event) => handleFilterChange("sortBy", event.target.value)} aria-label="Sort feedback">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Highest priority</option>
            </select>
          </div>
        </section>
        <section className="panel dashboard-list-panel">
          <div className="panel-header dashboard-list-header">
            <div>
              <h1 className="panel-title">Feedback Queue</h1>
              <p className="panel-description">Review incoming submissions, update status, and keep the product team aligned on what matters most.</p>
            </div>
            <span className="dashboard-refresh-state">{isRefreshing ? "Refreshing..." : `${totalItems} total items`}</span>
          </div>

          {selectedIds.length > 0 ? (
            <div className="bulk-action-bar" aria-live="polite">
              <div className="bulk-action-copy">
                <strong>{selectedIds.length} selected</strong>
                <span>Apply an action to the selected feedback items.</span>
              </div>
              <div className="bulk-action-controls">
                <button type="button" className="button button-ghost button-compact" onClick={toggleAllVisible}>
                  {feedback.length > 0 && feedback.every((item) => selectedIds.includes(item._id)) ? "Clear page" : "Select all"}
                </button>
                <button type="button" className="button button-secondary button-compact" onClick={handleBulkResolve} disabled={activeActionKey === "bulk:resolve"}>
                  {activeActionKey === "bulk:resolve" ? "Saving..." : "Mark resolved"}
                </button>
                <button type="button" className="button button-danger button-compact" onClick={requestBulkDelete} disabled={activeActionKey === "bulk:delete" || activeActionKey === "bulk:resolve"}>
                  {activeActionKey === "bulk:delete" ? "Deleting..." : "Delete selected"}
                </button>
                <button type="button" className="button button-ghost button-compact" onClick={() => setSelectedIds([])}>
                  Clear selection
                </button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="dashboard-loading-list" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="dashboard-skeleton-row" />)}
            </div>
          ) : isLoadingError ? (
            <div className="dashboard-empty-state dashboard-error-state">
              <h2>Could not load feedback</h2>
              <p>{isLoadingError}</p>
              <button type="button" className="button button-primary" onClick={() => session && loadFeedback(session)}>
                Retry
              </button>
            </div>
          ) : feedback.length === 0 ? (
            <div className="dashboard-empty-state">
              <h2>{filters.search || filters.category || filters.status ? "No results match your filters" : "No feedback yet"}</h2>
              <p>
                {filters.search || filters.category || filters.status
                  ? "Try adjusting your filters or search terms to see more results."
                  : "Share your feedback portal to start collecting submissions."}
              </p>
              <div className="empty-state-actions">
                {filters.search || filters.category || filters.status ? (
                  <button type="button" className="button button-secondary" onClick={clearFilters}>
                    Clear all filters
                  </button>
                ) : (
                  <button type="button" className="button button-primary" onClick={handleCopyPortal}>
                    Copy portal URL
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="dashboard-feedback-list">
              {feedback.map((item) => (
                <article key={item._id} className={`feedback-card ${getCategoryClass(item.category)} priority-${getPriorityClass(item.ai_priority)} ${selectedIds.includes(item._id) ? "is-selected" : ""}`}>
                  <div className="feedback-card-header">
                    <label className="select-checkbox-wrap feedback-select-box">
                      <input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => toggleSelected(item._id)} aria-label={`Select ${item.title}`} />
                      <span className="select-checkbox-ui" aria-hidden="true" />
                    </label>

                    <div className="feedback-card-title-group">
                      <h2>{item.title}</h2>
                      <div className="feedback-badge-row">
                        <span className={`badge-type ${getCategoryClass(item.category)}`}>{item.category}</span>
                        {item.ai_sentiment ? <span className={`badge-sentiment ${getSentimentClass(item.ai_sentiment)}`}>{item.ai_sentiment}</span> : null}
                        <span className={`badge-priority priority-${getPriorityClass(item.ai_priority)}`}>{priorityLabel(item.ai_priority)}</span>
                        <span className={`badge-status ${getStatusClass(item.status)}`}>{item.status}</span>
                      </div>
                    </div>

                    <div className="select-wrap select-wrap-modern select-wrap-compact feedback-status-select">
                      <select value={item.status} onChange={(event) => handleStatusChange(item._id, event.target.value as FeedbackStatus)} disabled={activeActionKey === `status:${item._id}`} aria-label={`Update status for ${item.title}`}>
                        {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="feedback-card-body">
                    <p className="feedback-card-summary">{item.ai_summary || item.description}</p>
                    {item.ai_tags && item.ai_tags.length > 0 ? (
                      <div className="dashboard-ai-tags">
                        {item.ai_tags.map((tag) => <span key={`${item._id}-${tag}`} className="dashboard-ai-tag">{tag}</span>)}
                      </div>
                    ) : null}
                  </div>

                  <div className="feedback-card-footer">
                    <div className="feedback-card-meta">
                      {item.ai_category ? <span className="dashboard-meta-chip">AI: {item.ai_category}</span> : null}
                      <span className="dashboard-meta-chip">{formatDate(item.createdAt)}</span>
                      <span className="dashboard-meta-chip">{item.submitterName || item.submitterEmail || "Anonymous"}</span>
                    </div>

                    <div className="feedback-card-actions">
                      <button type="button" className="button button-ghost button-compact" onClick={() => handleReanalyze(item._id)} disabled={activeActionKey === `reanalyze:${item._id}`}>
                        {activeActionKey === `reanalyze:${item._id}` ? "Analyzing..." : "Re-analyze"}
                      </button>
                      <button type="button" className="button button-danger button-compact" onClick={() => requestDelete(item._id)} disabled={activeActionKey === `delete:${item._id}`}>
                        {activeActionKey === `delete:${item._id}` ? "Deleting..." : "Delete"}
                      </button>
                      <button type="button" className="button button-primary button-compact" onClick={() => handleOpenDetails(item._id)}>
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <footer className="dashboard-pagination">
            <span>Showing {feedback.length === 0 ? 0 : (page - 1) * 10 + 1}-{(page - 1) * 10 + feedback.length} of {totalItems}</span>
            <div className="dashboard-pagination-controls">
              <button type="button" className="button button-secondary button-compact" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                Prev
              </button>
              <div className="page-number-group" aria-label="Page navigation">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                  const pageNumber = Math.max(1, Math.min(totalPages - 4, page - 2)) + index;
                  if (pageNumber > totalPages) return null;
                  return (
                    <button key={pageNumber} type="button" className={`page-number ${pageNumber === page ? "is-active" : ""}`} onClick={() => setPage(pageNumber)}>
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="button button-secondary button-compact" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
                Next
              </button>
            </div>
          </footer>
        </section>
      </section>

      {selectedFeedback ? (
        <div className="dashboard-drawer-backdrop" onClick={() => setSelectedId(null)}>
          <section ref={drawerPanelRef} className="dashboard-drawer" role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-drawer-header">
              <div>
                <h2 id="feedback-detail-title" className="panel-title panel-title-large">{selectedFeedback.title}</h2>
              </div>
              <button ref={detailCloseButtonRef} type="button" className="icon-button" onClick={() => setSelectedId(null)} aria-label="Close details">
                ×
              </button>
            </div>

            <div className="dashboard-drawer-toolbar">
              <div className="select-wrap select-wrap-modern select-wrap-compact drawer-status-select">
                <select value={selectedFeedback.status} onChange={(event) => handleStatusChange(selectedFeedback._id, event.target.value as FeedbackStatus)} disabled={activeActionKey === `status:${selectedFeedback._id}`} aria-label={`Update status for ${selectedFeedback.title}`}>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <button type="button" className="button button-danger button-compact" onClick={() => requestDelete(selectedFeedback._id)} disabled={activeActionKey === `delete:${selectedFeedback._id}`}>
                {activeActionKey === `delete:${selectedFeedback._id}` ? "Deleting..." : "Delete feedback"}
              </button>
            </div>

            <div className="dashboard-drawer-grid">
              <div className="dashboard-drawer-section">
                <h3>Description</h3>
                <p>{selectedFeedback.description}</p>
              </div>
              <div className="dashboard-drawer-section">
                <div className="dashboard-drawer-section-header">
                  <h3>AI Summary</h3>
                  <button type="button" className="button button-ghost button-compact" onClick={() => handleReanalyze(selectedFeedback._id)} disabled={activeActionKey === `reanalyze:${selectedFeedback._id}`}>
                    {activeActionKey === `reanalyze:${selectedFeedback._id}` ? "Analyzing..." : "Re-analyze"}
                  </button>
                </div>
                <p>{selectedFeedback.ai_summary || "AI summary is not available yet."}</p>
              </div>
              <div className="dashboard-drawer-section">
                <h3>Metadata</h3>
                <div className="dashboard-weekly-meta dashboard-weekly-meta-wrap">
                  <span className="dashboard-meta-chip">Category: {selectedFeedback.category}</span>
                  <span className="dashboard-meta-chip">Status: {selectedFeedback.status}</span>
                  {selectedFeedback.ai_sentiment ? <span className="dashboard-meta-chip">Sentiment: {selectedFeedback.ai_sentiment}</span> : null}
                  {selectedFeedback.ai_category ? <span className="dashboard-meta-chip">AI Category: {selectedFeedback.ai_category}</span> : null}
                  <span className="dashboard-meta-chip">Priority: {priorityLabel(selectedFeedback.ai_priority)}</span>
                  <span className="dashboard-meta-chip">Created: {formatDateTime(selectedFeedback.createdAt)}</span>
                  <span className="dashboard-meta-chip">By: {selectedFeedback.submitterName || selectedFeedback.submitterEmail || "Anonymous"}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {pendingDelete ? (
        <div className="confirm-modal-backdrop" onClick={() => setPendingDelete(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" onClick={(event) => event.stopPropagation()}>
            <div className="confirm-modal-copy">
              <h2 id="confirm-delete-title" className="panel-title panel-title-large">Delete feedback?</h2>
              <p>
                {pendingDelete.kind === "bulk"
                  ? `Delete ${pendingDelete.ids.length} selected feedback item(s). This action cannot be undone.`
                  : `Delete "${pendingDelete.title || "this feedback"}" permanently? This action cannot be undone.`}
              </p>
            </div>
            <div className="confirm-modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={confirmDelete}
                disabled={activeActionKey === "bulk:delete" || (pendingDelete.kind === "single" && activeActionKey === `delete:${pendingDelete.ids[0]}`)}
              >
                {activeActionKey === "bulk:delete" || (pendingDelete.kind === "single" && activeActionKey === `delete:${pendingDelete.ids[0]}`) ? "Deleting..." : "Delete"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite">{toast?.message || ""}</div>
      <ToastStack notices={toast ? [toast] : []} onDismiss={() => setToast(null)} />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="dashboard-shell layout-shell" />}>
      <DashboardContent />
    </Suspense>
  );
}
