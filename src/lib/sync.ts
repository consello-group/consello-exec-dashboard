/**
 * AI sync orchestration
 * Syncs ChatGPT (OpenAI) and Claude (Anthropic) usage + cost data
 * into Neon Postgres via Prisma.
 */

import { db } from "@/lib/db";
import {
  fetchOpenAIUsage,
  fetchOpenAICosts,
  fetchOpenAIUsers,
} from "@/lib/openai-admin";
import {
  fetchAnthropicUsage,
  fetchAnthropicCosts,
  fetchAnthropicUsers,
  fetchAnthropicApiKeys,
} from "@/lib/anthropic-admin";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Recursively convert BigInt values to strings for JSON serialization. */
export function serializeBigInts(obj: unknown): unknown {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        serializeBigInts(v),
      ])
    );
  }
  return obj;
}

/**
 * Find-or-create a User record by email. Updates the platform-specific ID
 * field (chatgptUserId or claudeUserId) if provided.
 */
async function upsertUser(
  email: string,
  name: string | null | undefined,
  platform: "chatgpt" | "claude",
  platformUserId: string
): Promise<void> {
  const platformField =
    platform === "chatgpt" ? { chatgptUserId: platformUserId } : { claudeUserId: platformUserId };

  await db.user.upsert({
    where: { email },
    update: { ...platformField, ...(name ? { name } : {}) },
    create: {
      email,
      name: name ?? null,
      ...platformField,
    },
  });
}

// ─── ChatGPT Sync ────────────────────────────────────────────────────────────

export async function syncChatGPT(): Promise<{
  recordCount: number;
  userCount: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  // 1. Sync users first so foreign-key look-ups succeed
  const openAIUsers = await fetchOpenAIUsers();
  for (const user of openAIUsers) {
    await upsertUser(user.email, user.name ?? null, "chatgpt", user.id);
  }

  // Build lookup: openai userId → db User id
  const dbUsers = await db.user.findMany({
    where: { chatgptUserId: { not: null } },
    select: { id: true, chatgptUserId: true },
  });
  const userMap = new Map(dbUsers.map((u) => [u.chatgptUserId!, u.id]));

  // 2. Sync usage records
  const usageRecords = await fetchOpenAIUsage(thirtyDaysAgo, now);
  let recordCount = 0;

  for (const page of usageRecords) {
    const date = new Date(page.start_time * 1000);
    date.setUTCHours(0, 0, 0, 0); // normalize to midnight UTC

    for (const result of page.results) {
      const userId = result.user_id ? userMap.get(result.user_id) ?? null : null;

      await db.usageRecord.upsert({
        where: {
          platform_date_model_userId: {
            platform: "chatgpt",
            date,
            model: result.model_id,
            userId: userId ?? "",
          },
        },
        update: {
          inputTokens: BigInt(result.input_tokens),
          outputTokens: BigInt(result.output_tokens),
          requests: result.num_model_requests,
        },
        create: {
          platform: "chatgpt",
          date,
          model: result.model_id,
          userId: userId ?? "",
          inputTokens: BigInt(result.input_tokens),
          outputTokens: BigInt(result.output_tokens),
          requests: result.num_model_requests,
        },
      });
      recordCount++;
    }
  }

  // 3. Sync cost records
  const costRecords = await fetchOpenAICosts(thirtyDaysAgo, now);
  for (const page of costRecords) {
    const date = new Date(page.start_time * 1000);
    date.setUTCHours(0, 0, 0, 0);

    for (const result of page.results) {
      const category = result.line_item ?? "completion";
      await db.costRecord.upsert({
        where: {
          platform_date_category: {
            platform: "chatgpt",
            date,
            category,
          },
        },
        update: { amount: result.amount.value },
        create: {
          platform: "chatgpt",
          date,
          category,
          amount: result.amount.value,
        },
      });
    }
  }

  // 4. Record sync log
  await db.syncLog.create({
      data: { platform: "chatgpt", status: "success", recordCount },
    });

  return { recordCount, userCount: openAIUsers.length };
}

// ─── Claude Sync ─────────────────────────────────────────────────────────────

export async function syncClaude(): Promise<{
  recordCount: number;
  userCount: number;
}> {
  // Use yesterday as end date — Anthropic reporting has a ~1 day lag.
  // 30-day window. API limit for bucket_width=1d is 31 days.
  const endDateObj = new Date();
  endDateObj.setDate(endDateObj.getDate() - 1);
  const endDate = endDateObj.toISOString().slice(0, 10); // YYYY-MM-DD
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - 30);
  const startDate = startDateObj.toISOString().slice(0, 10);

  // 1. Sync users
  const anthropicUsers = await fetchAnthropicUsers();
  for (const user of anthropicUsers) {
    await upsertUser(user.email, user.name ?? null, "claude", user.id);
  }

  // Build lookup: anthropic userId → db User.id (via claudeUserId field)
  const dbUsers = await db.user.findMany({
    where: { claudeUserId: { not: null } },
    select: { id: true, claudeUserId: true },
  });
  const claudeUserMap = new Map(dbUsers.map((u) => [u.claudeUserId!, u.id]));

  // Fetch API keys and build lookup: api_key_id → db User.id
  // Per spec: usage is attributed via api_key_id → created_by.id (anthropic userId) → db User
  const apiKeys = await fetchAnthropicApiKeys();
  const apiKeyUserMap = new Map<string, string>();
  for (const key of apiKeys) {
    if (key.created_by?.id) {
      const dbUserId = claudeUserMap.get(key.created_by.id);
      if (dbUserId) apiKeyUserMap.set(key.id, dbUserId);
    }
  }

  // 2. Sync usage records
  const usageRecords = await fetchAnthropicUsage(startDate, endDate);
  let recordCount = 0;

  for (const record of usageRecords) {
    const date = new Date(record.start_time * 1000);
    date.setUTCHours(0, 0, 0, 0);

    // Resolve user: api_key_id → db User.id; null api_key_id = Workbench/Console usage
    const userId = record.api_key_id
      ? (apiKeyUserMap.get(record.api_key_id) ?? null)
      : null;

    await db.usageRecord.upsert({
      where: {
        platform_date_model_userId: {
          platform: "claude",
          date,
          model: record.model,
          userId: userId ?? "",
        },
      },
      update: {
        inputTokens: BigInt(record.input_tokens),
        outputTokens: BigInt(record.output_tokens),
        requests: record.request_count,
      },
      create: {
        platform: "claude",
        date,
        model: record.model,
        userId: userId ?? "",
        inputTokens: BigInt(record.input_tokens),
        outputTokens: BigInt(record.output_tokens),
        requests: record.request_count,
      },
    });
    recordCount++;
  }

  // 3. Sync cost records
  const costRecords = await fetchAnthropicCosts(startDate, endDate);
  for (const record of costRecords) {
    const date = new Date(record.start_time * 1000);
    date.setUTCHours(0, 0, 0, 0);

    await db.costRecord.upsert({
      where: {
        platform_date_category: {
          platform: "claude",
          date,
          category: record.model,
        },
      },
      update: { amount: record.cost_usd },
      create: {
        platform: "claude",
        date,
        category: record.model,
        amount: record.cost_usd,
      },
    });
  }

  // 4. Record sync log
  await db.syncLog.create({
    data: { platform: "claude", status: "success", recordCount },
  });

  return { recordCount, userCount: anthropicUsers.length };
}
