/**
 * HubSpot sync orchestration
 * Fetches data from HubSpot CRM and upserts into Neon Postgres via Prisma.
 */

import { db } from "@/lib/db";
import {
  fetchOwners,
  fetchPipelines,
  fetchDeals,
  fetchCompanies,
  fetchContacts,
  fetchEngagements,
} from "@/lib/hubspot-client";

// ─── Owners ──────────────────────────────────────────────────────────────────

export async function syncHubSpotOwners(): Promise<{ count: number }> {
  const owners = await fetchOwners();

  for (const owner of owners) {
    await db.hubSpotOwner.upsert({
      where: { id: owner.id },
      update: {
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        teamName: owner.teamName,
      },
      create: {
        id: owner.id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        teamName: owner.teamName,
      },
    });
  }

  return { count: owners.length };
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export async function syncHubSpotPipelines(): Promise<{ count: number }> {
  const pipelines = await fetchPipelines();
  let count = 0;

  for (const pipeline of pipelines) {
    for (const stage of pipeline.stages) {
      await db.hubSpotPipelineStage.upsert({
        where: {
          pipelineId_stageId: {
            pipelineId: pipeline.id,
            stageId: stage.id,
          },
        },
        update: {
          pipelineLabel: pipeline.label,
          stageLabel: stage.label,
          displayOrder: stage.displayOrder,
          probability: stage.probability,
        },
        create: {
          pipelineId: pipeline.id,
          pipelineLabel: pipeline.label,
          stageId: stage.id,
          stageLabel: stage.label,
          displayOrder: stage.displayOrder,
          probability: stage.probability,
        },
      });
      count++;
    }
  }

  return { count };
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export async function syncHubSpotDeals(): Promise<{ count: number }> {
  const rawDeals = await fetchDeals();

  // Load pipeline stages for label resolution
  const pipelineStages = await db.hubSpotPipelineStage.findMany();
  const stageMap = new Map(
    pipelineStages.map((s) => [`${s.pipelineId}:${s.stageId}`, s])
  );
  const pipelineLabelMap = new Map(
    pipelineStages.map((s) => [s.pipelineId, s.pipelineLabel])
  );

  // Load owners for name resolution
  const owners = await db.hubSpotOwner.findMany();
  const ownerMap = new Map(
    owners.map((o) => [
      o.id,
      [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email,
    ])
  );

  const now = new Date();

  for (const deal of rawDeals) {
    const stageKey = `${deal.pipeline}:${deal.stage}`;
    const stageRecord = stageMap.get(stageKey);
    const ownerName = deal.ownerId ? ownerMap.get(deal.ownerId) ?? null : null;

    // Calculate days in stage using lastModified for open deals
    const lastModified = new Date(deal.lastModified);
    const daysInStage = Math.floor(
      (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24)
    );

    await db.hubSpotDeal.upsert({
      where: { id: deal.id },
      update: {
        name: deal.name,
        stage: deal.stage,
        stageLabel: stageRecord?.stageLabel ?? null,
        pipeline: deal.pipeline,
        pipelineLabel: pipelineLabelMap.get(deal.pipeline) ?? null,
        amount: deal.amount !== null ? parseFloat(deal.amount) : null,
        closeDate: deal.closeDate ? new Date(deal.closeDate) : null,
        ownerId: deal.ownerId,
        ownerName,
        lastModified: new Date(deal.lastModified),
        daysInStage,
        syncedAt: now,
      },
      create: {
        id: deal.id,
        name: deal.name,
        stage: deal.stage,
        stageLabel: stageRecord?.stageLabel ?? null,
        pipeline: deal.pipeline,
        pipelineLabel: pipelineLabelMap.get(deal.pipeline) ?? null,
        amount: deal.amount !== null ? parseFloat(deal.amount) : null,
        closeDate: deal.closeDate ? new Date(deal.closeDate) : null,
        ownerId: deal.ownerId,
        ownerName,
        createdAt: new Date(deal.createdAt),
        lastModified: new Date(deal.lastModified),
        daysInStage,
        syncedAt: now,
      },
    });
  }

  return { count: rawDeals.length };
}

// ─── Companies ────────────────────────────────────────────────────────────────

export async function syncHubSpotCompanies(): Promise<{ count: number }> {
  const rawCompanies = await fetchCompanies();

  const owners = await db.hubSpotOwner.findMany();
  const ownerMap = new Map(
    owners.map((o) => [
      o.id,
      [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email,
    ])
  );

  const now = new Date();

  for (const company of rawCompanies) {
    const ownerName = company.ownerId
      ? ownerMap.get(company.ownerId) ?? null
      : null;

    await db.hubSpotCompany.upsert({
      where: { id: company.id },
      update: {
        name: company.name,
        domain: company.domain,
        ownerId: company.ownerId,
        ownerName,
        lastContacted: company.lastContacted
          ? new Date(company.lastContacted)
          : null,
        lastActivity: company.lastUpdated
          ? new Date(company.lastUpdated)
          : null,
        associatedContacts: company.associatedContacts,
        associatedDeals: company.associatedDeals,
        syncedAt: now,
      },
      create: {
        id: company.id,
        name: company.name,
        domain: company.domain,
        ownerId: company.ownerId,
        ownerName,
        lastContacted: company.lastContacted
          ? new Date(company.lastContacted)
          : null,
        lastActivity: company.lastUpdated
          ? new Date(company.lastUpdated)
          : null,
        associatedContacts: company.associatedContacts,
        associatedDeals: company.associatedDeals,
        createdAt: new Date(company.createdAt),
        syncedAt: now,
      },
    });
  }

  return { count: rawCompanies.length };
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function syncHubSpotContacts(): Promise<{ count: number }> {
  const rawContacts = await fetchContacts();
  const now = new Date();

  for (const contact of rawContacts) {
    await db.hubSpotContact.upsert({
      where: { id: contact.id },
      update: {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        jobTitle: contact.jobTitle,
        phone: contact.phone,
        lifecycleStage: contact.lifecycleStage,
        ownerId: contact.ownerId,
        lastModified: new Date(contact.lastModified),
        syncedAt: now,
      },
      create: {
        id: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        jobTitle: contact.jobTitle,
        phone: contact.phone,
        lifecycleStage: contact.lifecycleStage,
        ownerId: contact.ownerId,
        createdAt: new Date(contact.createdAt),
        lastModified: new Date(contact.lastModified),
        syncedAt: now,
      },
    });
  }

  return { count: rawContacts.length };
}

// ─── Engagements ──────────────────────────────────────────────────────────────

export async function syncHubSpotEngagements(): Promise<{ count: number }> {
  const engagementTypes = [
    "meetings",
    "calls",
    "emails",
    "notes",
    "tasks",
  ] as const;

  // Sync last 90 days of engagements
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceISO = since.toISOString();

  let totalCount = 0;
  const now = new Date();

  for (const engagementType of engagementTypes) {
    const engagements = await fetchEngagements(engagementType, sinceISO);

    for (const eng of engagements) {
      await db.hubSpotEngagement.upsert({
        where: { id: eng.id },
        update: {
          type: eng.type,
          ownerId: eng.ownerId,
          companyId: eng.companyId,
          contactId: eng.contactId,
          dealId: eng.dealId,
          occurredAt: new Date(eng.occurredAt),
          syncedAt: now,
        },
        create: {
          id: eng.id,
          type: eng.type,
          ownerId: eng.ownerId,
          companyId: eng.companyId,
          contactId: eng.contactId,
          dealId: eng.dealId,
          occurredAt: new Date(eng.occurredAt),
          syncedAt: now,
        },
      });
      totalCount++;
    }
  }

  return { count: totalCount };
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────

export async function syncAllHubSpot(): Promise<{
  owners: number;
  pipelineStages: number;
  deals: number;
  companies: number;
  contacts: number;
  engagements: number;
}> {
  let ownerCount = 0;
  let stageCount = 0;
  let dealCount = 0;
  let companyCount = 0;
  let contactCount = 0;
  let engagementCount = 0;
  let status = "success";
  let totalRecords = 0;

  try {
    // Owners and pipelines must sync first (deals depend on both)
    const [ownersResult, pipelinesResult] = await Promise.all([
      syncHubSpotOwners(),
      syncHubSpotPipelines(),
    ]);
    ownerCount = ownersResult.count;
    stageCount = pipelinesResult.count;

    // Then sync CRM objects in parallel
    const [dealsResult, companiesResult, contactsResult, engagementsResult] =
      await Promise.all([
        syncHubSpotDeals(),
        syncHubSpotCompanies(),
        syncHubSpotContacts(),
        syncHubSpotEngagements(),
      ]);

    dealCount = dealsResult.count;
    companyCount = companiesResult.count;
    contactCount = contactsResult.count;
    engagementCount = engagementsResult.count;

    totalRecords =
      ownerCount +
      stageCount +
      dealCount +
      companyCount +
      contactCount +
      engagementCount;
  } catch (err) {
    status = "error";
    console.error("HubSpot sync error:", err);
    throw err;
  } finally {
    await db.syncLog.create({
      data: {
        platform: "hubspot",
        status,
        recordCount: totalRecords,
      },
    });
  }

  return {
    owners: ownerCount,
    pipelineStages: stageCount,
    deals: dealCount,
    companies: companyCount,
    contacts: contactCount,
    engagements: engagementCount,
  };
}
