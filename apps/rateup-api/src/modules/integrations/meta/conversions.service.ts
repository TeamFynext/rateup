import { callMetaApi } from "../../whatsapp/wa_axios.js";
import crypto from "crypto";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { Role } from "../../../../generated/prisma/client.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import { notificationQueue } from "../../../utils/redisConnection.js";

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

export async function triggerConversionsApiForContact(
  contact: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    source?: string | null;
    orgId: string;
  },
  lifecycleId: string,
) {
  try {
    const org = await prisma.org.findUnique({
      where: { id: contact.orgId },
      select: { isConversionApiActive: true },
    });

    if (!org?.isConversionApiActive) return;

    const lifecycle = await prisma.lifecycle.findUnique({
      where: { id: lifecycleId },
      select: { name: true, isWon: true },
    });

    if (!lifecycle?.isWon) return;

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

    const customData: MetaConversionCustomData = {
      lifecycle_stage: "Won",
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
