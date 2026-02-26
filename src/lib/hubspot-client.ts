/**
 * HubSpot CRM API v3 client
 * Auth: Bearer token from HUBSPOT_ACCESS_TOKEN env var
 * Base: https://api.hubapi.com
 * Rate limit: 100 req / 10s — 100ms delay between paginated requests
 */

const BASE = "https://api.hubapi.com";

function getToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN is not set");
  return token;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HubSpot API error ${res.status} at ${path}: ${body}`
    );
  }
  return res.json() as Promise<T>;
}

/** 100ms delay to respect HubSpot rate limits between paginated calls */
function delay(): Promise<void> {
  return new Promise((r) => setTimeout(r, 100));
}

// ─── Raw API response shapes ─────────────────────────────────────────────────

interface HubSpotListResponse<T> {
  results: T[];
  paging?: { next?: { after: string } };
}

interface HubSpotObject {
  id: string;
  properties: Record<string, string | null>;
}

interface HubSpotPipelineStageRaw {
  id: string;
  label: string;
  displayOrder: number;
  metadata: { probability?: string };
}

interface HubSpotPipelineRaw {
  id: string;
  label: string;
  displayOrder: number;
  stages: HubSpotPipelineStageRaw[];
}

interface HubSpotOwnerRaw {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  teams?: Array<{ name: string }>;
}

// ─── Public typed return types ───────────────────────────────────────────────

export interface RawDeal {
  id: string;
  name: string;
  stage: string;
  pipeline: string;
  amount: string | null;
  closeDate: string | null;
  ownerId: string | null;
  createdAt: string;
  lastModified: string;
}

export interface RawCompany {
  id: string;
  name: string;
  domain: string | null;
  ownerId: string | null;
  lastContacted: string | null;
  lastUpdated: string | null;
  associatedContacts: number;
  associatedDeals: number;
  createdAt: string;
}

export interface RawContact {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  lifecycleStage: string | null;
  ownerId: string | null;
  createdAt: string;
  lastModified: string;
}

export interface RawOwner {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  teamName: string | null;
}

export interface RawPipeline {
  id: string;
  label: string;
  stages: Array<{
    id: string;
    label: string;
    displayOrder: number;
    probability: number;
  }>;
}

export interface RawEngagement {
  id: string;
  type: string;
  ownerId: string | null;
  companyId: string | null;
  contactId: string | null;
  dealId: string | null;
  occurredAt: string;
}

// ─── API functions ────────────────────────────────────────────────────────────

/** Fetch all deals from HubSpot CRM */
export async function fetchDeals(): Promise<RawDeal[]> {
  const deals: RawDeal[] = [];
  let after: string | undefined;
  const properties =
    "dealname,amount,dealstage,pipeline,closedate,hubspot_owner_id,hs_lastmodifieddate,createdate";

  do {
    const params = new URLSearchParams({ properties, limit: "100" });
    if (after) params.set("after", after);

    const data = await apiFetch<HubSpotListResponse<HubSpotObject>>(
      `/crm/v3/objects/deals?${params.toString()}`
    );

    for (const obj of data.results) {
      const p = obj.properties;
      deals.push({
        id: obj.id,
        name: p["dealname"] ?? "",
        stage: p["dealstage"] ?? "",
        pipeline: p["pipeline"] ?? "",
        amount: p["amount"] ?? null,
        closeDate: p["closedate"] ?? null,
        ownerId: p["hubspot_owner_id"] ?? null,
        createdAt: p["createdate"] ?? new Date().toISOString(),
        lastModified: p["hs_lastmodifieddate"] ?? new Date().toISOString(),
      });
    }

    after = data.paging?.next?.after;
    if (after) await delay();
  } while (after);

  return deals;
}

/** Fetch all companies from HubSpot CRM */
export async function fetchCompanies(): Promise<RawCompany[]> {
  const companies: RawCompany[] = [];
  let after: string | undefined;
  const properties =
    "name,domain,notes_last_contacted,notes_last_updated,num_associated_contacts,num_associated_deals,hubspot_owner_id,createdate";

  do {
    const params = new URLSearchParams({ properties, limit: "100" });
    if (after) params.set("after", after);

    const data = await apiFetch<HubSpotListResponse<HubSpotObject>>(
      `/crm/v3/objects/companies?${params.toString()}`
    );

    for (const obj of data.results) {
      const p = obj.properties;
      companies.push({
        id: obj.id,
        name: p["name"] ?? "",
        domain: p["domain"] ?? null,
        ownerId: p["hubspot_owner_id"] ?? null,
        lastContacted: p["notes_last_contacted"] ?? null,
        lastUpdated: p["notes_last_updated"] ?? null,
        associatedContacts: parseInt(p["num_associated_contacts"] ?? "0", 10) || 0,
        associatedDeals: parseInt(p["num_associated_deals"] ?? "0", 10) || 0,
        createdAt: p["createdate"] ?? new Date().toISOString(),
      });
    }

    after = data.paging?.next?.after;
    if (after) await delay();
  } while (after);

  return companies;
}

/** Fetch all contacts from HubSpot CRM */
export async function fetchContacts(): Promise<RawContact[]> {
  const contacts: RawContact[] = [];
  let after: string | undefined;
  const properties =
    "email,firstname,lastname,lifecyclestage,hubspot_owner_id,createdate,lastmodifieddate,company,jobtitle,phone";

  do {
    const params = new URLSearchParams({ properties, limit: "100" });
    if (after) params.set("after", after);

    const data = await apiFetch<HubSpotListResponse<HubSpotObject>>(
      `/crm/v3/objects/contacts?${params.toString()}`
    );

    for (const obj of data.results) {
      const p = obj.properties;
      contacts.push({
        id: obj.id,
        email: p["email"] ?? null,
        firstName: p["firstname"] ?? null,
        lastName: p["lastname"] ?? null,
        company: p["company"] ?? null,
        jobTitle: p["jobtitle"] ?? null,
        phone: p["phone"] ?? null,
        lifecycleStage: p["lifecyclestage"] ?? null,
        ownerId: p["hubspot_owner_id"] ?? null,
        createdAt: p["createdate"] ?? new Date().toISOString(),
        lastModified: p["lastmodifieddate"] ?? new Date().toISOString(),
      });
    }

    after = data.paging?.next?.after;
    if (after) await delay();
  } while (after);

  return contacts;
}

/** Fetch all CRM owners (typically fewer than 200 records, no pagination needed) */
export async function fetchOwners(): Promise<RawOwner[]> {
  const data = await apiFetch<{ results: HubSpotOwnerRaw[] }>(
    "/crm/v3/owners?limit=100"
  );
  return data.results.map((o) => ({
    id: o.id,
    email: o.email,
    firstName: o.firstName ?? null,
    lastName: o.lastName ?? null,
    teamName: o.teams?.[0]?.name ?? null,
  }));
}

/** Fetch deal pipeline definitions including stage metadata */
export async function fetchPipelines(): Promise<RawPipeline[]> {
  const data = await apiFetch<{ results: HubSpotPipelineRaw[] }>(
    "/crm/v3/pipelines/deals"
  );
  return data.results.map((pipeline) => ({
    id: pipeline.id,
    label: pipeline.label,
    stages: pipeline.stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      displayOrder: stage.displayOrder,
      probability: parseFloat(stage.metadata?.probability ?? "0"),
    })),
  }));
}

type EngagementType = "meetings" | "calls" | "emails" | "notes" | "tasks";

/**
 * Fetch engagements of a given type.
 * If `since` (ISO date string) is provided, uses the Search API to filter.
 */
export async function fetchEngagements(
  objectType: EngagementType,
  since?: string
): Promise<RawEngagement[]> {
  const engagements: RawEngagement[] = [];
  // Singularize type label: "meetings" -> "meeting"
  const typeLabel = objectType.endsWith("s")
    ? objectType.slice(0, -1)
    : objectType;

  if (since) {
    let after: string | undefined;
    do {
      const body: Record<string, unknown> = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "hs_timestamp",
                operator: "GTE",
                value: new Date(since).getTime().toString(),
              },
            ],
          },
        ],
        properties: ["hs_timestamp", "hubspot_owner_id"],
        limit: 100,
      };
      if (after) body["after"] = after;

      const data = await apiFetch<HubSpotListResponse<HubSpotObject>>(
        `/crm/v3/objects/${objectType}/search`,
        { method: "POST", body: JSON.stringify(body) }
      );

      for (const obj of data.results) {
        const p = obj.properties;
        engagements.push({
          id: obj.id,
          type: typeLabel,
          ownerId: p["hubspot_owner_id"] ?? null,
          companyId: null,
          contactId: null,
          dealId: null,
          occurredAt: p["hs_timestamp"] ?? new Date().toISOString(),
        });
      }

      after = data.paging?.next?.after;
      if (after) await delay();
    } while (after);
  } else {
    let after: string | undefined;
    do {
      const params = new URLSearchParams({
        properties: "hs_timestamp,hubspot_owner_id",
        limit: "100",
      });
      if (after) params.set("after", after);

      const data = await apiFetch<HubSpotListResponse<HubSpotObject>>(
        `/crm/v3/objects/${objectType}?${params.toString()}`
      );

      for (const obj of data.results) {
        const p = obj.properties;
        engagements.push({
          id: obj.id,
          type: typeLabel,
          ownerId: p["hubspot_owner_id"] ?? null,
          companyId: null,
          contactId: null,
          dealId: null,
          occurredAt: p["hs_timestamp"] ?? new Date().toISOString(),
        });
      }

      after = data.paging?.next?.after;
      if (after) await delay();
    } while (after);
  }

  return engagements;
}
