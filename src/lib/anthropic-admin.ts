/**
 * Anthropic Admin API client
 * Fetches usage and cost data for the organization.
 * Auth: ANTHROPIC_ADMIN_KEY env var (sk-ant-admin-...)
 * Base: https://api.anthropic.com
 */

export interface AnthropicUsageRecord {
  start_time: number;
  end_time: number;
  model: string;
  user_id?: string;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
}

export interface AnthropicCostRecord {
  start_time: number;
  end_time: number;
  model: string;
  cost_usd: number;
}

export interface AnthropicUser {
  id: string;
  email: string;
  name?: string;
}

interface AnthropicUsagePage {
  data: AnthropicUsageRecord[];
  has_more: boolean;
  next_page?: string;
}

interface AnthropicCostPage {
  data: AnthropicCostRecord[];
  has_more: boolean;
  next_page?: string;
}

interface AnthropicMembersPage {
  data: AnthropicUser[];
  has_more: boolean;
  next_page?: string;
}

const BASE = "https://api.anthropic.com";

function getKey(): string {
  const key = process.env.ANTHROPIC_ADMIN_KEY;
  if (!key) throw new Error("ANTHROPIC_ADMIN_KEY is not set");
  return key;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "x-api-key": getKey(),
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Anthropic Admin API error ${res.status} at ${path}: ${body}`
    );
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch organization usage report for messages in a date range.
 * startDate / endDate should be ISO date strings: "YYYY-MM-DD"
 * Paginates automatically via has_more + next_page cursor.
 */
export async function fetchAnthropicUsage(
  startDate: string,
  endDate: string
): Promise<AnthropicUsageRecord[]> {
  const records: AnthropicUsageRecord[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      page_size: "100",
    });
    if (cursor) params.set("next_page", cursor);

    const data = await apiFetch<AnthropicUsagePage>(
      `/v1/organizations/usage_report/messages?${params.toString()}`
    );
    records.push(...data.data);
    cursor = data.has_more ? data.next_page : undefined;
  } while (cursor);

  return records;
}

/**
 * Fetch organization cost report for a date range.
 * Paginates automatically via has_more + next_page cursor.
 */
export async function fetchAnthropicCosts(
  startDate: string,
  endDate: string
): Promise<AnthropicCostRecord[]> {
  const records: AnthropicCostRecord[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      page_size: "100",
    });
    if (cursor) params.set("next_page", cursor);

    const data = await apiFetch<AnthropicCostPage>(
      `/v1/organizations/cost_report?${params.toString()}`
    );
    records.push(...data.data);
    cursor = data.has_more ? data.next_page : undefined;
  } while (cursor);

  return records;
}

/**
 * Fetch all organization members.
 * Paginates automatically via has_more + next_page cursor.
 */
export async function fetchAnthropicUsers(): Promise<AnthropicUser[]> {
  const users: AnthropicUser[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (cursor) params.set("next_page", cursor);

    const data = await apiFetch<AnthropicMembersPage>(
      `/v1/organizations/members?${params.toString()}`
    );
    users.push(...data.data);
    cursor = data.has_more ? data.next_page : undefined;
  } while (cursor);

  return users;
}
