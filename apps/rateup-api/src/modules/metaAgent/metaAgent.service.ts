import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { aes_decrypt } from "../../../utils/encryption/encryption.utils.js";
import { callMetaAgentApi } from "./metaAgent.client.js";
import {
  AgentEventBody,
  AgentSettingsBody,
  AgentTestBody,
  BusinessInfoBody,
  ConnectorBody,
  ConnectorLogsQuery,
  ConnectorToolBody,
  EvalRunBody,
  FaqBody,
  KNOWLEDGE_FILE_EXTENSIONS,
  KNOWLEDGE_FILE_MAX_BYTES,
  SkillBody,
  ThreadControlBody,
  UiSkillBody,
  UiSkillUpdateBody,
  UpsertApiKeyBody,
  UpsertCertificateBody,
  UpsertOAuthBody,
  WebsiteBody,
} from "./metaAgent.schema.js";

// ---------------------------------------------------------------------------
// Everything the UI reads comes from our own database. Meta's API is only
// called from the mutating functions below (onboard, save, sync, etc.), each
// of which is only ever invoked from an explicit user action (button click) -
// never on page load - to avoid hammering Meta's rate limits.
// ---------------------------------------------------------------------------

/** Raised for input we reject before it ever reaches Meta. */
export class MetaAgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaAgentValidationError";
  }
}

async function getEntityContext(orgId: string, whatsappSettingsId: string) {
  const settings = await prisma.whatsappSettings.findFirstOrThrow({
    where: { id: whatsappSettingsId, orgId },
    select: { phoneId: true, accessToken: true, accessToken_iv: true },
  });
  if (!settings.phoneId) {
    throw new MetaAgentValidationError("This WhatsApp channel has no phone number id configured");
  }
  const accessToken = settings.accessToken_iv
    ? aes_decrypt(
        settings.accessToken,
        Buffer.from(process.env.wa_access_token_encryption_key!, "hex"),
        settings.accessToken_iv,
      )
    : settings.accessToken;
  return { entityId: settings.phoneId, accessToken };
}

export async function getAgentRecord(orgId: string, whatsappSettingsId: string) {
  return prisma.metaBusinessAgent.findFirst({ where: { orgId, whatsappSettingsId } });
}

export async function getOrCreateAgentRecord(orgId: string, whatsappSettingsId: string) {
  const existing = await prisma.metaBusinessAgent.findFirst({
    where: { orgId, whatsappSettingsId },
  });
  if (existing) return existing;
  return prisma.metaBusinessAgent.create({ data: { orgId, whatsappSettingsId } });
}

async function requireAgentRecord(orgId: string, whatsappSettingsId: string) {
  return prisma.metaBusinessAgent.findFirstOrThrow({ where: { orgId, whatsappSettingsId } });
}

/** `agent_id` is the settings scope; omitted before onboarding assigns one. */
function agentScope(agentId: string | null) {
  return agentId ? { agent_id: agentId } : {};
}

// ---- onboard ----
export async function checkAgentEligibility(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ is_eligible: boolean }>(
    `/${entityId}/agent_eligibility`,
    "GET",
    accessToken,
  );
  return prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: { isEligible: data.is_eligible, eligibilityCheckedAt: new Date() },
  });
}

export async function onboardAgent(orgId: string, whatsappSettingsId: string, channel: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ agent_id: string }>(
    `/${entityId}/agent_onboarding`,
    "POST",
    accessToken,
    undefined,
    { channel },
  );
  return prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: { agentId: data.agent_id, channel, status: "ONBOARDED" },
  });
}

/**
 * Removes the agent at Meta and drops every local mirror row with it. The
 * MetaBusinessAgent row is kept so eligibility history and the channel choice
 * survive a re-onboard, but everything Meta was holding is gone.
 */
export async function deleteAgent(orgId: string, whatsappSettingsId: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ deleted_agent_id?: string }>(
    `/${entityId}/delete_agent`,
    "DELETE",
    accessToken,
  );
  await prisma.$transaction([
    prisma.metaAgentAllowlistEntry.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentFaq.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentFile.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentWebsite.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentSkill.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentUiSkill.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentConnector.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaBusinessAgent.update({
      where: { id: agent.id },
      data: {
        agentId: null,
        status: "NOT_ONBOARDED",
        rolloutEnabled: null,
        handoffEnabled: null,
        handoffMessage: null,
        followupEnabled: null,
        followupIntervalSeconds: null,
        followupMessage: null,
        aiAudience: null,
        neverSayPhrases: [],
        settingsSyncedAt: null,
        businessInfo: Prisma.DbNull,
        businessInfoSyncedAt: null,
      },
    }),
  ]);
  return { deletedAgentId: data?.deleted_agent_id ?? null };
}

// ---- allowlist ----
export async function listAllowlist(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return prisma.metaAgentAllowlistEntry.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function addAllowlistEntry(
  orgId: string,
  whatsappSettingsId: string,
  consumerPhoneNumber: string,
) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ id: string; consumer_phone_number: string }>(
    `/${entityId}/agent_config/allowlist`,
    "POST",
    accessToken,
    { consumer_phone_number: consumerPhoneNumber },
  );
  return prisma.metaAgentAllowlistEntry.create({
    data: { agentId: agent.id, metaId: data.id, consumerPhoneNumber: data.consumer_phone_number },
  });
}

export async function removeAllowlistEntry(orgId: string, whatsappSettingsId: string, id: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const entry = await prisma.metaAgentAllowlistEntry.findFirstOrThrow({
    where: { id, agentId: agent.id },
  });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (entry.metaId) {
    await callMetaAgentApi(
      `/${entityId}/agent_config/allowlist/${entry.metaId}`,
      "DELETE",
      accessToken,
    );
  }
  await prisma.metaAgentAllowlistEntry.delete({ where: { id } });
}

export async function syncAllowlist(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ id: string; consumer_phone_number: string }[]>(
    `/${entityId}/agent_config/allowlist`,
    "GET",
    accessToken,
  );
  await prisma.$transaction([
    prisma.metaAgentAllowlistEntry.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentAllowlistEntry.createMany({
      data: (data ?? []).map((entry) => ({
        agentId: agent.id,
        metaId: entry.id,
        consumerPhoneNumber: entry.consumer_phone_number,
      })),
    }),
  ]);
  return listAllowlist(orgId, whatsappSettingsId);
}

// ---- agent settings ----
export async function getAgentSettings(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return {
    rollout: { enabled: agent.rolloutEnabled ?? false },
    handoff: { enabled: agent.handoffEnabled ?? false, message: agent.handoffMessage ?? "" },
    followup: {
      enabled: agent.followupEnabled ?? false,
      followup_interval_in_seconds: agent.followupIntervalSeconds ?? 0,
      message: agent.followupMessage ?? "",
    },
    ai_audience: agent.aiAudience ?? "EVERYONE",
    never_say_phrases: agent.neverSayPhrases,
    settingsSyncedAt: agent.settingsSyncedAt,
  };
}

export async function updateAgentSettings(
  orgId: string,
  whatsappSettingsId: string,
  body: AgentSettingsBody,
) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  await callMetaAgentApi(
    `/${entityId}/agent_config/settings`,
    "PUT",
    accessToken,
    body,
    agentScope(agent.agentId),
  );
  await prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: {
      rolloutEnabled: body.rollout?.enabled,
      handoffEnabled: body.handoff?.enabled,
      handoffMessage: body.handoff?.message,
      followupEnabled: body.followup?.enabled,
      followupIntervalSeconds: body.followup?.followup_interval_in_seconds,
      followupMessage: body.followup?.message,
      aiAudience: body.ai_audience,
      neverSayPhrases: body.never_say_phrases,
      settingsSyncedAt: new Date(),
    },
  });
  return getAgentSettings(orgId, whatsappSettingsId);
}

/** The agent_config/settings payload as Meta's Graph API returns it. */
interface MetaAgentRemoteSettings {
  agent_id?: string;
  channel?: string;
  rollout?: { enabled?: boolean };
  handoff?: { enabled?: boolean; message?: string };
  followup?: { enabled?: boolean; followup_interval_in_seconds?: number; message?: string };
  ai_audience?: string;
  never_say_phrases?: string[];
}

export async function syncAgentSettings(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  // Meta returns the settings either bare or wrapped in a single-element array.
  const data = await callMetaAgentApi<MetaAgentRemoteSettings[] | MetaAgentRemoteSettings>(
    `/${entityId}/agent_config/settings`,
    "GET",
    accessToken,
    undefined,
    agentScope(agent.agentId),
  );
  const remote = Array.isArray(data) ? data[0] : data;
  await prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: {
      // A settings read is the one call that reports the agent id without an
      // onboarding round trip, so adopt it if we do not have one yet.
      agentId: agent.agentId ?? remote?.agent_id ?? null,
      channel: remote?.channel ?? agent.channel,
      rolloutEnabled: remote?.rollout?.enabled,
      handoffEnabled: remote?.handoff?.enabled,
      handoffMessage: remote?.handoff?.message,
      followupEnabled: remote?.followup?.enabled,
      followupIntervalSeconds: remote?.followup?.followup_interval_in_seconds,
      followupMessage: remote?.followup?.message,
      aiAudience: remote?.ai_audience,
      neverSayPhrases: remote?.never_say_phrases ?? [],
      settingsSyncedAt: new Date(),
    },
  });
  return getAgentSettings(orgId, whatsappSettingsId);
}

// ---- knowledge: business info ----
export async function getBusinessInfo(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return {
    ...((agent.businessInfo as object | null) ?? {}),
    businessInfoSyncedAt: agent.businessInfoSyncedAt,
  };
}

export async function updateBusinessInfo(
  orgId: string,
  whatsappSettingsId: string,
  body: BusinessInfoBody,
) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi(
    `/${entityId}/agent_config/business_info`,
    "PUT",
    accessToken,
    body,
  );
  await prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: { businessInfo: data, businessInfoSyncedAt: new Date() },
  });
  return getBusinessInfo(orgId, whatsappSettingsId);
}

export async function deleteBusinessInfo(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  await callMetaAgentApi(`/${entityId}/agent_config/business_info`, "DELETE", accessToken);
  await prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: { businessInfo: Prisma.DbNull, businessInfoSyncedAt: new Date() },
  });
}

export async function syncBusinessInfo(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi(
    `/${entityId}/agent_config/business_info`,
    "GET",
    accessToken,
  );
  await prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: { businessInfo: data, businessInfoSyncedAt: new Date() },
  });
  return getBusinessInfo(orgId, whatsappSettingsId);
}

// ---- knowledge: faqs ----
export async function listFaqs(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return prisma.metaAgentFaq.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFaq(orgId: string, whatsappSettingsId: string, body: FaqBody) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ id: string }>(
    `/${entityId}/agent_config/faq`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentFaq.create({
    data: {
      agentId: agent.id,
      metaId: data.id,
      question: body.question,
      answer: body.answer,
      metadata: body.metadata,
    },
  });
}

export async function updateFaq(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: FaqBody,
) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const faq = await prisma.metaAgentFaq.findFirstOrThrow({ where: { id, agentId: agent.id } });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (faq.metaId) {
    await callMetaAgentApi(`/${entityId}/agent_config/faq/${faq.metaId}`, "PUT", accessToken, body);
  }
  return prisma.metaAgentFaq.update({
    where: { id },
    data: { question: body.question, answer: body.answer, metadata: body.metadata },
  });
}

export async function deleteFaq(orgId: string, whatsappSettingsId: string, id: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const faq = await prisma.metaAgentFaq.findFirstOrThrow({ where: { id, agentId: agent.id } });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (faq.metaId) {
    await callMetaAgentApi(`/${entityId}/agent_config/faq/${faq.metaId}`, "DELETE", accessToken);
  }
  await prisma.metaAgentFaq.delete({ where: { id } });
}

export async function syncFaqs(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<
    { id: string; question: string; answer: string; metadata?: Record<string, string> }[]
  >(`/${entityId}/agent_config/faq`, "GET", accessToken);
  await prisma.$transaction([
    prisma.metaAgentFaq.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentFaq.createMany({
      data: (data ?? []).map((faq) => ({
        agentId: agent.id,
        metaId: faq.id,
        question: faq.question,
        answer: faq.answer,
        metadata: faq.metadata,
      })),
    }),
  ]);
  return listFaqs(orgId, whatsappSettingsId);
}

// ---- knowledge: files ----
export async function listFiles(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return prisma.metaAgentFile.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadFile(
  orgId: string,
  whatsappSettingsId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
) {
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (
    !KNOWLEDGE_FILE_EXTENSIONS.includes(extension as (typeof KNOWLEDGE_FILE_EXTENSIONS)[number])
  ) {
    throw new MetaAgentValidationError(
      `Unsupported file type ${extension || "(none)"}. Allowed: ${KNOWLEDGE_FILE_EXTENSIONS.join(", ")}`,
    );
  }
  if (fileBuffer.byteLength > KNOWLEDGE_FILE_MAX_BYTES) {
    throw new MetaAgentValidationError("Files must be 100MB or smaller");
  }
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const form = new FormData();
  form.append("file_name", fileName);
  form.append("file", new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), fileName);
  const data = await callMetaAgentApi<{ id: string; file_name: string }>(
    `/${entityId}/agent_config/files`,
    "POST",
    accessToken,
    form,
    {},
    { "Content-Type": "multipart/form-data" },
  );
  return prisma.metaAgentFile.create({
    data: { agentId: agent.id, metaId: data.id, fileName: data.file_name },
  });
}

export async function deleteFile(orgId: string, whatsappSettingsId: string, id: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const file = await prisma.metaAgentFile.findFirstOrThrow({ where: { id, agentId: agent.id } });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (file.metaId) {
    await callMetaAgentApi(`/${entityId}/agent_config/files/${file.metaId}`, "DELETE", accessToken);
  }
  await prisma.metaAgentFile.delete({ where: { id } });
}

export async function syncFiles(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ id: string; file_name: string }[]>(
    `/${entityId}/agent_config/files`,
    "GET",
    accessToken,
  );
  await prisma.$transaction([
    prisma.metaAgentFile.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentFile.createMany({
      data: (data ?? []).map((file) => ({
        agentId: agent.id,
        metaId: file.id,
        fileName: file.file_name,
      })),
    }),
  ]);
  return listFiles(orgId, whatsappSettingsId);
}

// ---- knowledge: websites ----
export async function listWebsites(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return prisma.metaAgentWebsite.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });
}

interface MetaRemoteWebsite {
  id: string;
  url: string;
  crawl_status?: string;
  pages_crawled?: number;
  last_crawled_at?: number;
}

export async function createWebsite(orgId: string, whatsappSettingsId: string, body: WebsiteBody) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<MetaRemoteWebsite>(
    `/${entityId}/agent_config/websites`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentWebsite.create({
    data: {
      agentId: agent.id,
      metaId: data.id,
      url: data.url,
      crawlStatus: data.crawl_status,
      pagesCrawled: data.pages_crawled,
    },
  });
}

export async function updateWebsite(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: WebsiteBody,
) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const site = await prisma.metaAgentWebsite.findFirstOrThrow({ where: { id, agentId: agent.id } });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  let remote: MetaRemoteWebsite | undefined;
  if (site.metaId) {
    remote = await callMetaAgentApi<MetaRemoteWebsite>(
      `/${entityId}/agent_config/websites/${site.metaId}`,
      "PUT",
      accessToken,
      body,
    );
  }
  return prisma.metaAgentWebsite.update({
    where: { id },
    data: {
      url: body.url,
      // A new URL restarts the crawl, so the old counters no longer describe it.
      crawlStatus: remote?.crawl_status ?? "pending",
      pagesCrawled: remote?.pages_crawled ?? null,
      lastCrawledAt: remote?.last_crawled_at ? new Date(remote.last_crawled_at * 1000) : null,
    },
  });
}

export async function deleteWebsite(orgId: string, whatsappSettingsId: string, id: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const site = await prisma.metaAgentWebsite.findFirstOrThrow({ where: { id, agentId: agent.id } });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (site.metaId) {
    await callMetaAgentApi(
      `/${entityId}/agent_config/websites/${site.metaId}`,
      "DELETE",
      accessToken,
    );
  }
  await prisma.metaAgentWebsite.delete({ where: { id } });
}

export async function syncWebsites(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<MetaRemoteWebsite[]>(
    `/${entityId}/agent_config/websites`,
    "GET",
    accessToken,
  );
  await prisma.$transaction([
    prisma.metaAgentWebsite.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentWebsite.createMany({
      data: (data ?? []).map((site) => ({
        agentId: agent.id,
        metaId: site.id,
        url: site.url,
        crawlStatus: site.crawl_status,
        pagesCrawled: site.pages_crawled,
        lastCrawledAt: site.last_crawled_at ? new Date(site.last_crawled_at * 1000) : null,
      })),
    }),
  ]);
  return listWebsites(orgId, whatsappSettingsId);
}

// ---- skills ----
export async function listSkills(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return prisma.metaAgentSkill.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSkill(orgId: string, whatsappSettingsId: string, body: SkillBody) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ id: string; channel?: string }>(
    `/${entityId}/agent_config/skills`,
    "POST",
    accessToken,
    body,
    agentScope(agent.agentId),
  );
  return prisma.metaAgentSkill.create({
    data: {
      agentId: agent.id,
      metaId: data.id,
      title: body.title,
      description: body.description,
      skill: body.skill,
      metadata: body.metadata,
      channel: data.channel,
    },
  });
}

export async function updateSkill(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: SkillBody,
) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const skill = await prisma.metaAgentSkill.findFirstOrThrow({ where: { id, agentId: agent.id } });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (skill.metaId) {
    await callMetaAgentApi(
      `/${entityId}/agent_config/skills/${skill.metaId}`,
      "PUT",
      accessToken,
      body,
    );
  }
  return prisma.metaAgentSkill.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      skill: body.skill,
      metadata: body.metadata,
    },
  });
}

export async function deleteSkill(orgId: string, whatsappSettingsId: string, id: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const skill = await prisma.metaAgentSkill.findFirstOrThrow({ where: { id, agentId: agent.id } });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (skill.metaId) {
    await callMetaAgentApi(
      `/${entityId}/agent_config/skills/${skill.metaId}`,
      "DELETE",
      accessToken,
    );
  }
  await prisma.metaAgentSkill.delete({ where: { id } });
}

export async function syncSkills(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<
    {
      id: string;
      title?: string;
      description?: string;
      skill: string;
      channel?: string;
      metadata?: Record<string, string>;
    }[]
  >(`/${entityId}/agent_config/skills`, "GET", accessToken, undefined, agentScope(agent.agentId));
  await prisma.$transaction([
    prisma.metaAgentSkill.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentSkill.createMany({
      data: (data ?? []).map((skill) => ({
        agentId: agent.id,
        metaId: skill.id,
        // Only `skill` is guaranteed on read; the other two are optional at Meta.
        title: skill.title ?? "",
        description: skill.description ?? "",
        skill: skill.skill,
        channel: skill.channel,
        metadata: skill.metadata,
      })),
    }),
  ]);
  return listSkills(orgId, whatsappSettingsId);
}

// ---- ui skills ----
interface MetaRemoteUiSkill {
  id: string;
  title: string;
  component_type: string;
  status: string;
  instruction: string;
  flow_id?: number | string;
}

/** Meta wants `flow_id` as an integer; we hold it as text to keep the digits. */
function uiSkillPayload(body: UiSkillBody) {
  return {
    title: body.title,
    component_type: body.component_type,
    status: body.status,
    instruction: body.instruction,
    ...(body.flow_id ? { flow_id: Number(body.flow_id) } : {}),
  };
}

export async function listUiSkills(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return prisma.metaAgentUiSkill.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createUiSkill(orgId: string, whatsappSettingsId: string, body: UiSkillBody) {
  if (body.flow_id && !Number.isSafeInteger(Number(body.flow_id))) {
    throw new MetaAgentValidationError("That flow id is too large to send to Meta");
  }
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<MetaRemoteUiSkill>(
    `/${entityId}/agent-ui-skills`,
    "POST",
    accessToken,
    uiSkillPayload(body),
  );
  return prisma.metaAgentUiSkill.create({
    data: {
      agentId: agent.id,
      metaId: data.id,
      title: body.title,
      componentType: body.component_type,
      status: body.status,
      instruction: body.instruction,
      flowId: body.flow_id,
    },
  });
}

export async function updateUiSkill(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: UiSkillUpdateBody,
) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const uiSkill = await prisma.metaAgentUiSkill.findFirstOrThrow({
    where: { id, agentId: agent.id },
  });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (uiSkill.metaId) {
    await callMetaAgentApi(
      `/${entityId}/agent-ui-skills/${uiSkill.metaId}`,
      "PUT",
      accessToken,
      body,
    );
  }
  return prisma.metaAgentUiSkill.update({
    where: { id },
    data: { title: body.title, status: body.status, instruction: body.instruction },
  });
}

export async function deleteUiSkill(orgId: string, whatsappSettingsId: string, id: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const uiSkill = await prisma.metaAgentUiSkill.findFirstOrThrow({
    where: { id, agentId: agent.id },
  });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  if (uiSkill.metaId) {
    await callMetaAgentApi(`/${entityId}/agent-ui-skills/${uiSkill.metaId}`, "DELETE", accessToken);
  }
  await prisma.metaAgentUiSkill.delete({ where: { id } });
}

export async function syncUiSkills(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  // This is the one list endpoint Meta paginates; walk it to the end so a sync
  // never silently truncates the mirror to the first page.
  const collected: MetaRemoteUiSkill[] = [];
  let after: string | undefined;
  do {
    const page = await callMetaAgentApi<{
      data?: MetaRemoteUiSkill[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(`/${entityId}/agent-ui-skills`, "GET", accessToken, undefined, {
      limit: 100,
      ...(after ? { after } : {}),
    });
    collected.push(...(page?.data ?? []));
    after = page?.paging?.next ? page.paging.cursors?.after : undefined;
  } while (after);

  await prisma.$transaction([
    prisma.metaAgentUiSkill.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentUiSkill.createMany({
      data: collected.map((uiSkill) => ({
        agentId: agent.id,
        metaId: uiSkill.id,
        title: uiSkill.title,
        componentType: uiSkill.component_type,
        status: uiSkill.status,
        instruction: uiSkill.instruction,
        flowId: uiSkill.flow_id === undefined ? null : String(uiSkill.flow_id),
      })),
    }),
  ]);
  return listUiSkills(orgId, whatsappSettingsId);
}

// ---- connectors ----
interface MetaRemoteConnector {
  id: string;
  name: string;
  description: string;
  base_url: string;
  auth_type: string;
  requires_certificate?: boolean;
  // Documented as an object; older responses sent a bare string.
  connection_status?: { status?: string; error_message?: string } | string;
  user_auth_injection_config?: PrismaJson.PMetaAgentUserAuthInjectionConfig;
  mtls_config?: PrismaJson.PMetaAgentMtlsConfig;
}

/** Flattens Meta's `connection_status` (object or legacy string) for storage. */
function readConnectionStatus(status: MetaRemoteConnector["connection_status"]) {
  if (typeof status === "string") return { connectionStatus: status, connectionError: null };
  return {
    connectionStatus: status?.status ?? "PENDING_OAUTH",
    connectionError: status?.error_message ?? null,
  };
}

function connectorRow(remote: MetaRemoteConnector) {
  return {
    metaId: remote.id,
    name: remote.name,
    description: remote.description,
    baseUrl: remote.base_url,
    authType: remote.auth_type,
    requiresCertificate: remote.requires_certificate ?? false,
    userAuthInjectionConfig: remote.user_auth_injection_config ?? Prisma.DbNull,
    mtlsConfig: remote.mtls_config ?? Prisma.DbNull,
    ...readConnectionStatus(remote.connection_status),
  };
}

export async function listConnectors(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return prisma.metaAgentConnector.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tools: true } } },
  });
}

export async function createConnector(
  orgId: string,
  whatsappSettingsId: string,
  body: ConnectorBody,
) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<MetaRemoteConnector>(
    `/${entityId}/agent_connectors`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentConnector.create({
    data: { agentId: agent.id, ...connectorRow({ ...data, ...body, id: data.id }) },
  });
}

export async function updateConnector(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: ConnectorBody,
) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  let remote: MetaRemoteConnector | undefined;
  if (connector.metaId) {
    remote = await callMetaAgentApi<MetaRemoteConnector>(
      `/${entityId}/agent_connectors/${connector.metaId}`,
      "PUT",
      accessToken,
      body,
    );
  }
  return prisma.metaAgentConnector.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      baseUrl: body.base_url,
      authType: body.auth_type,
      requiresCertificate: body.requires_certificate ?? false,
      userAuthInjectionConfig: body.user_auth_injection_config ?? Prisma.DbNull,
      ...(remote ? readConnectionStatus(remote.connection_status) : {}),
    },
  });
}

export async function deleteConnector(orgId: string, whatsappSettingsId: string, id: string) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  if (connector.metaId) {
    await callMetaAgentApi(
      `/${entityId}/agent_connectors/${connector.metaId}`,
      "DELETE",
      accessToken,
    );
  }
  await prisma.metaAgentConnector.delete({ where: { id } });
}

export async function getConnectorLogs(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  query: ConnectorLogsQuery,
) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  return callMetaAgentApi(
    `/${entityId}/agent_connectors/${connector.metaId}/logs`,
    "GET",
    accessToken,
    undefined,
    query,
  );
}

async function withConnector(orgId: string, whatsappSettingsId: string, id: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const connector = await prisma.metaAgentConnector.findFirstOrThrow({
    where: { id, agentId: agent.id },
  });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return { connector, entityId, accessToken };
}

export async function upsertConnectorApiKey(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: UpsertApiKeyBody,
) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  const data = await callMetaAgentApi<MetaRemoteConnector>(
    `/${entityId}/agent_connectors/${connector.metaId}/upsertApiKey`,
    "POST",
    accessToken,
    body,
  );
  // Credentials themselves are never mirrored - Meta holds them, we only track
  // whether the connection now works.
  return prisma.metaAgentConnector.update({
    where: { id },
    data: readConnectionStatus(data?.connection_status ?? "ACTIVE"),
  });
}

export async function upsertConnectorOAuth(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: UpsertOAuthBody,
) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  const data = await callMetaAgentApi<MetaRemoteConnector>(
    `/${entityId}/agent_connectors/${connector.metaId}/upsertOAuth`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentConnector.update({
    where: { id },
    data: readConnectionStatus(data?.connection_status ?? "ACTIVE"),
  });
}

export async function upsertConnectorCertificate(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: UpsertCertificateBody,
) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  const data = await callMetaAgentApi<MetaRemoteConnector>(
    `/${entityId}/agent_connectors/${connector.metaId}/upsertCertificate`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentConnector.update({
    where: { id },
    data: {
      requiresCertificate: true,
      // Fingerprint/subject/expiry only - the key and certificate stay at Meta.
      mtlsConfig: data?.mtls_config ?? Prisma.DbNull,
      ...(data?.connection_status ? readConnectionStatus(data.connection_status) : {}),
    },
  });
}

export async function syncConnectors(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<MetaRemoteConnector[]>(
    `/${entityId}/agent_connectors`,
    "GET",
    accessToken,
  );
  // Upserted rather than replaced: tools hang off connectors by local id, and a
  // delete-then-recreate would cascade every tool away on a routine sync.
  const remote = data ?? [];
  await prisma.metaAgentConnector.deleteMany({
    where: { agentId: agent.id, metaId: { notIn: remote.map((c) => c.id) } },
  });
  for (const connector of remote) {
    const row = connectorRow(connector);
    const existing = await prisma.metaAgentConnector.findFirst({
      where: { agentId: agent.id, metaId: connector.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.metaAgentConnector.update({ where: { id: existing.id }, data: row });
    } else {
      await prisma.metaAgentConnector.create({ data: { agentId: agent.id, ...row } });
    }
  }
  return listConnectors(orgId, whatsappSettingsId);
}

// ---- connector tools ----
interface MetaRemoteConnectorTool {
  id: string;
  name: string;
  description: string;
  request_definition: PrismaJson.PMetaAgentRequestDefinition;
  user_auth_required?: boolean;
  user_auth_action_config?: PrismaJson.PMetaAgentUserAuthActionConfig;
}

export async function listConnectorTools(
  orgId: string,
  whatsappSettingsId: string,
  connectorId: string,
) {
  // Scoped through withConnector so a tool list cannot be read by naming another
  // org's connector id.
  await withConnector(orgId, whatsappSettingsId, connectorId);
  return prisma.metaAgentConnectorTool.findMany({
    where: { connectorId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createConnectorTool(
  orgId: string,
  whatsappSettingsId: string,
  connectorId: string,
  body: ConnectorToolBody,
) {
  const { connector, entityId, accessToken } = await withConnector(
    orgId,
    whatsappSettingsId,
    connectorId,
  );
  const data = await callMetaAgentApi<MetaRemoteConnectorTool>(
    `/${entityId}/agent_connectors/${connector.metaId}/tools`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentConnectorTool.create({
    data: {
      connectorId,
      metaId: data.id,
      name: body.name,
      description: body.description,
      requestDefinition: body.request_definition,
      userAuthRequired: body.user_auth_required,
      userAuthActionConfig: body.user_auth_action_config ?? Prisma.DbNull,
    },
  });
}

export async function updateConnectorTool(
  orgId: string,
  whatsappSettingsId: string,
  connectorId: string,
  toolId: string,
  body: ConnectorToolBody,
) {
  const { connector, entityId, accessToken } = await withConnector(
    orgId,
    whatsappSettingsId,
    connectorId,
  );
  const tool = await prisma.metaAgentConnectorTool.findFirstOrThrow({
    where: { id: toolId, connectorId },
  });
  if (tool.metaId) {
    await callMetaAgentApi(
      `/${entityId}/agent_connectors/${connector.metaId}/tools/${tool.metaId}`,
      "PUT",
      accessToken,
      body,
    );
  }
  return prisma.metaAgentConnectorTool.update({
    where: { id: toolId },
    data: {
      name: body.name,
      description: body.description,
      requestDefinition: body.request_definition,
      userAuthRequired: body.user_auth_required,
      userAuthActionConfig: body.user_auth_action_config ?? Prisma.DbNull,
    },
  });
}

export async function deleteConnectorTool(
  orgId: string,
  whatsappSettingsId: string,
  connectorId: string,
  toolId: string,
) {
  const { connector, entityId, accessToken } = await withConnector(
    orgId,
    whatsappSettingsId,
    connectorId,
  );
  const tool = await prisma.metaAgentConnectorTool.findFirstOrThrow({
    where: { id: toolId, connectorId },
  });
  if (tool.metaId) {
    await callMetaAgentApi(
      `/${entityId}/agent_connectors/${connector.metaId}/tools/${tool.metaId}`,
      "DELETE",
      accessToken,
    );
  }
  await prisma.metaAgentConnectorTool.delete({ where: { id: toolId } });
}

export async function runConnectorTool(
  orgId: string,
  whatsappSettingsId: string,
  connectorId: string,
  toolId: string,
  input?: string,
) {
  const { connector, entityId, accessToken } = await withConnector(
    orgId,
    whatsappSettingsId,
    connectorId,
  );
  const tool = await prisma.metaAgentConnectorTool.findFirstOrThrow({
    where: { id: toolId, connectorId },
  });
  return callMetaAgentApi<{ output: string; status: string }>(
    `/${entityId}/agent_connectors/${connector.metaId}/tools/${tool.metaId}/run`,
    "POST",
    accessToken,
    { input: input?.trim() ? input : "{}" },
  );
}

export async function syncConnectorTools(
  orgId: string,
  whatsappSettingsId: string,
  connectorId: string,
) {
  const { connector, entityId, accessToken } = await withConnector(
    orgId,
    whatsappSettingsId,
    connectorId,
  );
  const data = await callMetaAgentApi<MetaRemoteConnectorTool[]>(
    `/${entityId}/agent_connectors/${connector.metaId}/tools`,
    "GET",
    accessToken,
  );
  await prisma.$transaction([
    prisma.metaAgentConnectorTool.deleteMany({ where: { connectorId } }),
    prisma.metaAgentConnectorTool.createMany({
      data: (data ?? []).map((tool) => ({
        connectorId,
        metaId: tool.id,
        name: tool.name,
        description: tool.description,
        requestDefinition: tool.request_definition,
        userAuthRequired: tool.user_auth_required ?? false,
        userAuthActionConfig: tool.user_auth_action_config ?? Prisma.DbNull,
      })),
    }),
  ]);
  return listConnectorTools(orgId, whatsappSettingsId, connectorId);
}

// ---- operate: eval (transient, always action-triggered) ----
export async function listEvalCases(orgId: string, whatsappSettingsId: string) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(`/${entityId}/agent-eval/cases`, "GET", accessToken);
}

export async function submitEvalRun(orgId: string, whatsappSettingsId: string, body: EvalRunBody) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  // Meta takes the case ids on the query string and an empty JSON body.
  return callMetaAgentApi(
    `/${entityId}/agent-eval/run`,
    "POST",
    accessToken,
    {},
    {
      eval_case_ids: body.eval_case_ids.join(","),
    },
  );
}

export async function getEvalRunStatus(orgId: string, whatsappSettingsId: string, jobId: string) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(`/${entityId}/agent-eval/run`, "GET", accessToken, undefined, {
    job_id: jobId,
  });
}

export async function getEvalDetails(orgId: string, whatsappSettingsId: string, evalIds: string) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(`/${entityId}/agent-eval/details`, "GET", accessToken, undefined, {
    eval_ids: evalIds,
  });
}

export async function getEvalSummary(
  orgId: string,
  whatsappSettingsId: string,
  summaryIds: string,
) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(`/${entityId}/agent-eval/summary`, "GET", accessToken, undefined, {
    summary_ids: summaryIds,
  });
}

// ---- operate: event ----
export async function submitAgentEvent(
  orgId: string,
  whatsappSettingsId: string,
  body: AgentEventBody,
) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(`/${entityId}/agent_event`, "POST", accessToken, body);
}

export async function getAgentEventStatus(
  orgId: string,
  whatsappSettingsId: string,
  agentEventId: string,
) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(`/${entityId}/agent_event/${agentEventId}`, "GET", accessToken);
}

// ---- operate: test ----
export async function testAgent(orgId: string, whatsappSettingsId: string, body: AgentTestBody) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(`/${entityId}/agent_test`, "POST", accessToken, body);
}

// ---- operate: thread control ----
export async function setThreadControl(
  orgId: string,
  whatsappSettingsId: string,
  body: ThreadControlBody,
) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(
    `/business/whatsapp/phone_numbers/${entityId}/thread_control`,
    "POST",
    accessToken,
    { messaging_product: "whatsapp", action: body.action, to: body.to },
    {},
    // The thread-control endpoint is versioned separately from the agent APIs.
    { "X-API-Version": "1.0.0" },
  );
}
