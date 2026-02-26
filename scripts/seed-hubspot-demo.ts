import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// --- Helpers ---

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cuid(): string {
  return (
    "c" +
    Math.random().toString(36).slice(2, 12) +
    Date.now().toString(36)
  );
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// --- Static data ---

const OWNERS = [
  { id: "owner-1", email: "josh.kelly@consello.com", firstName: "Josh", lastName: "Kelly", teamName: "Advisory" },
  { id: "owner-2", email: "wendy.marcus@consello.com", firstName: "Wendy", lastName: "Marcus", teamName: "Investment Banking" },
  { id: "owner-3", email: "david.chen@consello.com", firstName: "David", lastName: "Chen", teamName: "Advisory" },
  { id: "owner-4", email: "sarah.oconnor@consello.com", firstName: "Sarah", lastName: "OConnor", teamName: "Talent Recruiting" },
  { id: "owner-5", email: "michael.torres@consello.com", firstName: "Michael", lastName: "Torres", teamName: "Investment Banking" },
];

const PIPELINE_STAGES = [
  // Advisory
  { pipelineId: "pipeline-advisory", pipelineLabel: "Advisory", stageId: "adv-prospect", stageLabel: "Prospect", displayOrder: 1, probability: 0.1 },
  { pipelineId: "pipeline-advisory", pipelineLabel: "Advisory", stageId: "adv-qualified", stageLabel: "Qualified", displayOrder: 2, probability: 0.25 },
  { pipelineId: "pipeline-advisory", pipelineLabel: "Advisory", stageId: "adv-proposal", stageLabel: "Proposal", displayOrder: 3, probability: 0.5 },
  { pipelineId: "pipeline-advisory", pipelineLabel: "Advisory", stageId: "adv-negotiation", stageLabel: "Negotiation", displayOrder: 4, probability: 0.75 },
  { pipelineId: "pipeline-advisory", pipelineLabel: "Advisory", stageId: "adv-closedwon", stageLabel: "Closed Won", displayOrder: 5, probability: 1.0 },
  { pipelineId: "pipeline-advisory", pipelineLabel: "Advisory", stageId: "adv-closedlost", stageLabel: "Closed Lost", displayOrder: 6, probability: 0.0 },
  // Investment Banking
  { pipelineId: "pipeline-ib", pipelineLabel: "Investment Banking", stageId: "ib-mandate", stageLabel: "Mandate", displayOrder: 1, probability: 0.15 },
  { pipelineId: "pipeline-ib", pipelineLabel: "Investment Banking", stageId: "ib-diligence", stageLabel: "Due Diligence", displayOrder: 2, probability: 0.4 },
  { pipelineId: "pipeline-ib", pipelineLabel: "Investment Banking", stageId: "ib-termsheet", stageLabel: "Term Sheet", displayOrder: 3, probability: 0.65 },
  { pipelineId: "pipeline-ib", pipelineLabel: "Investment Banking", stageId: "ib-documentation", stageLabel: "Documentation", displayOrder: 4, probability: 0.85 },
  { pipelineId: "pipeline-ib", pipelineLabel: "Investment Banking", stageId: "ib-closed", stageLabel: "Closed", displayOrder: 5, probability: 1.0 },
  { pipelineId: "pipeline-ib", pipelineLabel: "Investment Banking", stageId: "ib-lost", stageLabel: "Lost", displayOrder: 6, probability: 0.0 },
  // Talent Recruiting
  { pipelineId: "pipeline-talent", pipelineLabel: "Talent Recruiting", stageId: "tal-sourcing", stageLabel: "Sourcing", displayOrder: 1, probability: 0.1 },
  { pipelineId: "pipeline-talent", pipelineLabel: "Talent Recruiting", stageId: "tal-screening", stageLabel: "Screening", displayOrder: 2, probability: 0.3 },
  { pipelineId: "pipeline-talent", pipelineLabel: "Talent Recruiting", stageId: "tal-interview", stageLabel: "Interview", displayOrder: 3, probability: 0.5 },
  { pipelineId: "pipeline-talent", pipelineLabel: "Talent Recruiting", stageId: "tal-offer", stageLabel: "Offer", displayOrder: 4, probability: 0.8 },
  { pipelineId: "pipeline-talent", pipelineLabel: "Talent Recruiting", stageId: "tal-placed", stageLabel: "Placed", displayOrder: 5, probability: 1.0 },
  { pipelineId: "pipeline-talent", pipelineLabel: "Talent Recruiting", stageId: "tal-lost", stageLabel: "Lost", displayOrder: 6, probability: 0.0 },
];

const COMPANY_NAMES = [
  // Tech
  "Palantir Technologies", "Snowflake Inc.", "Databricks", "Stripe", "Figma",
  "Notion Labs", "Airtable", "Rippling", "Brex", "Plaid",
  // Private Equity
  "Blackstone Group", "KKR & Co.", "Apollo Global Management", "Carlyle Group", "Warburg Pincus",
  "General Atlantic", "Advent International", "Silver Lake Partners", "Vista Equity Partners", "Thoma Bravo",
  // Hedge Funds
  "Citadel LLC", "Two Sigma Investments", "Renaissance Technologies", "Bridgewater Associates", "Elliott Management",
  // Consumer / Healthcare
  "Peloton Interactive", "Whole Foods Market", "Chewy Inc.", "Hims & Hers Health", "Oscar Health",
];

const COMPANY_DOMAINS = [
  "palantir.com", "snowflake.com", "databricks.com", "stripe.com", "figma.com",
  "notion.so", "airtable.com", "rippling.com", "brex.com", "plaid.com",
  "blackstone.com", "kkr.com", "apollo.com", "carlyle.com", "warburgpincus.com",
  "generalatlantic.com", "adventinternational.com", "silverlake.com", "vistaequitypartners.com", "thomabravo.com",
  "citadel.com", "twosigma.com", "rentec.com", "bridgewater.com", "elliottmgmt.com",
  "onepeloton.com", "wholefoods.com", "chewy.com", "forhims.com", "hioscar.com",
];

const CONTACT_FIRST = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Drew", "Cameron",
  "Avery", "Blake", "Quinn", "Reese", "Logan", "Peyton", "Sydney", "Dakota",
  "Spencer", "Hayden", "Parker", "Mackenzie", "Tyler", "Jamie", "Kendall", "Skyler",
  "Finley", "Emerson", "Rowan", "Sage", "Remy", "Marlowe",
];

const CONTACT_LAST = [
  "Richardson", "Montgomery", "Fitzgerald", "Callahan", "Harrington",
  "Blackwood", "Ashworth", "Pennington", "Whitfield", "Drummond",
  "Gallagher", "Thornton", "Kingsly", "Fairchild", "Sutherland",
  "Vandenberg", "Ashford", "Westbrook", "Beaumont", "Stanhope",
];

const JOB_TITLES = [
  "Chief Executive Officer", "Chief Financial Officer", "Chief Operating Officer",
  "Chief Strategy Officer", "Chief Revenue Officer", "Managing Director",
  "Senior Vice President", "Vice President", "Director of Finance",
  "Head of Corporate Development", "General Counsel", "Partner",
  "Principal", "Associate", "Investment Manager",
];

const LIFECYCLE_STAGES = [
  "lead", "lead", "lead", "lead",
  "marketingqualifiedlead", "marketingqualifiedlead", "marketingqualifiedlead",
  "salesqualifiedlead", "salesqualifiedlead", "salesqualifiedlead", "salesqualifiedlead", "salesqualifiedlead",
  "opportunity", "opportunity", "opportunity", "opportunity", "opportunity",
  "customer", "customer", "customer",
];

const ENGAGEMENT_TYPES = [
  "meeting", "meeting", "meeting", "meeting", "meeting", "meeting",
  "call", "call", "call", "call", "call",
  "email", "email", "email", "email", "email",
  "note", "note",
  "task", "task",
];

// --- Main ---

async function main() {
  console.log("=== HubSpot Demo Seed ===\n");

  // Cleanup
  console.log("Cleaning up existing HubSpot data...");
  await db.hubSpotEngagement.deleteMany();
  await db.hubSpotContact.deleteMany();
  await db.hubSpotDeal.deleteMany();
  await db.hubSpotCompany.deleteMany();
  await db.hubSpotPipelineStage.deleteMany();
  await db.hubSpotOwner.deleteMany();
  // Remove existing hubspot sync log
  await db.syncLog.deleteMany({ where: { platform: "hubspot" } });
  console.log("  Existing HubSpot data cleared.\n");

  // Owners
  console.log("Creating 5 HubSpot owners...");
  await db.hubSpotOwner.createMany({ data: OWNERS });
  console.log("  Owners created.\n");

  // Pipeline stages
  console.log("Creating pipeline stages (3 pipelines x 6 stages)...");
  await db.hubSpotPipelineStage.createMany({
    data: PIPELINE_STAGES.map((s) => ({ id: cuid(), ...s })),
  });
  console.log("  Pipeline stages created.\n");

  // Companies
  console.log("Creating 30 companies...");
  const companies: Array<{
    id: string;
    name: string;
    domain: string;
    ownerId: string;
    ownerName: string;
    lastContacted: Date;
    lastActivity: Date;
    associatedContacts: number;
    associatedDeals: number;
    createdAt: Date;
    activityBucket: "active" | "cooling" | "cold" | "atrisk";
  }> = [];

  // Activity buckets:
  // 0-9   => active (contacted last 14 days)
  // 10-17 => cooling (15-30 days)
  // 18-24 => cold (30-60 days)
  // 25-29 => at risk (60-120 days)
  const buckets: Array<{ bucket: "active" | "cooling" | "cold" | "atrisk"; minDays: number; maxDays: number }> = [
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "active", minDays: 1, maxDays: 14 },
    { bucket: "cooling", minDays: 15, maxDays: 30 },
    { bucket: "cooling", minDays: 15, maxDays: 30 },
    { bucket: "cooling", minDays: 15, maxDays: 30 },
    { bucket: "cooling", minDays: 15, maxDays: 30 },
    { bucket: "cooling", minDays: 15, maxDays: 30 },
    { bucket: "cooling", minDays: 15, maxDays: 30 },
    { bucket: "cooling", minDays: 15, maxDays: 30 },
    { bucket: "cooling", minDays: 15, maxDays: 30 },
    { bucket: "cold", minDays: 31, maxDays: 60 },
    { bucket: "cold", minDays: 31, maxDays: 60 },
    { bucket: "cold", minDays: 31, maxDays: 60 },
    { bucket: "cold", minDays: 31, maxDays: 60 },
    { bucket: "cold", minDays: 31, maxDays: 60 },
    { bucket: "cold", minDays: 31, maxDays: 60 },
    { bucket: "cold", minDays: 31, maxDays: 60 },
    { bucket: "atrisk", minDays: 61, maxDays: 120 },
    { bucket: "atrisk", minDays: 61, maxDays: 120 },
    { bucket: "atrisk", minDays: 61, maxDays: 120 },
    { bucket: "atrisk", minDays: 61, maxDays: 120 },
    { bucket: "atrisk", minDays: 61, maxDays: 120 },
  ];

  for (let i = 0; i < 30; i++) {
    const owner = OWNERS[i % OWNERS.length];
    const { bucket, minDays, maxDays } = buckets[i];
    const lastContactedDaysAgo = rand(minDays, maxDays);
    const lastContacted = daysAgo(lastContactedDaysAgo);
    const lastActivity = daysAgo(lastContactedDaysAgo - rand(0, 3));

    companies.push({
      id: "company-" + (i + 1),
      name: COMPANY_NAMES[i],
      domain: COMPANY_DOMAINS[i],
      ownerId: owner.id,
      ownerName: owner.firstName + " " + owner.lastName,
      lastContacted,
      lastActivity,
      associatedContacts: rand(1, 5),
      associatedDeals: rand(0, 3),
      createdAt: daysAgo(rand(180, 720)),
      activityBucket: bucket,
    });
  }

  await db.hubSpotCompany.createMany({
    data: companies.map(({ activityBucket: _b, ...c }) => c),
  });
  console.log("  Created 30 companies.\n");

  // Deals
  console.log("Creating 40 deals...");
  const deals: Array<{
    id: string;
    name: string;
    stage: string;
    stageLabel: string;
    pipeline: string;
    pipelineLabel: string;
    amount: number;
    closeDate: Date;
    ownerId: string;
    ownerName: string;
    createdAt: Date;
    lastModified: Date;
    daysInStage: number;
  }> = [];

  // Advisory deals (15)
  const advStages = PIPELINE_STAGES.filter((s) => s.pipelineId === "pipeline-advisory");
  const advisoryDealNames = [
    "Strategic Advisory - Palantir", "M&A Advisory - Snowflake", "Board Advisory - Databricks",
    "IPO Readiness - Stripe", "Growth Strategy - Figma", "Transformation - Notion",
    "Due Diligence Support - Airtable", "Strategic Review - Rippling", "Expansion - Brex",
    "Partnership Advisory - Plaid", "Exit Strategy - Blackstone", "Value Creation - KKR",
    "Portfolio Review - Apollo", "Strategic Positioning - Carlyle", "Board Prep - Warburg",
  ];
  for (let i = 0; i < 15; i++) {
    const stage = advStages[rand(0, advStages.length - 1)];
    const owner = i % 2 === 0 ? OWNERS[0] : OWNERS[2];
    const isClosed = stage.stageId === "adv-closedwon" || stage.stageId === "adv-closedlost";
    deals.push({
      id: "deal-adv-" + (i + 1),
      name: advisoryDealNames[i],
      stage: stage.stageId,
      stageLabel: stage.stageLabel,
      pipeline: "pipeline-advisory",
      pipelineLabel: "Advisory",
      amount: rand(150_000, 2_000_000),
      closeDate: isClosed ? daysAgo(rand(5, 60)) : daysFromNow(rand(30, 180)),
      ownerId: owner.id,
      ownerName: owner.firstName + " " + owner.lastName,
      createdAt: daysAgo(rand(30, 180)),
      lastModified: daysAgo(rand(0, 14)),
      daysInStage: rand(3, 45),
    });
  }

  // IB deals (15)
  const ibStages = PIPELINE_STAGES.filter((s) => s.pipelineId === "pipeline-ib");
  const ibDealNames = [
    "M&A Mandate - General Atlantic", "Acquisition - Silver Lake", "Sell-side - Vista Equity",
    "Buy-side - Thoma Bravo", "Recapitalization - Citadel", "Secondary - Two Sigma",
    "PIPE - Renaissance", "Debt Financing - Bridgewater", "Carve-out - Elliott",
    "Merger - Peloton", "Acquisition - Whole Foods", "Growth Equity - Chewy",
    "Strategic Sale - Hims Hers", "IPO Advisory - Oscar Health", "Buyout - Advent",
  ];
  for (let i = 0; i < 15; i++) {
    const stage = ibStages[rand(0, ibStages.length - 1)];
    const owner = i % 2 === 0 ? OWNERS[1] : OWNERS[4];
    const isClosed = stage.stageId === "ib-closed" || stage.stageId === "ib-lost";
    deals.push({
      id: "deal-ib-" + (i + 1),
      name: ibDealNames[i],
      stage: stage.stageId,
      stageLabel: stage.stageLabel,
      pipeline: "pipeline-ib",
      pipelineLabel: "Investment Banking",
      amount: rand(500_000, 5_000_000),
      closeDate: isClosed ? daysAgo(rand(5, 60)) : daysFromNow(rand(30, 240)),
      ownerId: owner.id,
      ownerName: owner.firstName + " " + owner.lastName,
      createdAt: daysAgo(rand(30, 240)),
      lastModified: daysAgo(rand(0, 21)),
      daysInStage: rand(5, 60),
    });
  }

  // Talent deals (10)
  const talStages = PIPELINE_STAGES.filter((s) => s.pipelineId === "pipeline-talent");
  const talentDealNames = [
    "CFO Search - Palantir", "CTO Placement - Snowflake", "COO Search - Databricks",
    "VP Engineering - Stripe", "CMO Search - Figma", "CPO Placement - Notion",
    "CRO Search - Airtable", "CLO Placement - Rippling", "CHRO Search - Brex", "CSO Placement - Plaid",
  ];
  for (let i = 0; i < 10; i++) {
    const stage = talStages[rand(0, talStages.length - 1)];
    const owner = OWNERS[3];
    const isClosed = stage.stageId === "tal-placed" || stage.stageId === "tal-lost";
    deals.push({
      id: "deal-tal-" + (i + 1),
      name: talentDealNames[i],
      stage: stage.stageId,
      stageLabel: stage.stageLabel,
      pipeline: "pipeline-talent",
      pipelineLabel: "Talent Recruiting",
      amount: rand(50_000, 300_000),
      closeDate: isClosed ? daysAgo(rand(5, 45)) : daysFromNow(rand(14, 120)),
      ownerId: owner.id,
      ownerName: owner.firstName + " " + owner.lastName,
      createdAt: daysAgo(rand(14, 120)),
      lastModified: daysAgo(rand(0, 10)),
      daysInStage: rand(2, 30),
    });
  }

  await db.hubSpotDeal.createMany({ data: deals });
  console.log("  Created 40 deals.\n");

  // Contacts
  console.log("Creating 80 contacts...");
  const contacts: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    jobTitle: string;
    phone: string;
    lifecycleStage: string;
    ownerId: string;
    createdAt: Date;
    lastModified: Date;
  }> = [];

  const usedContactEmails = new Set<string>();
  for (let i = 0; i < 80; i++) {
    const companyIdx = i % 30;
    const company = companies[companyIdx];
    const firstName = pick(CONTACT_FIRST);
    const lastName = pick(CONTACT_LAST);
    let email = firstName.toLowerCase() + "." + lastName.toLowerCase() + "@" + company.domain;
    // Deduplicate emails
    let suffix = 0;
    while (usedContactEmails.has(email)) {
      suffix++;
      email = firstName.toLowerCase() + "." + lastName.toLowerCase() + suffix + "@" + company.domain;
    }
    usedContactEmails.add(email);

    contacts.push({
      id: "contact-" + (i + 1),
      email,
      firstName,
      lastName,
      company: company.name,
      jobTitle: pick(JOB_TITLES),
      phone: "+1-" + rand(200, 999) + "-" + rand(100, 999) + "-" + rand(1000, 9999),
      lifecycleStage: pick(LIFECYCLE_STAGES),
      ownerId: company.ownerId,
      createdAt: daysAgo(rand(30, 540)),
      lastModified: daysAgo(rand(0, 30)),
    });
  }

  await db.hubSpotContact.createMany({ data: contacts });
  console.log("  Created 80 contacts.\n");

  // Engagements
  console.log("Creating 200 engagements over 90 days...");
  const engagements: Array<{
    id: string;
    type: string;
    ownerId: string;
    companyId: string;
    contactId: string;
    dealId: string | null;
    occurredAt: Date;
  }> = [];

  // Weight engagements by company activity bucket:
  // active: 60% of engagements, cooling: 25%, cold: 10%, at risk: 5%
  const activeCompanies = companies.filter((c) => c.activityBucket === "active");
  const coolingCompanies = companies.filter((c) => c.activityBucket === "cooling");
  const coldCompanies = companies.filter((c) => c.activityBucket === "cold");
  const atriskCompanies = companies.filter((c) => c.activityBucket === "atrisk");

  function pickCompanyWeighted() {
    const r = Math.random();
    if (r < 0.60) return pick(activeCompanies);
    if (r < 0.85) return pick(coolingCompanies);
    if (r < 0.95) return pick(coldCompanies);
    return pick(atriskCompanies);
  }

  for (let i = 0; i < 200; i++) {
    const company = pickCompanyWeighted();
    // Pick a contact belonging to this company (approx -- use modulo for demo)
    const companyIdx = parseInt(company.id.replace("company-", ""), 10) - 1;
    const contactIdx = companyIdx % contacts.length;
    const contact = contacts[contactIdx];

    // Recency: active companies get more recent engagements
    let daysBack: number;
    if (company.activityBucket === "active") daysBack = rand(1, 14);
    else if (company.activityBucket === "cooling") daysBack = rand(10, 35);
    else if (company.activityBucket === "cold") daysBack = rand(30, 65);
    else daysBack = rand(60, 90);

    // Pick a deal for this company pipeline (optional)
    const companyDeals = deals.filter((d) => d.ownerName === company.ownerName);
    const linkedDeal = companyDeals.length > 0 && Math.random() < 0.4
      ? companyDeals[rand(0, companyDeals.length - 1)]
      : null;

    engagements.push({
      id: "engagement-" + (i + 1),
      type: pick(ENGAGEMENT_TYPES),
      ownerId: company.ownerId,
      companyId: company.id,
      contactId: contact.id,
      dealId: linkedDeal ? linkedDeal.id : null,
      occurredAt: daysAgo(daysBack),
    });
  }

  await db.hubSpotEngagement.createMany({ data: engagements });
  console.log("  Created 200 engagements.\n");

  // SyncLog
  console.log("Recording HubSpot SyncLog entry...");
  await db.syncLog.create({
    data: {
      id: cuid(),
      platform: "hubspot",
      status: "success",
      message: "Demo seed -- full HubSpot CRM data loaded",
      recordCount: 30 + 40 + 80 + 200,
      syncedAt: new Date(),
    },
  });
  console.log("  SyncLog entry created.\n");

  // Summary
  const openDeals = deals.filter(
    (d) => d.stage !== "adv-closedwon" && d.stage !== "adv-closedlost" &&
           d.stage !== "ib-closed" && d.stage !== "ib-lost" &&
           d.stage !== "tal-placed" && d.stage !== "tal-lost"
  );
  const totalPipeline = deals.reduce((s, d) => s + d.amount, 0);
  const openPipeline = openDeals.reduce((s, d) => s + d.amount, 0);

  console.log("=== HubSpot Seed Complete ===");
  console.log("  Owners:              " + OWNERS.length);
  console.log("  Pipeline stages:     " + PIPELINE_STAGES.length);
  console.log("  Companies:           30");
  console.log("    Active (<14d):     " + activeCompanies.length);
  console.log("    Cooling (15-30d):  " + coolingCompanies.length);
  console.log("    Cold (30-60d):     " + coldCompanies.length);
  console.log("    At risk (60-120d): " + atriskCompanies.length);
  console.log("  Deals:               40");
  console.log("    Open:              " + openDeals.length);
  console.log("    Total pipeline:    $" + totalPipeline.toLocaleString());
  console.log("    Open pipeline:     $" + openPipeline.toLocaleString());
  console.log("  Contacts:            80");
  console.log("  Engagements:         200");
}

main()
  .catch((e) => {
    console.error("HubSpot seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
