import type { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../../utils/logger.js";
import prisma from "../../../../utils/prisma.js";
import { assertPublicUrl } from "../../../../utils/ssrf.js";
import { ContactNotFoundError } from "../../../contacts/contact.errors.js";
import {
  deleteContactById,
  updateContactById,
  updateContactLabelsById,
} from "../../../contacts/contact.service.js";
import {
  addNewContactsToGroup,
  getContactGroupsByOrgId,
  getContactGroupsByTeamId,
} from "../../../contacts/audiences/audience.service.js";
import { getTeamsByOrgId } from "../../../settings/teams/team.service.js";
import { sendTemplateToUserCore } from "../../../meta/whatsapp/templates/templates.controller.js";
import { sendTextMessage } from "../../../meta/whatsapp/webhook/whatsapp.service.js";
import { addAutomationHook, removeAutomationHookById } from "../automation.hooks.js";
import { AUTOMATION_PLATFORM_LABELS, type AutomationPlatform } from "../automation.platforms.js";
import {
  getLifecyclesByOrgId,
  getSampleDataForTrigger,
} from "../../external/zapier/zapier.service.js";
import type { ZapierTriggers } from "../../external/zapier/zapier.types.js";
import type {
  AutomationContactSearch,
  AutomationGroupMembers,
  AutomationHookBody,
  AutomationTemplateMessage,
  AutomationTextMessage,
  AutomationUpdateContact,
} from "./automationApi.schema.js";
import {
  getAutomationOrg,
  listAutomationTemplates,
  pickAutomationContact,
  searchAutomationContacts,
} from "./automationApi.service.js";

// The API every automation platform's app calls (Make, Pabbly, …), mounted once per
// platform. Every handler reads the org from `request.user` and the platform from
// `request.principal`, both set by `automationKeyAuth` from the API key. Nothing a
// request carries can name another org or platform.

type Req<T extends object = object> = FastifyRequest<T>;

/** The platform whose key authenticated the request. */
function platformOf(request: FastifyRequest): AutomationPlatform {
  const principal = request.principal;
  if (principal?.kind !== "automation") throw new Error("Not an automation-platform request");
  return principal.platform as AutomationPlatform;
}

const isNotFound = (error: unknown) =>
  error instanceof ContactNotFoundError || (error as { code?: string } | null)?.code === "P2025";

function fail(request: FastifyRequest, reply: FastifyReply, error: unknown, action: string) {
  if (isNotFound(error)) return reply.code(404).send({ error: "Not found" });
  log.error({ err: error }, `${AUTOMATION_PLATFORM_LABELS[platformOf(request)]}: ${action} failed`);
  return reply.code(500).send({ error: "Something went wrong" });
}

/** The platform's connection check; the org name labels the connection there. */
export async function automationMeHandler(request: Req, reply: FastifyReply) {
  return reply.send(await getAutomationOrg(request.user.orgId));
}

/** Trigger attach: the platform sends its webhook URL, and keeps the id to detach with. */
export async function automationAttachHookHandler(
  request: Req<{ Body: AutomationHookBody }>,
  reply: FastifyReply,
) {
  const platform = platformOf(request);
  try {
    await assertPublicUrl(request.body.url);
  } catch (error) {
    log.warn({ err: error, orgId: request.user.orgId }, "Automation hook with a non-public URL");
    return reply.code(400).send({ error: "Hook URL must be a public https address" });
  }
  const hook = await addAutomationHook(platform, request.user.orgId, {
    hookUrl: request.body.url,
    trigger: request.body.event,
  });
  if (!hook) {
    return reply
      .code(404)
      .send({ error: `${AUTOMATION_PLATFORM_LABELS[platform]} is not connected` });
  }
  return reply.code(201).send({ id: hook.id, event: hook.subscribed_field });
}

export async function automationDetachHookHandler(
  request: Req<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await removeAutomationHookById(platformOf(request), request.user.orgId, request.params.id);
  // Detaching a hook that is already gone is not an error to the platform.
  return reply.code(204).send();
}

export async function automationHookSampleHandler(
  request: Req<{ Querystring: { event: ZapierTriggers } }>,
  reply: FastifyReply,
) {
  return reply.send(await getSampleDataForTrigger(request.query.event, request.user.orgId, 1));
}

export async function automationSearchContactsHandler(
  request: Req<{ Querystring: AutomationContactSearch }>,
  reply: FastifyReply,
) {
  return reply.send(await searchAutomationContacts(request.user.orgId, request.query));
}

export async function automationUpdateContactHandler(
  request: Req<{ Params: { id: string }; Body: AutomationUpdateContact }>,
  reply: FastifyReply,
) {
  try {
    const contact = await updateContactById(request.params.id, request.user.orgId, request.body);
    return reply.send(pickAutomationContact(contact));
  } catch (error) {
    return fail(request, reply, error, "updating a contact");
  }
}

export async function automationDeleteContactHandler(
  request: Req<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deleteContactById(request.params.id, request.user.orgId);
    return reply.send({ id: request.params.id, deleted: true });
  } catch (error) {
    return fail(request, reply, error, "deleting a contact");
  }
}

export async function automationSetLifecycleHandler(
  request: Req<{ Params: { id: string }; Body: { lifecycleId: string } }>,
  reply: FastifyReply,
) {
  try {
    const contact = await updateContactLabelsById(
      request.params.id,
      request.user.orgId,
      request.body.lifecycleId,
    );
    return reply.send({
      contactId: contact.id,
      lifecycleId: request.body.lifecycleId,
      lifecycleName: contact.Lifecycle?.name ?? null,
    });
  } catch (error) {
    return fail(request, reply, error, "setting a lifecycle");
  }
}

export async function automationAddGroupMembersHandler(
  request: Req<{ Params: { groupId: string }; Body: AutomationGroupMembers }>,
  reply: FastifyReply,
) {
  try {
    await addNewContactsToGroup(
      request.params.groupId,
      request.body.contacts as never,
      request.user.orgId,
    );
    return reply.send({ success: true });
  } catch (error) {
    return fail(request, reply, error, "adding group members");
  }
}

export async function automationSendTextHandler(
  request: Req<{ Body: AutomationTextMessage }>,
  reply: FastifyReply,
) {
  try {
    await sendTextMessage(
      { phone: request.body.phone, orgId: request.user.orgId },
      null,
      request.body.message,
    );
    return reply.send({ success: true });
  } catch (error) {
    return fail(request, reply, error, "sending a text");
  }
}

async function teamInOrg(orgId: string, teamId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, orgId }, select: { id: true } });
  return Boolean(team);
}

/** A template's body variables become its body parameters, in order. */
export async function automationSendTemplateHandler(
  request: Req<{ Body: AutomationTemplateMessage }>,
  reply: FastifyReply,
) {
  const { phone, templateId, variables, teamId } = request.body;
  try {
    // The team decides which survey a flow button opens; it must be this org's.
    if (teamId && !(await teamInOrg(request.user.orgId, teamId))) {
      return reply.code(404).send({ error: "No such team" });
    }
    const components = variables.length
      ? [{ type: "body", parameters: variables.map((text) => ({ type: "text", text })) }]
      : [];
    const result = await sendTemplateToUserCore(
      request.user.orgId,
      templateId,
      phone,
      components as never,
      teamId,
    );
    if ("status" in result && result.status === false) {
      return reply.code(400).send({ error: (result as { message?: string }).message });
    }
    return reply.send({
      success: true,
      messageId: (result as { id?: string }).id ?? null,
    });
  } catch (error) {
    return fail(request, reply, error, "sending a template");
  }
}

export async function automationTeamsHandler(request: Req, reply: FastifyReply) {
  return reply.send(await getTeamsByOrgId({ orgId: request.user.orgId }));
}

export async function automationGroupsHandler(
  request: Req<{ Querystring: { teamId?: string } }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const groups = request.query.teamId
    ? await getContactGroupsByTeamId(request.query.teamId, orgId)
    : await getContactGroupsByOrgId(orgId);
  return reply.send(groups.map((g) => ({ id: g.id, name: g.name })));
}

export async function automationLifecyclesHandler(request: Req, reply: FastifyReply) {
  return reply.send(await getLifecyclesByOrgId(request.user.orgId));
}

export async function automationTemplatesHandler(request: Req, reply: FastifyReply) {
  return reply.send(await listAutomationTemplates(request.user.orgId));
}
