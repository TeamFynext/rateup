import axios from "axios";
import { ZapierTriggers } from "../../../types/enum.js";
import { getIntegrationByName } from "../integration.service.js";
import prisma from "../../../../../utils/prisma.js";
import { log } from "../../../logger.js";

/**
 * One webhook subscription inside `Integration.credential`. That column is
 * `Json`, so Prisma types it as an opaque value — this is the shape the Zapier
 * REST hooks actually store, asserted once here rather than at every use.
 */
interface TriggerSubscription {
  subscribed_field: string;
  hookUrl: string;
  active: boolean;
  updatedAt?: string;
}

function readTriggerSubscriptions(credential: unknown): TriggerSubscription[] | null {
  const subs = (credential as { triggerSubscriptions?: unknown } | null)?.triggerSubscriptions;
  return Array.isArray(subs) ? (subs as TriggerSubscription[]) : null;
}

export async function notifyZapier(triggerKey: ZapierTriggers, data: any, orgId: string) {
  try {
    const integration = await getIntegrationByName("zapier", orgId);
    const triggerSubscriptions = readTriggerSubscriptions(integration?.credential);
    if (!integration || !triggerSubscriptions) return;
    const payload = await getFormattedPayloadForTrigger(triggerKey, data);
    let update = false;
    const triggers = triggerSubscriptions.filter(
      (t) => t.subscribed_field === triggerKey && t.active,
    );
    for (const [index, trigger] of triggers.entries()) {
      const hookUrl = trigger.hookUrl;
      let attempt = 0;
      while (attempt <= 3) {
        try {
          log.info("payload to be sent to zapier => %o", payload);
          const res = await axios.post(hookUrl, payload);
          if (res.status === 200) break;
        } catch (e) {
          log.error(`error notifiying zapier => %o`, e);
          if ((e as any).response?.status === 410) {
            update = true;
            triggerSubscriptions[index] = {
              ...trigger,
              active: false,
              updatedAt: new Date().toISOString(),
            };
            break;
          }
        } finally {
          attempt++;
        }
      }
      if (attempt > 3) {
        update = true;
        triggerSubscriptions[index] = {
          ...trigger,
          active: false,
          updatedAt: new Date().toISOString(),
        };
      }
      if (update) {
        await prisma.integration.update({
          where: { orgid_integration_name_unique: { orgId, name: "zapier" } },
          data: {
            credential: {
              ...(integration.credential as object),
              triggerSubscriptions,
            },
          },
        });
      }
    }
  } catch (e) {
    log.error(`error handling zapier trigger => %o`, e);
  }
}

export async function getFormattedPayloadForTrigger(triggerKey: ZapierTriggers, data: any) {
  switch (triggerKey) {
    case ZapierTriggers.CONTACT_CREATE: {
      const contact = data[ZapierTriggers.CONTACT_CREATE];
      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        source: contact.source,
        igsId: contact.igsId,
      };
    }
    case ZapierTriggers.CONTACT_ASSIGN: {
      const { contact, teamId, assignedUserIds } = data[ZapierTriggers.CONTACT_ASSIGN];
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { name: true, code: true },
      });
      const users = await prisma.user.findMany({
        where: { id: { in: assignedUserIds } },
        select: { name: true, email: true },
      });
      return {
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        igsId: contact.igsId,
        assignees: users.map((u) => ({
          name: u.name,
          email: u.email,
          teamName: team?.name,
          teamCode: team?.code,
        })),
      };
    }
    case ZapierTriggers.NEW_MESSAGE: {
      const message = data[ZapierTriggers.NEW_MESSAGE];
      return {
        from: message.from,
        messageBody: message.messageBody,
        platform: message.sourcePlatform,
        source: message.sourceIdentifier,
        messageId: message.messageId,
      };
    }
    case ZapierTriggers.CONVERSATION_CLOSED: {
      const contact = data[ZapierTriggers.CONVERSATION_CLOSED];
      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        source: contact.source,
        igsId: contact.igsId,
      };
    }
    case ZapierTriggers.CONTACT_UPDATED: {
      const contact = data[ZapierTriggers.CONTACT_UPDATED];
      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        source: contact.source,
        igsId: contact.igsId,
      };
    }
    case ZapierTriggers.CONTACT_LIFECYCLE_UPDATED: {
      const tmp = data[ZapierTriggers.CONTACT_LIFECYCLE_UPDATED];
      return {
        contactId: tmp.contactId,
        lifecycleId: tmp.lifecycleId,
        lifecycleName: tmp.lifecycleName,
      };
    }
    case ZapierTriggers.CONTACT_ADDED_TO_GROUP: {
      const tmp = data[ZapierTriggers.CONTACT_ADDED_TO_GROUP];
      return {
        contactId: tmp.contactId,
        contactGroupId: tmp.contactGroupId,
      };
    }
    case ZapierTriggers.RESPONSE_SUBMITTED: {
      const tmp = data[ZapierTriggers.RESPONSE_SUBMITTED];
      return {
        responses: tmp.responses,
        createdAt: tmp.createdAt,
        language: tmp.language,
        tag: tmp.tag,
        platform: tmp.platform,
        deviceData: tmp.deviceData,
        contactId: tmp.contactId,
        location: tmp.location,
        survey: tmp.surveyTeamMap.survey.name,
        team: tmp.surveyTeamMap.team.name,
      };
    }
    case ZapierTriggers.CONTACT_DELETED: {
      const contact = data[ZapierTriggers.CONTACT_DELETED];
      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        source: contact.source,
        igsId: contact.igsId,
      };
    }
    case ZapierTriggers.NEW_TEAM_MEMBER_CREATED: {
      const invite = data[ZapierTriggers.NEW_TEAM_MEMBER_CREATED];
      return {
        isExistingUser: invite.isUser,
        name: invite.name,
        email: invite.email,
        teamCode: invite.team.code,
        teamName: invite.team.name,
      };
    }
  }
}
