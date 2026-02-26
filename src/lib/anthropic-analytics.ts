/**
 * Anthropic Enterprise Analytics API client
 * Tracks per-user claude.ai browser engagement (conversations, messages, DAU/WAU/MAU, etc.)
 * Auth: ANTHROPIC_ANALYTICS_KEY (from claude.ai/analytics/api-keys — requires Primary Owner role)
 * Base: https://api.anthropic.com/v1/organizations/analytics/
 *
 * NOTE: This is SEPARATE from the Admin API (ANTHROPIC_ADMIN_KEY).
 *   - Analytics API → claude.ai browser usage by end users
 *   - Admin API     → programmatic API token consumption via API keys
 *
 * Data is available per day, delayed ~1 day (yesterday's data appears at 10:00 UTC today).
 * Earliest available date: January 1, 2026.
 * No `anthropic-version` header required.
 */

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface AnalyticsUser {
  user: {
    id: string;
    email_address: string;
  };
  chat_metrics: {
    distinct_conversation_count: number;
    message_count: number;
    distinct_projects_created_count: number;
    distinct_projects_used_count: number;
    distinct_files_uploaded_count: number;
    distinct_artifacts_created_count: number;
    thinking_message_count: number;
    distinct_skills_used_count: number;
    connectors_used_count: number;
  };
  web_search_count: number;
  claude_code_metrics?: {
    core_metrics?: {
      commit_count?: number;
      pull_request_count?: number;
      distinct_session_count?: number;
      lines_of_code?: {
        added_count?: number;
        removed_count?: number;
      };
    };
  };
}

export interface AnalyticsSummary {
  starting_date: string; // YYYY-MM-DD, inclusive
  ending_date: string;   // YYYY-MM-DD, exclusive
  daily_active_user_count: number;
  weekly_active_user_count: number;
  monthly_active_user_count: number;
  assigned_seat_count: number;
  pending_invite_count: number;
}

// ─── Internal page types ──────────────────────────────────────────────────────

interface AnalyticsUsersPage {
  data: AnalyticsUser[];
  next_page: string | null;
}

interface AnalyticsSummariesPage {
  data: AnalyticsSummary[];
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

const BASE = "https://api.anthropic.com/v1/organizations/analytics";

function getKey(): string {
  const key = process.env.ANTHROPIC_ANALYTICS_KEY;
  if (!key) throw new Error("ANTHROPIC_ANALYTICS_KEY is not set");
  return key;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    // No anthropic-version header for Analytics API
    headers: {
      "x-api-key": getKey(),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Anthropic Analytics API error ${res.status} at ${path}: ${body}`
    );
  }
  return res.json() as Promise<T>;
}

// ─── Public fetch functions ───────────────────────────────────────────────────

/**
 * Fetch per-user engagement metrics for a specific date.
 * date: "YYYY-MM-DD" — must be yesterday or earlier, not before 2026-01-01.
 * Paginates automatically (up to 1000 users per page).
 */
export async function fetchAnalyticsUsers(date: string): Promise<AnalyticsUser[]> {
  const users: AnalyticsUser[] = [];
  let cursor: string | null = null;

  do {
    const params = new URLSearchParams({ date, limit: "1000" });
    if (cursor) params.set("page", cursor);

    const data = await apiFetch<AnalyticsUsersPage>(`/users?${params.toString()}`);
    users.push(...data.data);
    cursor = data.next_page ?? null;
  } while (cursor);

  return users;
}

/**
 * Fetch daily summary metrics (DAU/WAU/MAU, seat counts) for a date range.
 * startingDate: "YYYY-MM-DD" inclusive
 * endingDate: "YYYY-MM-DD" exclusive — max 31-day span
 * Must not include today or future dates.
 */
export async function fetchAnalyticsSummaries(
  startingDate: string,
  endingDate: string
): Promise<AnalyticsSummary[]> {
  const params = new URLSearchParams({
    starting_date: startingDate,
    ending_date: endingDate,
  });

  const data = await apiFetch<AnalyticsSummariesPage>(`/summaries?${params.toString()}`);
  return data.data ?? [];
}
