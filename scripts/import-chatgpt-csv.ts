/**
 * Bulk import ChatGPT monthly user report CSVs from a local directory.
 *
 * Usage:
 *   npm run import:chatgpt
 *   npx tsx scripts/import-chatgpt-csv.ts [path-to-csv-directory]
 *
 * Default directory: ../../ChatGPT Usage  (relative to this script)
 * This points to: Dashboard-AI and CRM/ChatGPT Usage/
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { parseCsvContent, importChatGPTRows } from "../src/lib/chatgpt-csv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const CSV_DIR = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "..", "ChatGPT Usage");

async function main() {
  console.log(`\nChatGPT CSV Import`);
  console.log(`Directory: ${CSV_DIR}\n`);

  if (!fs.existsSync(CSV_DIR)) {
    console.error(`Directory not found: ${CSV_DIR}`);
    console.error(`Usage: npx tsx scripts/import-chatgpt-csv.ts [path-to-csv-dir]`);
    process.exit(1);
  }

  const csvFiles = fs
    .readdirSync(CSV_DIR)
    .filter((f) => f.endsWith(".csv"))
    .sort();

  if (csvFiles.length === 0) {
    console.error("No CSV files found.");
    process.exit(1);
  }

  console.log(`Found ${csvFiles.length} file(s):\n`);
  csvFiles.forEach((f) => console.log(`  ${f}`));
  console.log();

  let totalUsers = 0;
  let totalRecords = 0;

  for (const filename of csvFiles) {
    const filePath = path.join(CSV_DIR, filename);
    const text = fs.readFileSync(filePath, "utf-8");

    let rows;
    try {
      rows = parseCsvContent(text);
    } catch (err) {
      console.warn(`  Skipping ${filename}: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    console.log(`── ${filename} (${rows.length} user rows)`);
    const result = await importChatGPTRows(rows, db);
    console.log(`   → ${result.records} usage records upserted`);

    totalUsers += result.users;
    totalRecords += result.records;
  }

  await db.syncLog.create({
    data: {
      platform: "chatgpt",
      status: "success",
      message: `CSV import: ${csvFiles.length} files`,
      recordCount: totalRecords,
    },
  });

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Files processed : ${csvFiles.length}`);
  console.log(`Users upserted  : ${totalUsers}`);
  console.log(`Records created : ${totalRecords}`);
  console.log();

  await db.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
