import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { notify } from "../notification/notify.js";

/**
 * Tell the campaign's team it stopped without anyone pressing a button — a scheduled send
 * that failed, a fan-out that fell over, or an account-level pause. A failure the sender sees
 * in the response to their own click is not reported here.
 */
export async function notifyCampaignStopped(
  campaignId: string,
  event: "campaign.failed" | "campaign.paused",
  reason: string,
): Promise<void> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, teamId: true, team: { select: { orgId: true } } },
    });
    if (!campaign) return;
    await notify({
      event,
      orgId: campaign.team.orgId,
      audience: { kind: "team", teamId: campaign.teamId },
      data: { campaignId: campaign.id, campaignName: campaign.name, reason },
    });
  } catch (error) {
    log.error({ err: error, campaignId, event }, "Could not notify about a stopped campaign");
  }
}
