import { callMetaApi } from "../../whatsapp/wa_axios.js";
import crypto from "crypto";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { Role } from "../../../../generated/prisma/client.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";

/** Meta nests the useful text under `response.data.error.message`; fall back to the Error. */
function metaConversionErrorMessage(error: unknown): string {
  const nested = (
    error as { response?: { data?: { error?: { message?: string } } } } | null | undefined
  )?.response?.data?.error?.message;
  if (nested) return nested;
  return error instanceof Error ? error.message : "Unknown error";
}

function hashData(data: string): string {
  if (!data) return "";
  // Meta requires data to be hashed using SHA256 in lowercase
  return crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");
}

/** The contact fields Meta matches on, plus the org that owns the settings. */
export interface ConversionContact {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  orgId: string;
}

/**
 * Sends the win event for a contact whose **lifecycle** says it was won.
 *
 * The lifecycle-era entry point, still used by the contact write paths. The
 * pipeline calls {@link sendWonConversionEvent} directly, because there the board
 * has already decided — a lead sitting on a stage whose status is `WON` is the
 * same fact this lookup is trying to establish.
 */
export async function triggerConversionsApiForContact(
  contact: ConversionContact,
  lifecycleId: string,
) {
  const lifecycle = await prisma.lifecycle.findUnique({
    where: { id: lifecycleId },
    select: { isWon: true },
  });

  if (!lifecycle?.isWon) return;

  return sendWonConversionEvent(contact);
}

/**
 * Reports a win to Meta's Conversions API.
 *
 * The caller has already established that this *is* a win — from a lifecycle, or
 * from a lead landing on a stage whose status is `WON`. Everything past that
 * point is the same either way, which is why the decision lives outside.
 *
 * Silent when the org has the feature off, has no WhatsApp access token, or has
 * no dataset id: all three are ordinary "not set up" states, not failures.
 *
 * `stageName` is the board column that closed the lead, when a board is what
 * decided it. The lifecycle path has no column to name and omits it.
 */
export async function sendWonConversionEvent(contact: ConversionContact, stageName?: string) {
  try {
    const org = await prisma.org.findUnique({
      where: { id: contact.orgId },
      select: { isConversionApiActive: true },
    });

    if (!org?.isConversionApiActive) return;

    const waSettings = await getWaSettings(contact.orgId);
    if (!waSettings?.accessToken) {
      log.warn(
        "No WhatsApp settings or access token found for org %s, cannot send Conversions API event",
        contact.orgId,
      );
      return;
    }

    const datasetId = waSettings.conversionsApiDatasetId;

    if (!datasetId) {
      log.warn("No Meta Dataset ID found, cannot send Conversions API event");
      return;
    }

    const eventName = waSettings.conversionData?.event_name || "Purchase";
    const currency = waSettings.conversionData?.currency || "USD";

    // `lifecycle_stage` is a constant kept only so anything already keyed off it
    // in Meta keeps matching; `pipeline_stage` is the field that says something —
    // which column the lead was actually won on.
    const customData: MetaConversionCustomData = {
      lifecycle_stage: "Won",
      ...(stageName && { pipeline_stage: stageName }),
    };

    if (eventName === "Purchase") {
      customData.currency = currency;
      customData.value = 1; // Purchase events require a value
    }

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "system_generated",
          user_data: {
            ...(contact.phone ? { ph: [hashData(contact.phone)] } : {}),
            ...(contact.email ? { em: [hashData(contact.email)] } : {}),
          },
          custom_data: customData,
        },
      ],
    };

    const res = await callMetaApi(`/${datasetId}/events`, "POST", waSettings.accessToken, payload);
    if (res.status < 200 || res.status >= 300) {
      throw new Error(
        `Meta Conversions API rejected the event with status ${res.status}: ${JSON.stringify(res.data)}`,
      );
    }
    log.info(`Meta Conversions API event sent successfully`);
    return res.data;
  } catch (error) {
    log.error({ err: error }, "Failed to send Meta Conversions API event");

    try {
      const admins = await prisma.orgMember.findMany({
        where: {
          orgId: contact.orgId,
          role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
        },
        select: { userId: true },
      });

      for (const admin of admins) {
        await notificationQueue.add("notification", {
          systemNotificationData: {
            userId: admin.userId,
            orgId: contact.orgId,
            source: "system",
            subSource: "capi-error",
            data: {
              contactId: contact.id,
              contactName: contact.name,
              error: metaConversionErrorMessage(error),
            },
          },
        });
      }
    } catch (notifError) {
      log.error(notifError, "Failed to send CAPI error notification");
    }

    return null;
  }
}
