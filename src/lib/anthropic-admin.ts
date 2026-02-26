/**
 * Anthropic Admin API client
 * Fetches usage and cost data for the organization.
 * Auth: ANTHROPIC_ADMIN_KEY env var (sk-ant-admin-...)
 * Base: https://api.anthropic.com
 *
 * Response structure (verified from Anthropic API reference + spec):
 *   usage_report: { data: [{ starting_at, ending_at, results: [{ model, input_tokens | uncached_input_tokens, output_tokens, api_key_id, ... }] }] }
 *   cost_report:  { data: [{ starting_at, ending_at, results: [{ amount (cents string), currency, model, description }] }] }
 *   api_keys:     { data: [{ id, name, status, workspace_id, created_by: { id, type } }] }
 *
 * Per-user tracking: group by api_key_id, then join against api_keys endpoint.
 * api_key_id = null → "Console / Workbench" usage (not attributed to an API key).
 */

// ─── Public interfaces (consumed by sync.ts) ─────────────────────────────────

export interface AnthropicUsageRecord {
  start_time: number;
  end_time: number;
  model: string;
  api_key_id?: string | null; // null = Workbench/Console usage
  user_id?: string;           // kept for compatibility; use api_key_id chain instead
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

export interface AnthropicApiKey {
  id: string;
  name: string;
  status: string;
  workspace_id: string | null;
  created_by: { id: string; type: string } | null;
}

// ─── Internal API response types ─────────────────────────────────────────────

interface UsageResult {
  model: string | null;
  api_key_id: string | null;
  // Anthropic uses "uncached_input_tokens" in the API reference,
  // "input_tokens" in the dev spec — handle both for safety.
  input_tokens?: number;
  uncached_input_tokens?: number;
  output_tokens: number;
  cache_read_input_tokens: number;
}

interface UsageBucket {
  starting_at: string; // RFC 3339
  ending_at: string;   // RFC 3339
  results: UsageResult[];
}

interface AnthropicUsagePage {
  data: UsageBucket[];
  has_more: boolean;
  next_page?: string;
}

interface CostResult {
  amount: string;           // decimal cents string, e.g. "123.45" = $1.23
  currency: string;         // always "USD"
  model: string | null;     // populated when grouping by description
  description: string | null;
}

interface CostBucket {
  starting_at: string;
  ending_at: string;
  results: CostResult[];
}

interface AnthropicCostPage {
  data: CostBucket[];
  has_more: boolean;
  next_page?: string;
}

interface AnthropicMembersPage {
  data: AnthropicUser[];
  has_more: boolean;
  next_page?: string;
}

interface AnthropicApiKeysPage {
  data: AnthropicApiKey[];
  has_more: boolean;
  next_page?: string;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

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

// ─── Public fetch functions ───────────────────────────────────────────────────

/**
 * Fetch organization usage report for messages in a date range.
 * startDate / endDate: ISO date strings "YYYY-MM-DD"
 * Groups by model AND api_key_id to support both per-model and per-user views.
 * Returns empty array on any error.
 */
export async function fetchAnthropicUsage(
  startDate: string,
  endDate: string
): Promise<AnthropicUsageRecord[]> {
  const records: AnthropicUsageRecord[] = [];
  let cursor: string | undefined;

  const startingAt = startDate + "T00:00:00Z";
  const endingAt = endDate + "T23:59:59Z";

  try {
    do {
      const params = new URLSearchParams({
        starting_at: startingAt,
        ending_at: endingAt,
        bucket_width: "1d",
      });
      params.append("group_by", "model");
      params.append("group_by", "api_key_id");
      if (cursor) params.set("page", cursor);

      const data = await apiFetch<AnthropicUsagePage>(
        `/v1/organizations/usage_report/messages?${params.toString()}`
      );

      for (const bucket of data.data) {
        const startTime = Math.floor(new Date(bucket.starting_at).getTime() / 1000);
        const endTime = Math.floor(new Date(bucket.ending_at).getTime() / 1000);

        for (const result of bucket.results) {
          // Spec calls it input_tokens; API reference calls it uncached_input_tokens
          const inputTokens =
            (result.input_tokens ?? result.uncached_input_tokens ?? 0) +
            (result.cache_read_input_tokens ?? 0);

          records.push({
            start_time: startTime,
            end_time: endTime,
            model: result.model ?? "unknown",
            api_key_id: result.api_key_id ?? null,
            input_tokens: inputTokens,
            output_tokens: result.output_tokens ?? 0,
            request_count: 0, // not provided by this endpoint
          });
        }
      }

      cursor = data.has_more ? data.next_page : undefined;
    } while (cursor);
  } catch (err) {
    console.warn(
      "[anthropic-admin] Usage report fetch failed (returning empty):",
      err instanceof Error ? err.message : err
    );
  }

  return records;
}

/**
 * Fetch organization cost report for a date range.
 * Groups by description to get per-model costs.
 * Returns empty array on any error.
 */
export async function fetchAnthropicCosts(
  startDate: string,
  endDate: string
): Promise<AnthropicCostRecord[]> {
  const records: AnthropicCostRecord[] = [];
  let cursor: string | undefined;

  const startingAt = startDate + "T00:00:00Z";
  const endingAt = endDate + "T23:59:59Z";

  try {
    do {
      const params = new URLSearchParams({
        starting_at: startingAt,
        ending_at: endingAt,
      });
      params.append("group_by", "description");
      if (cursor) params.set("page", cursor);

      const data = await apiFetch<AnthropicCostPage>(
        `/v1/organizations/cost_report?${params.toString()}`
      );

      for (const bucket of data.data) {
        const startTime = Math.floor(new Date(bucket.starting_at).getTime() / 1000);
        const endTime = Math.floor(new Date(bucket.ending_at).getTime() / 1000);

        for (const result of bucket.results) {
          // amount is in cents as a decimal string — divide by 100 for USD
          const costUsd = parseFloat(result.amount) / 100;
          if (isNaN(costUsd)) continue;
          const model = result.model ?? result.description ?? "unknown";
          records.push({
            start_time: startTime,
            end_time: endTime,
            model,
            cost_usd: costUsd,
          });
        }
      }

      cursor = data.has_more ? data.next_page : undefined;
    } while (cursor);
  } catch (err) {
    console.warn(
      "[anthropic-admin] Cost report fetch failed (returning empty):",
      err instanceof Error ? err.message : err
    );
  }

  return records;
}

/**
 * Fetch all organization members.
 * Returns empty array if the endpoint is unavailable (e.g. plan restrictions).
 */
export async function fetchAnthropicUsers(): Promise<AnthropicUser[]> {
  const users: AnthropicUser[] = [];
  let cursor: string | undefined;

  try {
    do {
      const params = new URLSearchParams({ limit: "100" });
      if (cursor) params.set("page", cursor);

      const data = await apiFetch<AnthropicMembersPage>(
        `/v1/organizations/users?${params.toString()}`
      );
      users.push(...data.data);
      cursor = data.has_more ? data.next_page : undefined;
    } while (cursor);
  } catch (err) {
    console.warn(
      "[anthropic-admin] Could not fetch members (usage data will still sync):",
      err instanceof Error ? err.message : err
    );
  }

  return users;
}

/**
 * Fetch all active API keys.
 * Each key includes created_by.id (Anthropic user ID) for user attribution.
 * Returns empty array on any error.
 */
export async function fetchAnthropicApiKeys(): Promise<AnthropicApiKey[]> {
  const keys: AnthropicApiKey[] = [];
  let cursor: string | undefined;

  try {
    do {
      const params = new URLSearchParams({ limit: "100", status: "active" });
      if (cursor) params.set("page", cursor);

      const data = await apiFetch<AnthropicApiKeysPage>(
        `/v1/organizations/api_keys?${params.toString()}`
      );
      keys.push(...data.data);
      cursor = data.has_more ? data.next_page : undefined;
    } while (cursor);
  } catch (err) {
    console.warn(
      "[anthropic-admin] Could not fetch API keys (user attribution will be skipped):",
      err instanceof Error ? err.message : err
    );
  }

  return keys;
}
