import { randomUUID } from "node:crypto";

import { buildActor } from "../../../../authz/actor.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../../utils/logger.js";
import { assertPublicUrl } from "../../../../utils/ssrf.js";
import { getIntegrationByName, updateIntegrationByName } from "../../integrations.service.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { ByOrgIdParams } from "../../../org/org.schema.js";
import bcrypt from "bcrypt";
import { Role } from "../../../../../generated/prisma/client.js";
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
  getUserIdByEmailAndOrgId,
} from "./zapier.service.js";
import { ZapierTriggers } from "./zapier.types.js";
import {
  addNewContactsToGroup,
  getContactGroupsByOrgId,
  getContactGroupsByTeamId,
} from "../../../contact/contactGroup/contactGroup.service.js";
import { getTeamsByOrgId, inviteTeamMember } from "../../../team/team.service.js";
import { InviteType } from "../../../team/team.schema.js";
import {
  ContactLabelSchema,
  InviteMemberRequestSchema,
  NewMemberToGroupShema,
  PageSchema,
  SendMessageSchema,
  TriggerSubscriptionBodySchema,
  ZapierCreateContactSchema,
  ZapierUpdateContactSchema,
} from "./zapier.schema.js";
import { createContactHandler as createContact } from "../../../contact/contact.controller.js";
import { findForeignContactRef } from "../../../../external/v1/contacts/contactRefs.js";

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
      // Never log the headers: they carry the API key.
      log.warn({ url: request.url }, "Zapier request without a bearer token");
      reply.code(400).send({
        message: "Invalid request",
        error: "No bearer token found in headers",
      });
      return;
    }
    const apiKey = authHeader.split("Bearer ")[1];
    if (!apiKey) {
      log.warn({ url: request.url }, "Zapier request with an empty bearer token");
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
      log.warn({ orgId }, "Zapier request with an invalid API key");
      reply.code(401).send({ message: "Not authorized", error: "Invalid access token" });
      return;
    }

    const user = { orgId, role: Role.SUPER_ADMIN };
    request.user = user;
    request.principal = { kind: "zapier", orgId, scopes: [] };
    request.actor = buildActor(request.principal);
    if (request.url.includes("/auth")) return reply.send({ user: user });
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
    const { orgId } = request.query;
    const { hookUrl, subscribed_field, zapId } = request.body;
    // The hook URL is a capability URL: anyone holding it can post into the Zap.
    log.info({ orgId, subscribed_field, zapId }, "zapier trigger subscription received");
    try {
      await assertPublicUrl(hookUrl);
    } catch (error) {
      log.warn({ orgId, err: error }, "zapier trigger subscription with a non-public hook URL");
      return reply.code(400).send({ error: "hookUrl must be a public https URL" });
    }
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
        id: randomUUID(),
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
    const { orgId } = request.query;
    log.info({ orgId }, "zapier trigger subscription removal received");
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
    const problem = await findForeignContactRef(request.user.orgId, [
      { lifecycleId: request.body.lifecycleId },
    ]);
    if (problem) return reply.code(400).send({ error: problem });
    // The org is the one the API key was checked against; a body `orgId` is ignored.
    const contact = await updateContactLabelsById(
      request.body.contactId,
      request.user.orgId,
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

/**
 * The dashboard's create, behind the check v1 runs (`contactRefs.ts`): the contact services
 * write label, group, lifecycle, custom field and member ids as given, so a request naming
 * another org's is refused. The update, lifecycle and group handlers below check the same.
 */
export async function createContactHandler(
  request: FastifyRequest<{ Body: ZapierCreateContactSchema }>,
  reply: FastifyReply,
) {
  const problem = await findForeignContactRef(request.user.orgId, [request.body]);
  if (problem) return reply.code(400).send({ error: problem });
  return createContact(request as never, reply);
}

export async function updateContactHandler(
  request: FastifyRequest<{
    Body: ZapierUpdateContactSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    // The org is the one the API key was checked against; a body `orgId` is ignored.
    const { contactId, orgId: _ignored, ...rest } = request.body;
    const problem = await findForeignContactRef(request.user.orgId, [rest]);
    if (problem) return reply.code(400).send({ error: problem });
    const data = await updateContactById(contactId, request.user.orgId, rest);
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
      const res = await getContactById(contactId, orgId);
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
      await deleteContactById(contactId, orgId);
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
      const data = await getContactGroupsByTeamId(request.query.teamId, request.query.orgId);
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
    const problem = await findForeignContactRef(orgId, request.body.contacts);
    if (problem) return reply.code(400).send({ error: problem });
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
