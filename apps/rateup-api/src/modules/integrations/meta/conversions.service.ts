import { callMetaApi } from "../../whatsapp/wa_axios.js";
import crypto from "crypto";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import { notificationQueue } from "../../../utils/redisConnection.js";

function hashData(data: string): string {
  if (!data) return "";
  // Meta requires data to be hashed using SHA256 in lowercase
  return crypto
    .createHash("sha256")
    .update(data.trim().toLowerCase())
    .digest("hex");
}

export async function triggerConversionsApiForContact(
  contact: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    source?: string;
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

    const eventName =
      (waSettings.conversionData as any)?.event_name || "Purchase";
    const currency = (waSettings.conversionData as any)?.currency || "USD";

    const customData: any = {
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

    const res = await callMetaApi(
      `/${datasetId}/events`,
      "POST",
      waSettings.accessToken,
      payload,
    );
    log.info(`Meta Conversions API event sent successfully`);
    return res.data;
  } catch (error: any) {
    log.error(error, "Failed to send Meta Conversions API event");

    try {
      const admins = await prisma.orgMember.findMany({
        where: {
          orgId: contact.orgId,
          role: { in: ["ADMIN" as any, "SUPER_ADMIN" as any] },
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
              error:
                error?.response?.data?.error?.message ||
                error?.message ||
                "Unknown error",
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
