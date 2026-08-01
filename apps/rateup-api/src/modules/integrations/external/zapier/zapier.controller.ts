import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import { getIntegrationByName, updateIntegrationByName } from "../../integrations.service.js";
import { IntegratedApps, WaMessageAssignStatus } from "../../../../types/enums.js";
import { ByOrgIdParams } from "../../../org/org.schema.js";
import bcrypt from "bcrypt";
import { Role } from "../../../org/org.services.js";
import {
  deleteContactById,
  getContactById,
  updateContactById,
  updateContactLabelsById,
} from "../../../contact/contact.service.js";
import { sendTextMessage } from "../../../whatsapp/whatsappSurvey/wasurvey.service.js";
import {
  deleteContactByPhoneNumberAndOrgId,
  getContactsByPhoneNumberAndOrgId,
  getLifecyclesByOrgId,
  getSampleDataForTrigger,
  getTicketBoardsByTeamId,
  getTicketColumnsByBoardId,
  getUserIdByEmailAndOrgId,
  ZapierTriggers,
} from "./zapier.service.js";
import { CardInput, createCard } from "../../../ticket/ticketCard/card.service.js";
import {
  addNewContactsToGroup,
  getContactGroupsByOrgId,
  getContactGroupsByTeamId,
} from "../../../contact/contactGroup/contactGroup.service.js";
import { getTeamsByOrgId, inviteTeamMember } from "../../../team/team.service.js";
import { InviteType } from "../../../team/team.schema.js";
import {
  BoardQueryInput,
  ContactLabelSchema,
  InviteMemberRequestSchema,
  NewMemberToGroupShema,
  PageSchema,
  SendMessageSchema,
  TicketCardSchema,
  TicketColumnQueryInput,
  TriggerSubscriptionBodySchema,
} from "./zapier.schema.js";

export async function zapierAuthenticationHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    //TODO: add subscription check
    const { orgId } = request.query;
    if (!orgId) {
      log.warn("No orgId found in request\n%s", request.url);
      reply.code(404).send({ message: "Not found" });
      return;
    }
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      log.error("No bearer token found in headers\n%o", request.headers);
      reply.code(400).send({
        message: "Invalid request",
        error: "No bearer token found in headers",
      });
      return;
    }
    const apiKey = authHeader.split("Bearer ")[1];
    if (!apiKey) {
      log.error("No API Key found in headers\n%o", request.headers);
      reply.code(401).send({
        message: "Not authorized",
        error: "No API Key found in headers",
      });
      return;
    }

    const integration = (await getIntegrationByName(
      orgId,
      IntegratedApps.zapier,
    )) as unknown as ZapierIntegration;

    if (!integration || !integration.active || !integration.credential?.accessToken) {
      log.error("Active Zapier integration or access token not found for orgId => %s", orgId);
      reply.code(401).send({
        message: "Not authorized",
        error: "Zapier integration or access token not found for the organization",
      });
      return;
    }

    const isValid = await bcrypt.compare(apiKey, integration.credential?.accessToken);

    if (!isValid) {
      log.error("Invalid access token\n%o", request.headers);
      reply.code(401).send({ message: "Not authorized", error: "Invalid access token" });
      return;
    }

    const user = { orgId, role: Role.SUPER_ADMIN };
    request.user = user;
    if (request.url.includes("/auth")) reply.send({ user: user });
  } catch (e) {
    log.error({ err: e }, "Error checking session");
    reply.code(401).send({ message: "Not authorized" });
  }
}

export async function sendTextMessageHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams;
    Body: SendMessageSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;
    const { phone, message } = request.body;
    await sendTextMessage({ phone, orgId }, null, message);
    reply.send({ success: true });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function subscribeTriggerHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams;
    Body: TriggerSubscriptionBodySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    log.info("zapier trigger subscription received with body => %o", request.body);
    const { orgId } = request.query;
    const { hookUrl, subscribed_field, zapId } = request.body;
    const integration = (await getIntegrationByName(
      orgId,
      IntegratedApps.zapier,
    )) as unknown as ZapierIntegration;
    const triggerSubscriptions =
      integration.credential && integration.credential.triggerSubscriptions
        ? [...integration.credential.triggerSubscriptions]
        : [];
    const newTrigger = {
      hookUrl,
      subscribed_field: subscribed_field as ZapierTriggers,
      active: true,
      zapId,
    };
    const index = triggerSubscriptions.findIndex(
      (t) => t.hookUrl === hookUrl && t.subscribed_field === subscribed_field,
    );
    const hookReceivedAt = new Date().toISOString();
    if (index !== -1) {
      if (triggerSubscriptions[index].active) {
        return reply.send(newTrigger);
      } else {
        triggerSubscriptions[index] = {
          ...triggerSubscriptions[index],
          active: true,
          updatedAt: hookReceivedAt,
        };
      }
    } else {
      triggerSubscriptions.push({
        ...newTrigger,
        createdAt: hookReceivedAt,
        updatedAt: hookReceivedAt,
      });
    }

    const credential = {
      ...integration.credential,
      triggerSubscriptions,
    };
    await updateIntegrationByName(orgId, IntegratedApps.zapier, { credential });
    reply.send({ success: true });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function unsubscribeTriggerHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams }>,
  reply: FastifyReply,
) {
  try {
    log.info({ body: request.body }, "zapier trigger subscription removal received with body");
    const { orgId } = request.query;
    const integration = (await getIntegrationByName(
      orgId,
      IntegratedApps.zapier,
    )) as unknown as ZapierIntegration;
    const { hookUrl } = request.body as {
      hookUrl: string;
    };
    const triggers = integration.credential.triggerSubscriptions.filter(
      (t) => t.hookUrl !== hookUrl,
    );
    const credential = {
      ...integration.credential,
      triggerSubscriptions: triggers,
    };
    await updateIntegrationByName(orgId, IntegratedApps.zapier, { credential });
    reply.send({ success: true });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function updateContactLabelsByIdHandler(
  request: FastifyRequest<{
    Body: ContactLabelSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const contact = await updateContactLabelsById(
      request.body.contactId,
      request.body?.lifecycleId,
    );
    return reply.code(201).send({
      contactId: contact.id,
      lifecycleId: request.body?.lifecycleId,
      lifecycleName: contact.Lifecycle?.name ?? null,
    });
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getSampleDataForTriggerHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams & { triggerKey: ZapierTriggers } & PageSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { triggerKey, orgId, page } = request.query;
    const data = await getSampleDataForTrigger(triggerKey, orgId, page);
    reply.send(data);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function updateContactHandler(
  request: FastifyRequest<{
    Body: { contactId: string; waMessageAssignStatus: WaMessageAssignStatus };
  }>,
  reply: FastifyReply,
) {
  try {
    const { contactId, ...rest } = request.body;
    const data = await updateContactById(contactId, rest);
    reply.send(data);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getContactHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams & {
      contactId: string;
      phone: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { contactId, phone, orgId } = request.query;
    let contact;
    if (contactId) {
      const res = await getContactById(contactId);
      contact = res ? [res] : [];
    } else {
      contact = await getContactsByPhoneNumberAndOrgId(phone, orgId);
    }
    reply.send(contact);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteContactHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams;
    Body: {
      contactId?: string;
      phone?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;
    const { contactId, phone } = request.body;
    if (contactId) {
      await deleteContactById(contactId);
    } else {
      if (!phone) throw new Error("Either contactId or phone must be provided");
      await deleteContactByPhoneNumberAndOrgId(orgId, phone);
    }
    reply.send({ contactId });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function createTicketHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams;
    Body: TicketCardSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;
    const res = await createCard({
      ...request.body,
      orgId,
      type: "CUSTOM",
    } as CardInput);
    reply.send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getTeamsHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams & PageSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId, page } = request.query;
    const data = await getTeamsByOrgId({ orgId }, page);
    reply.send(data);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getTicketBoardsByTeamIdHandler(
  request: FastifyRequest<{
    Querystring: BoardQueryInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const data = await getTicketBoardsByTeamId(request.query.teamId, request.query.page);
    reply.send(data);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getTicketColumnsByBoardIdHandler(
  request: FastifyRequest<{
    Querystring: TicketColumnQueryInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const { boardId, page } = request.query;
    const data = await getTicketColumnsByBoardId(boardId, page);
    reply.send(data);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getContactGroupsHandler(
  request: FastifyRequest<{ Querystring: ByOrgIdParams & { teamId: string } }>,
  reply: FastifyReply,
) {
  try {
    let groups;
    if (!request.query.teamId) {
      const data = await getContactGroupsByOrgId(request.query.orgId);
      groups = data.map((g) => ({ id: g.id, name: g.name }));
    } else {
      const data = await getContactGroupsByTeamId(request.query.teamId);
      groups = data.map((g) => ({ id: g.id, name: g.name }));
    }
    reply.send(groups);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function addContactToGroupHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams;
    Body: NewMemberToGroupShema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;
    await addNewContactsToGroup(request.body.groupId, request.body.contacts, orgId);
    reply.send({ success: true });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function inviteMemberHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams;
    Body: InviteMemberRequestSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;
    const { invitedByEmail, ...rest } = request.body;
    const invitedBy = await getUserIdByEmailAndOrgId(invitedByEmail, orgId);
    if (!invitedBy) throw new Error(`No org member found for email ${invitedByEmail}`);
    await inviteTeamMember({
      orgId,
      type: InviteType.TEAM,
      invitedBy: invitedBy.userId,
      ...rest,
    });
    reply.send({ success: true });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getLifecycleHandler(
  request: FastifyRequest<{
    Querystring: ByOrgIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.query;
    const data = await getLifecyclesByOrgId(orgId);
    reply.send(data);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
