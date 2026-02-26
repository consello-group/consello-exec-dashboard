/**
 * Productivity calculation engine
 * Transforms raw AI usage data into estimated productivity metrics.
 *
 * Conversation tier classification by average tokens per conversation:
 *   simple:   < 2,000 tokens  → 5 min saved
 *   moderate: 2,000–10,000    → 15 min saved
 *   complex:  > 10,000        → 45 min saved
 *
 * Adoption tiers (conversations per week):
 *   power:     >= 20
 *   moderate:  5–19
 *   light:     1–4
 *   non-user:  0
 */

import { db } from "@/lib/db";
import type { ProductivityMetrics, ProductivityUser, AdoptionTier } from "@/types/index";

// ─── Config types ─────────────────────────────────────────────────────────────

export interface ProductivityConfig {
  minutesSavedSimple: number;    // default: 5
  minutesSavedModerate: number;  // default: 15
  minutesSavedComplex: number;   // default: 45
  hourlyRate: number;            // default: 150 (USD)
}

export interface UsageInput {
  userId: string;
  email: string;
  name: string | null;
  totalTokens: number;
  requests: number;
}

export interface ProductivityUserResult {
  userId: string;
  email: string;
  name: string | null;
  conversations: number;
  hoursSaved: number;
  dollarValue: number;
  tier: "power" | "moderate" | "light" | "non-user";
  conversationType: "simple" | "moderate" | "complex";
}

// ─── Default config constants ─────────────────────────────────────────────────

const DEFAULTS: ProductivityConfig = {
  minutesSavedSimple: 5,
  minutesSavedModerate: 15,
  minutesSavedComplex: 45,
  hourlyRate: 150,
};

// ─── Config loader ────────────────────────────────────────────────────────────

/**
 * Load productivity config from the database, falling back to defaults
 * for any missing keys.
 */
export async function getProductivityConfig(): Promise<ProductivityConfig> {
  const records = await db.productivityConfig.findMany();
  const configMap = new Map(records.map((r) => [r.key, r.value]));

  return {
    minutesSavedSimple: configMap.has("minutesSavedSimple")
      ? parseFloat(configMap.get("minutesSavedSimple")!)
      : DEFAULTS.minutesSavedSimple,
    minutesSavedModerate: configMap.has("minutesSavedModerate")
      ? parseFloat(configMap.get("minutesSavedModerate")!)
      : DEFAULTS.minutesSavedModerate,
    minutesSavedComplex: configMap.has("minutesSavedComplex")
      ? parseFloat(configMap.get("minutesSavedComplex")!)
      : DEFAULTS.minutesSavedComplex,
    hourlyRate: configMap.has("hourlyRate")
      ? parseFloat(configMap.get("hourlyRate")!)
      : DEFAULTS.hourlyRate,
  };
}

// ─── Calculation helpers ──────────────────────────────────────────────────────

/**
 * Estimate the number of conversations from total token count and request count.
 * Uses the higher of:
 *   - request count (each API request is at minimum one conversation turn)
 *   - token-based estimate (avg 500 tokens / conversation minimum)
 */
export function estimateConversations(
  totalTokens: number,
  requests: number
): number {
  const tokenBased = Math.ceil(totalTokens / 500);
  return Math.max(requests, tokenBased, 0);
}

/**
 * Classify average conversation complexity by tokens per conversation.
 *   simple:   avgTokens < 2,000
 *   moderate: avgTokens 2,000–10,000
 *   complex:  avgTokens > 10,000
 */
export function classifyConversation(
  avgTokensPerConvo: number
): "simple" | "moderate" | "complex" {
  if (avgTokensPerConvo < 2_000) return "simple";
  if (avgTokensPerConvo <= 10_000) return "moderate";
  return "complex";
}

/**
 * Determine the adoption tier for a user based on weekly conversation rate.
 * Assumes a 30-day window (4.3 weeks).
 *   power:     >= 20 conversations/week
 *   moderate:  5–19 conversations/week
 *   light:     1–4 conversations/week
 *   non-user:  0 conversations/week
 */
export function getAdoptionTier(
  conversationsPerWeek: number
): "power" | "moderate" | "light" | "non-user" {
  if (conversationsPerWeek >= 20) return "power";
  if (conversationsPerWeek >= 5) return "moderate";
  if (conversationsPerWeek >= 1) return "light";
  return "non-user";
}

/**
 * Calculate productivity metrics for a single user.
 */
export function calculateUserProductivity(
  user: UsageInput,
  config: ProductivityConfig
): ProductivityUserResult {
  const conversations = estimateConversations(user.totalTokens, user.requests);
  const avgTokensPerConvo =
    conversations > 0 ? user.totalTokens / conversations : 0;
  const conversationType = classifyConversation(avgTokensPerConvo);

  const minutesPerConvo =
    conversationType === "simple"
      ? config.minutesSavedSimple
      : conversationType === "moderate"
      ? config.minutesSavedModerate
      : config.minutesSavedComplex;

  const totalMinutesSaved = conversations * minutesPerConvo;
  const hoursSaved = totalMinutesSaved / 60;
  const dollarValue = hoursSaved * config.hourlyRate;

  // 30-day window → 4.3 weeks
  const conversationsPerWeek = conversations / 4.3;
  const tier = getAdoptionTier(conversationsPerWeek);

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    conversations,
    hoursSaved: Math.round(hoursSaved * 10) / 10,
    dollarValue: Math.round(dollarValue * 100) / 100,
    tier,
    conversationType,
  };
}

// ─── Aggregate metrics ────────────────────────────────────────────────────────

/**
 * Calculate aggregate productivity metrics across all users.
 * Loads config from the database, then applies to each user in the input array.
 */
export async function calculateProductivityMetrics(
  users: UsageInput[]
): Promise<ProductivityMetrics> {
  const config = await getProductivityConfig();

  const userResults = users.map((u) =>
    calculateUserProductivity(u, config)
  );

  const activeUsers = userResults.filter((u) => u.conversations > 0).length;
  const totalHoursSaved = userResults.reduce(
    (sum, u) => sum + u.hoursSaved,
    0
  );
  const totalDollarValue = userResults.reduce(
    (sum, u) => sum + u.dollarValue,
    0
  );
  const totalConversations = userResults.reduce(
    (sum, u) => sum + u.conversations,
    0
  );

  // ROI = dollar value of saved time / total AI cost
  // We don't have total cost here, so we return a raw value;
  // callers should compute roiRatio = dollarValue / totalCost
  const totalCost = users.reduce((sum) => sum, 0); // placeholder
  const roiRatio = totalCost > 0 ? totalDollarValue / totalCost : 0;

  // Cost per productive hour = total AI spend / total hours saved
  const costPerProductiveHour =
    totalHoursSaved > 0 ? totalCost / totalHoursSaved : 0;

  return {
    hoursSaved: Math.round(totalHoursSaved * 10) / 10,
    dollarValue: Math.round(totalDollarValue * 100) / 100,
    roiRatio: Math.round(roiRatio * 100) / 100,
    costPerProductiveHour: Math.round(costPerProductiveHour * 100) / 100,
    totalConversations,
    activeUsers,
  };
}

/**
 * Build adoption tier distribution from a list of user results.
 */
export function buildAdoptionTiers(
  userResults: Array<{ tier: string }>
): AdoptionTier[] {
  const counts: Record<string, number> = {
    power: 0,
    moderate: 0,
    light: 0,
    "non-user": 0,
  };

  for (const u of userResults) {
    counts[u.tier] = (counts[u.tier] ?? 0) + 1;
  }

  const total = userResults.length;
  return Object.entries(counts).map(([tier, count]) => ({
    tier,
    count,
    percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
  }));
}

/**
 * Calculate per-user productivity for dashboard display.
 * Returns sorted by dollarValue descending.
 */
export async function calculateUserProductivityList(
  users: UsageInput[]
): Promise<ProductivityUser[]> {
  const config = await getProductivityConfig();

  return users
    .map((u) => {
      const result = calculateUserProductivity(u, config);
      return {
        userId: result.userId,
        email: result.email,
        name: result.name,
        conversations: result.conversations,
        hoursSaved: result.hoursSaved,
        dollarValue: result.dollarValue,
        tier: result.tier,
      };
    })
    .sort((a, b) => b.dollarValue - a.dollarValue);
}
