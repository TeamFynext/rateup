/**
 * Campaign rows → wire shapes. Allowlisted field by field, like loyalty/presenters.ts, so a
 * new column on Campaign (or the template's whole Meta payload, or the access token on a
 * WhatsApp settings row) never becomes part of the public contract by accident.
 */

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

function templateName(data: unknown): string | null {
  const name = (data as { name?: unknown } | null)?.name;
  return typeof name === "string" ? name : null;
}

interface CampaignRow {
  id: string;
  name: string;
  type: string;
  status: string;
  teamId: string;
  createdAt: Date;
  startedAt: Date | null;
  campaignSentAt: Date | null;
  pauseReason: string | null;
  errorMessage: string | null;
  waTemplate: { id: string; data: unknown } | null;
  CampaignStats: {
    totalSend: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    totalCompleted: number;
  } | null;
}

export function presentCampaign(row: CampaignRow) {
  const s = row.CampaignStats;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    teamId: row.teamId,
    template: row.waTemplate
      ? { id: row.waTemplate.id, name: templateName(row.waTemplate.data) }
      : null,
    scheduledAt: iso(row.campaignSentAt),
    startedAt: iso(row.startedAt),
    createdAt: row.createdAt.toISOString(),
    pauseReason: row.pauseReason ?? null,
    errorMessage: row.errorMessage ?? null,
    stats: {
      sent: s?.totalSend ?? 0,
      delivered: s?.totalDelivered ?? 0,
      read: s?.totalRead ?? 0,
      failed: s?.totalFailed ?? 0,
      completed: s?.totalCompleted ?? 0,
    },
  };
}

interface CampaignSendRow {
  id: string;
  attemptNo: number;
  trigger: string;
  status: string;
  targetStatuses: string[];
  scheduledFor: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  totalTargeted: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalCompleted: number;
}

export function presentCampaignSend(row: CampaignSendRow) {
  return {
    id: row.id,
    attemptNo: row.attemptNo,
    trigger: row.trigger,
    status: row.status,
    targetStatuses: row.targetStatuses,
    scheduledFor: iso(row.scheduledFor),
    startedAt: iso(row.startedAt),
    completedAt: iso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    totals: {
      targeted: row.totalTargeted,
      sent: row.totalSent,
      delivered: row.totalDelivered,
      read: row.totalRead,
      failed: row.totalFailed,
      completed: row.totalCompleted,
    },
  };
}

export function presentCampaignDetail(
  row: CampaignRow & {
    CampaignDripStage: Array<{
      id: string;
      waTemplateId: string | null;
      delay: number;
      delayUnit: string;
      sendAtTime: string | null;
    }>;
  },
  extra: { contactGroupIds: string[]; recipients: number; lastSend: CampaignSendRow | null },
) {
  return {
    ...presentCampaign(row),
    contactGroupIds: extra.contactGroupIds,
    recipients: extra.recipients,
    dripStages: row.CampaignDripStage.map((stage) => ({
      id: stage.id,
      templateId: stage.waTemplateId ?? null,
      delay: stage.delay,
      delayUnit: stage.delayUnit,
      sendAtTime: stage.sendAtTime ?? null,
    })),
    lastSend: extra.lastSend ? presentCampaignSend(extra.lastSend) : null,
  };
}
