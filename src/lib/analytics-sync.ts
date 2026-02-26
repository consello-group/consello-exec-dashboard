/**
 * Claude Enterprise Analytics sync orchestration
 * Pulls per-user claude.ai engagement and DAU/WAU/MAU data from the Analytics API.
 *
 * Daily summaries (DAU/WAU/MAU):   one API call covers up to 31 days
 * Per-user activity:                one API call per day (paginated for large orgs)
 *
 * Data is available ~1 day delayed — earliest safe date is yesterday.
 * Earliest historical date: January 1, 2026.
 */

import { db } from "@/lib/db";
import { fetchAnalyticsUsers, fetchAnalyticsSummaries } from "@/lib/anthropic-analytics";

/** Returns "YYYY-MM-DD" for n days ago (UTC). */
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Sync Claude Analytics data into the database.
 *
 * - Summaries: always pulls the last 31 days in a single API call (upserts)
 * - User activity: pulls the last `days` days individually (default 7, max 30)
 *
 * The cron job runs daily and keeps data current. On first deploy, trigger a
 * manual sync from Settings to backfill recent history, or call with days=56
 * to get all data since Jan 1, 2026.
 */
export async function syncClaudeAnalytics(days = 7): Promise<{
  summaryCount: number;
  userActivityCount: number;
}> {
  const syncDays = Math.min(days, 30); // cap to avoid Vercel function timeout

  // ── 1. Summaries (one call) ─────────────────────────────────────────────────
  let summaryCount = 0;

  try {
    // ending_date is exclusive; use today so yesterday's data is included
    const summaries = await fetchAnalyticsSummaries(daysAgo(31), daysAgo(0));

    for (const s of summaries) {
      const date = new Date(s.starting_date + "T00:00:00Z");
      await db.claudeAnalyticsSummary.upsert({
        where: { date },
        update: {
          dailyActiveUsers: s.daily_active_user_count,
          weeklyActiveUsers: s.weekly_active_user_count,
          monthlyActiveUsers: s.monthly_active_user_count,
          assignedSeats: s.assigned_seat_count,
          pendingInvites: s.pending_invite_count,
          syncedAt: new Date(),
        },
        create: {
          date,
          dailyActiveUsers: s.daily_active_user_count,
          weeklyActiveUsers: s.weekly_active_user_count,
          monthlyActiveUsers: s.monthly_active_user_count,
          assignedSeats: s.assigned_seat_count,
          pendingInvites: s.pending_invite_count,
        },
      });
      summaryCount++;
    }
  } catch (err) {
    console.warn(
      "[analytics-sync] Summaries fetch failed:",
      err instanceof Error ? err.message : err
    );
  }

  // ── 2. Per-user activity (one call per day) ─────────────────────────────────
  let userActivityCount = 0;

  for (let i = 1; i <= syncDays; i++) {
    const date = daysAgo(i);
    const dateObj = new Date(date + "T00:00:00Z");

    try {
      const users = await fetchAnalyticsUsers(date);

      for (const u of users) {
        await db.claudeUserActivity.upsert({
          where: {
            date_anthropicUserId: {
              date: dateObj,
              anthropicUserId: u.user.id,
            },
          },
          update: {
            email: u.user.email_address,
            conversationCount: u.chat_metrics.distinct_conversation_count,
            messageCount: u.chat_metrics.message_count,
            projectsCreated: u.chat_metrics.distinct_projects_created_count,
            projectsUsed: u.chat_metrics.distinct_projects_used_count,
            filesUploaded: u.chat_metrics.distinct_files_uploaded_count,
            artifactsCreated: u.chat_metrics.distinct_artifacts_created_count,
            thinkingMessages: u.chat_metrics.thinking_message_count,
            skillsUsed: u.chat_metrics.distinct_skills_used_count,
            connectorsUsed: u.chat_metrics.connectors_used_count,
            webSearchCount: u.web_search_count,
            syncedAt: new Date(),
          },
          create: {
            date: dateObj,
            anthropicUserId: u.user.id,
            email: u.user.email_address,
            conversationCount: u.chat_metrics.distinct_conversation_count,
            messageCount: u.chat_metrics.message_count,
            projectsCreated: u.chat_metrics.distinct_projects_created_count,
            projectsUsed: u.chat_metrics.distinct_projects_used_count,
            filesUploaded: u.chat_metrics.distinct_files_uploaded_count,
            artifactsCreated: u.chat_metrics.distinct_artifacts_created_count,
            thinkingMessages: u.chat_metrics.thinking_message_count,
            skillsUsed: u.chat_metrics.distinct_skills_used_count,
            connectorsUsed: u.chat_metrics.connectors_used_count,
            webSearchCount: u.web_search_count,
          },
        });
        userActivityCount++;
      }
    } catch (err) {
      // Log and continue — one bad day shouldn't stop the whole sync
      console.warn(
        `[analytics-sync] User activity fetch failed for ${date}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // ── 3. Log sync ──────────────────────────────────────────────────────────────
  await db.syncLog.create({
    data: {
      platform: "claude-analytics",
      status: "success",
      recordCount: userActivityCount,
    },
  });

  return { summaryCount, userActivityCount };
}
