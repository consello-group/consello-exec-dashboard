/**
 * OpenAI Admin API client
 * Fetches usage and cost data for the organization.
 * Auth: OPENAI_ADMIN_KEY env var (sk-admin-...)
 * Base: https://api.openai.com
 */

interface OpenAIUsagePage {
  data: OpenAIUsageRecord[];
  next_page?: string;
}

export interface OpenAIUsageRecord {
  start_time: number;
  end_time: number;
  results: Array<{
    input_tokens: number;
    output_tokens: number;
    num_model_requests: number;
    model_id: string;
    user_id?: string;
  }>;
}

interface OpenAICostPage {
  data: OpenAICostRecord[];
  next_page?: string;
}

export interface OpenAICostRecord {
  start_time: number;
  end_time: number;
  results: Array<{
    amount: { value: number; currency: string };
    line_item?: string;
  }>;
}

export interface OpenAIUser {
  id: string;
  email: string;
  name?: string;
}

interface OpenAIUsersPage {
  data: OpenAIUser[];
  next_page?: string;
}

const BASE = "https://api.openai.com";

function getKey(): string {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) throw new Error("OPENAI_ADMIN_KEY is not set");
  return key;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenAI Admin API error ${res.status} at ${path}: ${body}`
    );
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch organization-level completion usage records for a time range.
 * Paginates automatically via next_page cursor.
 */
export async function fetchOpenAIUsage(
  startTime: number,
  endTime: number
): Promise<OpenAIUsageRecord[]> {
  const records: OpenAIUsageRecord[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      start_time: String(startTime),
      end_time: String(endTime),
      page_size: "100",
    });
    if (cursor) params.set("page", cursor);

    const data = await apiFetch<OpenAIUsagePage>(
      `/v1/organization/usage/completions?${params.toString()}`
    );
    records.push(...data.data);
    cursor = data.next_page;
  } while (cursor);

  return records;
}

/**
 * Fetch organization-level cost records for a time range.
 * Paginates automatically via next_page cursor.
 */
export async function fetchOpenAICosts(
  startTime: number,
  endTime: number
): Promise<OpenAICostRecord[]> {
  const records: OpenAICostRecord[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      start_time: String(startTime),
      end_time: String(endTime),
      page_size: "100",
    });
    if (cursor) params.set("page", cursor);

    const data = await apiFetch<OpenAICostPage>(
      `/v1/organization/costs?${params.toString()}`
    );
    records.push(...data.data);
    cursor = data.next_page;
  } while (cursor);

  return records;
}

/**
 * Fetch all organization users.
 * Paginates automatically via next_page cursor.
 */
export async function fetchOpenAIUsers(): Promise<OpenAIUser[]> {
  const users: OpenAIUser[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (cursor) params.set("page", cursor);

    const data = await apiFetch<OpenAIUsersPage>(
      `/v1/organization/users?${params.toString()}`
    );
    users.push(...data.data);
    cursor = data.next_page;
  } while (cursor);

  return users;
}
