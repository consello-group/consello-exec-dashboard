"use server";

import { syncClaude, syncChatGPT } from "@/lib/sync";
import { syncAllHubSpot } from "@/lib/hubspot-sync";
import { syncClaudeAnalytics } from "@/lib/analytics-sync";

export async function manualSyncClaude(): Promise<{ success: boolean; recordCount?: number; error?: string }> {
  try {
    const result = await syncClaude();
    return { success: true, recordCount: result.recordCount };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function manualSyncChatGPT(): Promise<{ success: boolean; recordCount?: number; error?: string }> {
  try {
    const result = await syncChatGPT();
    return { success: true, recordCount: result.recordCount };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function manualSyncHubSpot(): Promise<{ success: boolean; recordCount?: number; error?: string }> {
  try {
    const result = await syncAllHubSpot();
    const total = result.owners + result.pipelineStages + result.deals + result.companies + result.contacts + result.engagements;
    return { success: true, recordCount: total };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function manualSyncClaudeAnalytics(): Promise<{ success: boolean; recordCount?: number; error?: string }> {
  try {
    // Pull last 7 days for the manual sync button; cron job runs daily for ongoing accumulation
    const result = await syncClaudeAnalytics(7);
    return { success: true, recordCount: result.userActivityCount };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
