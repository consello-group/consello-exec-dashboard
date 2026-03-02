"use server";

import { syncClaude, syncChatGPT } from "@/lib/sync";
import { syncAllHubSpot } from "@/lib/hubspot-sync";
import { syncClaudeAnalytics } from "@/lib/analytics-sync";
import { parseCsvContent, importChatGPTRows } from "@/lib/chatgpt-csv";
import { db } from "@/lib/db";

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

export async function importChatGPTCSV(
  formData: FormData
): Promise<{ success: boolean; fileCount?: number; userCount?: number; recordCount?: number; error?: string }> {
  try {
    const files = formData.getAll("files") as File[];
    if (!files.length) return { success: false, error: "No files provided" };

    let totalUsers = 0;
    let totalRecords = 0;

    for (const file of files) {
      if (!file.name.endsWith(".csv")) continue;
      const text = await file.text();
      const rows = parseCsvContent(text);
      const result = await importChatGPTRows(rows, db);
      totalUsers += result.users;
      totalRecords += result.records;
    }

    await db.syncLog.create({
      data: {
        platform: "chatgpt",
        status: "success",
        message: `CSV upload: ${files.length} file(s)`,
        recordCount: totalRecords,
      },
    });

    return { success: true, fileCount: files.length, userCount: totalUsers, recordCount: totalRecords };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
