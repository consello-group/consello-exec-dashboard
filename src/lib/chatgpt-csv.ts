/**
 * Shared ChatGPT CSV parsing and import logic.
 *
 * Used by:
 *   - src/app/(dashboard)/settings/actions.ts (drag-and-drop UI upload)
 *   - scripts/import-chatgpt-csv.ts (bulk CLI import)
 *
 * CSV format: "Consello monthly user report YYYY-MM-DD.csv"
 * Source: OpenAI admin portal → Usage → Export
 */

import type { PrismaClient } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatGPTCsvRow {
  periodStart: Date;
  chatgptUserId: string;
  name: string;
  email: string;
  department: string;
  totalMessages: number;
  modelToMessages: Map<string, number>;
  creditsUsed: number;
}

export interface ImportResult {
  users: number;
  records: number;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

/**
 * Parse a single CSV line into fields, respecting quoted values.
 * Handles the OpenAI export format where dict/list fields are double-quoted
 * and internal double-quotes are escaped as "".
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parse the model_to_messages field, a Python dict string like:
 *   {'gpt-4-turbo': 1, 'o3-mini': 5, 'gpt-4o': 73}
 *
 * Returns a Map of modelId → messageCount. Empty map if blank or invalid.
 */
export function parseModelToMessages(raw: string): Map<string, number> {
  const result = new Map<string, number>();
  if (!raw || raw.trim() === "" || raw.trim() === "{}") return result;

  try {
    const json = raw
      .trim()
      .replace(/'/g, '"')
      .replace(/True/g, "true")
      .replace(/False/g, "false")
      .replace(/None/g, "null");
    const parsed = JSON.parse(json) as Record<string, number>;
    for (const [model, count] of Object.entries(parsed)) {
      if (typeof count === "number" && count > 0) {
        result.set(model.trim(), count);
      }
    }
  } catch {
    // Unparseable — return empty (handled by caller)
  }
  return result;
}

/**
 * Parse full CSV text content into typed rows.
 * Handles header detection, skips blank lines and non-monthly rows.
 */
export function parseCsvContent(text: string): ChatGPTCsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);

  const col = (name: string) => header.indexOf(name);
  const iCadence = col("cadence");
  const iPeriodStart = col("period_start");
  const iPublicId = col("public_id");
  const iName = col("name");
  const iEmail = col("email");
  const iDept = col("department");
  const iMessages = col("messages");
  const iModelToMessages = col("model_to_messages");
  const iCredits = col("credits_used");

  // Validate required columns exist
  if (iPeriodStart < 0 || iEmail < 0 || iMessages < 0) {
    throw new Error(
      "CSV missing required columns (period_start, email, messages). " +
        "Ensure this is an OpenAI monthly user report export."
    );
  }

  const rows: ChatGPTCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);

    if (iCadence >= 0 && fields[iCadence]?.toLowerCase() !== "monthly") continue;

    const email = fields[iEmail]?.trim().toLowerCase();
    if (!email) continue;

    const periodStartStr = fields[iPeriodStart]?.trim();
    if (!periodStartStr) continue;

    const periodStart = new Date(`${periodStartStr}T00:00:00.000Z`);
    if (isNaN(periodStart.getTime())) continue;

    rows.push({
      periodStart,
      chatgptUserId: fields[iPublicId]?.trim() ?? "",
      name: fields[iName]?.trim() ?? "",
      email,
      department: iDept >= 0 ? (fields[iDept]?.trim() ?? "") : "",
      totalMessages: parseInt(fields[iMessages] ?? "0", 10) || 0,
      modelToMessages: parseModelToMessages(fields[iModelToMessages] ?? ""),
      creditsUsed: parseFloat(fields[iCredits] ?? "0") || 0,
    });
  }

  return rows;
}

// ─── DB Import ────────────────────────────────────────────────────────────────

/**
 * Upsert parsed CSV rows into the database.
 * Returns counts of users and usage records processed.
 */
export async function importChatGPTRows(
  rows: ChatGPTCsvRow[],
  db: PrismaClient
): Promise<ImportResult> {
  let users = 0;
  let records = 0;

  for (const row of rows) {
    // 1. Upsert user
    const updateFields: Record<string, string | null> = {};
    if (row.chatgptUserId) updateFields.chatgptUserId = row.chatgptUserId;
    if (row.name) updateFields.name = row.name;
    if (row.department) updateFields.department = row.department;

    const user = await db.user.upsert({
      where: { email: row.email },
      update: updateFields,
      create: {
        email: row.email,
        name: row.name || null,
        chatgptUserId: row.chatgptUserId || null,
        department: row.department || null,
      },
      select: { id: true },
    });
    users++;

    // 2. Determine per-model records
    let modelEntries: Array<[string, number]>;
    if (row.modelToMessages.size > 0) {
      modelEntries = [...row.modelToMessages.entries()];
    } else if (row.totalMessages > 0) {
      modelEntries = [["unknown", row.totalMessages]];
    } else {
      continue; // no usage this month
    }

    // 3. Upsert one UsageRecord per model
    for (const [model, count] of modelEntries) {
      await db.usageRecord.upsert({
        where: {
          platform_date_model_userId: {
            platform: "chatgpt",
            date: row.periodStart,
            model,
            userId: user.id,
          },
        },
        update: { requests: count },
        create: {
          platform: "chatgpt",
          date: row.periodStart,
          model,
          userId: user.id,
          requests: count,
          inputTokens: BigInt(0),
          outputTokens: BigInt(0),
          totalTokens: BigInt(0),
        },
      });
      records++;
    }

    // 4. Upsert cost record if credits were used
    if (row.creditsUsed > 0) {
      await db.costRecord.upsert({
        where: {
          platform_date_category: {
            platform: "chatgpt",
            date: row.periodStart,
            category: "csv-import",
          },
        },
        update: { amount: row.creditsUsed },
        create: {
          platform: "chatgpt",
          date: row.periodStart,
          category: "csv-import",
          amount: row.creditsUsed,
        },
      });
    }
  }

  return { users, records };
}
