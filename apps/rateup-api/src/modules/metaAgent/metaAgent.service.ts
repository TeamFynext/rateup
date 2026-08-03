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
  SkillBody,
  ThreadControlBody,
  WebsiteBody,
} from "./metaAgent.schema.js";

// ---------------------------------------------------------------------------
// Everything the UI reads comes from our own database. Meta's API is only
// called from the mutating functions below (onboard, save, sync, etc.), each
// of which is only ever invoked from an explicit user action (button click) -
// never on page load - to avoid hammering Meta's rate limits.
// ---------------------------------------------------------------------------

async function getEntityContext(orgId: string, whatsappSettingsId: string) {
  const settings = await prisma.whatsappSettings.findFirstOrThrow({
    where: { id: whatsappSettingsId, orgId },
    select: { phoneId: true, accessToken: true, accessToken_iv: true },
  });
  if (!settings.phoneId) {
    throw new Error("This WhatsApp channel has no phone number id configured");
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

// ---- onboard ----
export async function checkAgentEligibility(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  console.log("🚀 ~ checkAgentEligibility ~ accessToken:", accessToken);
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
    agent.agentId ? { agent_id: agent.agentId } : {},
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
      settingsSyncedAt: new Date(),
    },
  });
  return getAgentSettings(orgId, whatsappSettingsId);
}

/** The agent_config/settings payload as Meta's Graph API returns it. */
interface MetaAgentRemoteSettings {
  rollout?: { enabled?: boolean };
  handoff?: { enabled?: boolean; message?: string };
  followup?: { enabled?: boolean; followup_interval_in_seconds?: number; message?: string };
  ai_audience?: string;
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
    agent.agentId ? { agent_id: agent.agentId } : {},
  );
  const remote = Array.isArray(data) ? data[0] : data;
  await prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: {
      rolloutEnabled: remote?.rollout?.enabled,
      handoffEnabled: remote?.handoff?.enabled,
      handoffMessage: remote?.handoff?.message,
      followupEnabled: remote?.followup?.enabled,
      followupIntervalSeconds: remote?.followup?.followup_interval_in_seconds,
      followupMessage: remote?.followup?.message,
      aiAudience: remote?.ai_audience,
      settingsSyncedAt: new Date(),
    },
  });
  return getAgentSettings(orgId, whatsappSettingsId);
}

// ---- knowledge: business info ----
export async function getBusinessInfo(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return { ...(agent.businessInfo as object), businessInfoSyncedAt: agent.businessInfoSyncedAt };
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

export async function createWebsite(orgId: string, whatsappSettingsId: string, body: WebsiteBody) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{
    id: string;
    url: string;
    crawl_status?: string;
    pages_crawled?: number;
  }>(`/${entityId}/agent_config/websites`, "POST", accessToken, body);
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
  const data = await callMetaAgentApi<
    {
      id: string;
      url: string;
      crawl_status?: string;
      pages_crawled?: number;
      last_crawled_at?: number;
    }[]
  >(`/${entityId}/agent_config/websites`, "GET", accessToken);
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
  const data = await callMetaAgentApi<{ id: string }>(
    `/${entityId}/agent_config/skills`,
    "POST",
    accessToken,
    body,
    agent.agentId ? { agent_id: agent.agentId } : {},
  );
  return prisma.metaAgentSkill.create({
    data: {
      agentId: agent.id,
      metaId: data.id,
      title: body.title,
      description: body.description,
      skill: body.skill,
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
    data: { title: body.title, description: body.description, skill: body.skill },
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
    { id: string; title: string; description: string; skill: string }[]
  >(
    `/${entityId}/agent_config/skills`,
    "GET",
    accessToken,
    undefined,
    agent.agentId ? { agent_id: agent.agentId } : {},
  );
  await prisma.$transaction([
    prisma.metaAgentSkill.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentSkill.createMany({
      data: (data ?? []).map((skill) => ({
        agentId: agent.id,
        metaId: skill.id,
        title: skill.title,
        description: skill.description,
        skill: skill.skill,
      })),
    }),
  ]);
  return listSkills(orgId, whatsappSettingsId);
}

// ---- connectors ----
export async function listConnectors(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  return prisma.metaAgentConnector.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createConnector(
  orgId: string,
  whatsappSettingsId: string,
  body: ConnectorBody,
) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<{ id: string; connection_status?: string }>(
    `/${entityId}/agent_connectors`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentConnector.create({
    data: {
      agentId: agent.id,
      metaId: data.id,
      name: body.name,
      description: body.description,
      baseUrl: body.base_url,
      authType: body.auth_type,
      requiresCertificate: body.requires_certificate ?? false,
      connectionStatus: data.connection_status ?? "PENDING_OAUTH",
    },
  });
}

export async function deleteConnector(orgId: string, whatsappSettingsId: string, id: string) {
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const connector = await prisma.metaAgentConnector.findFirstOrThrow({
    where: { id, agentId: agent.id },
  });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
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
  const agent = await requireAgentRecord(orgId, whatsappSettingsId);
  const connector = await prisma.metaAgentConnector.findFirstOrThrow({
    where: { id, agentId: agent.id },
  });
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
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
  apiKey: string,
) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  await callMetaAgentApi(
    `/${entityId}/agent_connectors/${connector.metaId}/upsertApiKey`,
    "POST",
    accessToken,
    { api_key: apiKey },
  );
  return prisma.metaAgentConnector.update({
    where: { id },
    data: { connectionStatus: "ACTIVE" },
  });
}

export async function upsertConnectorOAuth(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: { client_id: string; client_secret: string; token_url?: string },
) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  await callMetaAgentApi(
    `/${entityId}/agent_connectors/${connector.metaId}/upsertOAuth`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentConnector.update({
    where: { id },
    data: { connectionStatus: "ACTIVE" },
  });
}

export async function upsertConnectorCertificate(
  orgId: string,
  whatsappSettingsId: string,
  id: string,
  body: { certificate: string; private_key?: string },
) {
  const { connector, entityId, accessToken } = await withConnector(orgId, whatsappSettingsId, id);
  await callMetaAgentApi(
    `/${entityId}/agent_connectors/${connector.metaId}/upsertCertificate`,
    "POST",
    accessToken,
    body,
  );
  return prisma.metaAgentConnector.update({ where: { id }, data: {} });
}

export async function syncConnectors(orgId: string, whatsappSettingsId: string) {
  const agent = await getOrCreateAgentRecord(orgId, whatsappSettingsId);
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const data = await callMetaAgentApi<
    {
      id: string;
      name: string;
      description: string;
      base_url: string;
      auth_type: string;
      requires_certificate?: boolean;
      connection_status?: string;
    }[]
  >(`/${entityId}/agent_connectors`, "GET", accessToken);
  await prisma.$transaction([
    prisma.metaAgentConnector.deleteMany({ where: { agentId: agent.id } }),
    prisma.metaAgentConnector.createMany({
      data: (data ?? []).map((c) => ({
        agentId: agent.id,
        metaId: c.id,
        name: c.name,
        description: c.description,
        baseUrl: c.base_url,
        authType: c.auth_type,
        requiresCertificate: c.requires_certificate ?? false,
        connectionStatus: c.connection_status ?? "PENDING_OAUTH",
      })),
    }),
  ]);
  return listConnectors(orgId, whatsappSettingsId);
}

// ---- connector tools ----
export async function listConnectorTools(
  orgId: string,
  whatsappSettingsId: string,
  connectorId: string,
) {
  await requireAgentRecord(orgId, whatsappSettingsId);
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
  const data = await callMetaAgentApi<{ id: string }>(
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
      userAuthRequired: body.user_auth_required ?? false,
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
  input?: Record<string, unknown>,
) {
  const { connector, entityId, accessToken } = await withConnector(
    orgId,
    whatsappSettingsId,
    connectorId,
  );
  const tool = await prisma.metaAgentConnectorTool.findFirstOrThrow({
    where: { id: toolId, connectorId },
  });
  return callMetaAgentApi(
    `/${entityId}/agent_connectors/${connector.metaId}/tools/${tool.metaId}/run`,
    "POST",
    accessToken,
    { input: input ?? {} },
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
  const data = await callMetaAgentApi<
    {
      id: string;
      name: string;
      description: string;
      request_definition: Record<string, unknown>;
      user_auth_required?: boolean;
    }[]
  >(`/${entityId}/agent_connectors/${connector.metaId}/tools`, "GET", accessToken);
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
  return callMetaAgentApi(`/${entityId}/agent-eval/run`, "POST", accessToken, undefined, {
    eval_case_ids: body.eval_case_ids.join(","),
  });
}

export async function getEvalRunStatus(orgId: string, whatsappSettingsId: string, jobId: string) {
  const { entityId, accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  return callMetaAgentApi(`/${entityId}/agent-eval/run`, "GET", accessToken, undefined, {
    job_id: jobId,
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
  const { accessToken } = await getEntityContext(orgId, whatsappSettingsId);
  const settings = await prisma.whatsappSettings.findFirstOrThrow({
    where: { id: whatsappSettingsId, orgId },
    select: { phoneId: true },
  });
  return callMetaAgentApi(
    `/business/whatsapp/phone_numbers/${settings.phoneId}/thread_control`,
    "POST",
    accessToken,
    { messaging_product: "whatsapp", action: body.action, to: body.to },
  );
}
