import prisma from "../../../../utils/prisma.js";
import { ZapierTriggers } from "./zapier.types.js";

/** The contact fields every contact-shaped trigger sends. */
interface ZapierContactInput {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  igsId?: string | null;
}

/** A survey response row with the survey and team names the trigger sends. */
export interface ZapierResponseInput {
  responses: unknown;
  createdAt: Date | string;
  language: string;
  tag: string | null;
  platform: string;
  deviceData: unknown;
  contactId: string | null;
  location: unknown;
  surveyTeamMap: { survey: { title: string }; team: { name: string } };
}

/**
 * What each trigger is built from. These are also the shapes the old
 * `zapierTriggerQueue` carried, so a job queued before the move still formats.
 */
export interface ZapierTriggerInput {
  [ZapierTriggers.CONTACT_CREATE]: ZapierContactInput;
  [ZapierTriggers.CONTACT_UPDATED]: ZapierContactInput;
  [ZapierTriggers.CONTACT_DELETED]: ZapierContactInput;
  [ZapierTriggers.CONVERSATION_CLOSED]: ZapierContactInput;
  [ZapierTriggers.CONTACT_ASSIGN]: {
    contact: ZapierContactInput;
    newAssignees: { userId: string; teamId: string }[];
  };
  [ZapierTriggers.NEW_MESSAGE]: {
    from: string;
    messageBody: unknown;
    sourcePlatform: string;
    sourceIdentifier?: string | null;
    messageId?: string;
  };
  [ZapierTriggers.CONTACT_LIFECYCLE_UPDATED]: {
    contactId: string;
    lifecycleId: string;
    lifecycleName: string;
  };
  [ZapierTriggers.CONTACT_STAGE_UPDATED]: {
    contactId: string;
    leadId: string;
    pipelineId: string;
    pipelineName: string;
    stageId: string;
    stageName: string;
    stageStatus: string;
  };
  [ZapierTriggers.CONTACT_ADDED_TO_GROUP]: { contactId: string; contactGroupId: string };
  [ZapierTriggers.RESPONSE_SUBMITTED]: ZapierResponseInput;
  [ZapierTriggers.NEW_TEAM_MEMBER_CREATED]: {
    isExistingUser: boolean;
    name: string;
    email: string;
    team: { name: string; code: string } | null;
  };
}

const contactPayload = (contact: ZapierContactInput) => ({
  id: contact.id,
  name: contact.name,
  phone: contact.phone,
  email: contact.email,
  source: contact.source,
  igsId: contact.igsId,
});

/**
 * The body a trigger posts to its hooks. Moved from the absorbed
 * message-dispatcher's formatter with its shapes unchanged, apart from two
 * fields that never arrived: a response's `survey` read a `name` the Survey
 * model does not have (it is `title`), and the assignee lookup read ids the
 * caller never sent, so that trigger failed on every assignment.
 */
export async function buildZapierPayload<T extends ZapierTriggers>(
  trigger: T,
  input: ZapierTriggerInput[T],
): Promise<unknown> {
  switch (trigger) {
    case ZapierTriggers.CONTACT_CREATE:
    case ZapierTriggers.CONTACT_UPDATED:
    case ZapierTriggers.CONTACT_DELETED:
    case ZapierTriggers.CONVERSATION_CLOSED:
      return contactPayload(input as ZapierContactInput);

    case ZapierTriggers.CONTACT_ASSIGN: {
      const { contact, newAssignees } = input as ZapierTriggerInput[ZapierTriggers.CONTACT_ASSIGN];
      const [users, teams] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: newAssignees.map((a) => a.userId) } },
          select: { id: true, name: true, email: true },
        }),
        prisma.team.findMany({
          where: { id: { in: newAssignees.map((a) => a.teamId) } },
          select: { id: true, name: true, code: true },
        }),
      ]);
      return {
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        igsId: contact.igsId,
        assignees: newAssignees.map((assignee) => {
          const user = users.find((u) => u.id === assignee.userId);
          const team = teams.find((t) => t.id === assignee.teamId);
          return {
            name: user?.name,
            email: user?.email,
            teamName: team?.name,
            teamCode: team?.code,
          };
        }),
      };
    }

    case ZapierTriggers.NEW_MESSAGE: {
      const message = input as ZapierTriggerInput[ZapierTriggers.NEW_MESSAGE];
      return {
        from: message.from,
        messageBody: message.messageBody,
        platform: message.sourcePlatform,
        source: message.sourceIdentifier,
        messageId: message.messageId,
      };
    }

    case ZapierTriggers.CONTACT_LIFECYCLE_UPDATED: {
      const { contactId, lifecycleId, lifecycleName } =
        input as ZapierTriggerInput[ZapierTriggers.CONTACT_LIFECYCLE_UPDATED];
      return { contactId, lifecycleId, lifecycleName };
    }

    case ZapierTriggers.CONTACT_STAGE_UPDATED: {
      const stage = input as ZapierTriggerInput[ZapierTriggers.CONTACT_STAGE_UPDATED];
      return {
        contactId: stage.contactId,
        leadId: stage.leadId,
        pipelineId: stage.pipelineId,
        pipelineName: stage.pipelineName,
        stageId: stage.stageId,
        stageName: stage.stageName,
        stageStatus: stage.stageStatus,
      };
    }

    case ZapierTriggers.CONTACT_ADDED_TO_GROUP: {
      const { contactId, contactGroupId } =
        input as ZapierTriggerInput[ZapierTriggers.CONTACT_ADDED_TO_GROUP];
      return { contactId, contactGroupId };
    }

    case ZapierTriggers.RESPONSE_SUBMITTED: {
      const response = input as ZapierResponseInput;
      return {
        responses: response.responses,
        createdAt: response.createdAt,
        language: response.language,
        tag: response.tag,
        platform: response.platform,
        deviceData: response.deviceData,
        contactId: response.contactId,
        location: response.location,
        survey: response.surveyTeamMap.survey.title,
        team: response.surveyTeamMap.team.name,
      };
    }

    case ZapierTriggers.NEW_TEAM_MEMBER_CREATED: {
      const member = input as ZapierTriggerInput[ZapierTriggers.NEW_TEAM_MEMBER_CREATED];
      return {
        isExistingUser: member.isExistingUser,
        name: member.name,
        email: member.email,
        teamCode: member.team?.code,
        teamName: member.team?.name,
      };
    }

    default:
      throw new Error(`Unknown Zapier trigger: ${String(trigger)}`);
  }
}
