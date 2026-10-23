import { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

import { PlatformType } from "../../../../generated/prisma/enums.js";
import { log } from "../../../utils/logger.js";
import { getMetaChannelById } from "../metaChannel/metaChannel.service.js";
import { GraphApiError } from "../wa_axios.js";
import {
  deleteMessengerProfileFields,
  getMessengerProfile,
  setMessengerProfile,
  type MessengerProfileField,
  type MessengerProfileUpdate,
} from "./messenger_profile.service.js";
import {
  messengerGetStartedSchema,
  messengerGreetingSchema,
  messengerIceBreakersSchema,
  messengerPersistentMenuSchema,
  type MessengerProfileParams,
} from "./messenger_profile.schema.js";

type ProfileRequest<Body = unknown> = FastifyRequest<{
  Params: MessengerProfileParams;
  Body: Body;
}>;

/** The Page token of one of this org's Messenger channels, or null. */
async function pageToken(channelId: string, orgId: string) {
  const channel = await getMetaChannelById(channelId, orgId);
  if (channel?.platform !== PlatformType.FACEBOOK || !channel.pageAccessToken) return null;
  return channel.pageAccessToken;
}

function notFound(reply: FastifyReply) {
  return reply.code(404).send({ success: false, message: "Facebook Page not found" });
}

/** Meta's own explanation is the useful one (a missing permission, a bad URL). */
function failed(reply: FastifyReply, error: unknown, action: string) {
  log.error({ err: error }, `[Messenger Profile] Failed to ${action}`);
  if (error instanceof GraphApiError) {
    const graph = error.error;
    return reply.code(502).send({
      success: false,
      message: graph?.error_user_msg ?? graph?.message ?? `Meta refused to ${action}`,
    });
  }
  return reply.code(500).send({ success: false, message: `Failed to ${action}` });
}

export async function getMessengerProfileHandler(request: ProfileRequest, reply: FastifyReply) {
  const token = await pageToken(request.params.channelId, request.user.orgId);
  if (!token) return notFound(reply);
  try {
    return reply.code(200).send({ success: true, data: await getMessengerProfile(token) });
  } catch (error) {
    return failed(reply, error, "read the Messenger profile");
  }
}

async function save(
  request: ProfileRequest,
  reply: FastifyReply,
  update: MessengerProfileUpdate,
  action: string,
) {
  const token = await pageToken(request.params.channelId, request.user.orgId);
  if (!token) return notFound(reply);
  try {
    await setMessengerProfile(token, update);
    return reply.code(200).send({ success: true, data: await getMessengerProfile(token) });
  } catch (error) {
    return failed(reply, error, action);
  }
}

async function remove(
  request: ProfileRequest,
  reply: FastifyReply,
  fields: MessengerProfileField[],
  action: string,
) {
  const token = await pageToken(request.params.channelId, request.user.orgId);
  if (!token) return notFound(reply);
  try {
    await deleteMessengerProfileFields(token, fields);
    return reply.code(200).send({ success: true, data: await getMessengerProfile(token) });
  } catch (error) {
    return failed(reply, error, action);
  }
}

export function setMessengerGetStartedHandler(
  request: ProfileRequest<z.infer<typeof messengerGetStartedSchema>>,
  reply: FastifyReply,
) {
  return save(request, reply, { getStarted: request.body.payload }, "set the Get Started button");
}

/** Meta only shows a persistent menu next to a Get Started button, so the menu goes too. */
export function deleteMessengerGetStartedHandler(request: ProfileRequest, reply: FastifyReply) {
  return remove(
    request,
    reply,
    ["get_started", "persistent_menu"],
    "remove the Get Started button",
  );
}

export function setMessengerGreetingHandler(
  request: ProfileRequest<z.infer<typeof messengerGreetingSchema>>,
  reply: FastifyReply,
) {
  return save(request, reply, { greeting: request.body.text }, "set the greeting");
}

export function deleteMessengerGreetingHandler(request: ProfileRequest, reply: FastifyReply) {
  return remove(request, reply, ["greeting"], "remove the greeting");
}

export function setMessengerIceBreakersHandler(
  request: ProfileRequest<z.infer<typeof messengerIceBreakersSchema>>,
  reply: FastifyReply,
) {
  return save(request, reply, { iceBreakers: request.body.iceBreakers }, "set ice breakers");
}

export function deleteMessengerIceBreakersHandler(request: ProfileRequest, reply: FastifyReply) {
  return remove(request, reply, ["ice_breakers"], "remove ice breakers");
}

export async function setMessengerPersistentMenuHandler(
  request: ProfileRequest<z.infer<typeof messengerPersistentMenuSchema>>,
  reply: FastifyReply,
) {
  const token = await pageToken(request.params.channelId, request.user.orgId);
  if (!token) return notFound(reply);
  try {
    // Meta refuses a menu on a Page without a Get Started button; say so plainly.
    const current = await getMessengerProfile(token);
    if (!current.getStarted) {
      return reply.code(409).send({
        success: false,
        message: "Set a Get Started button before adding a persistent menu",
      });
    }
  } catch (error) {
    return failed(reply, error, "read the Messenger profile");
  }
  return save(request, reply, { persistentMenu: request.body.persistentMenu }, "set the menu");
}

export function deleteMessengerPersistentMenuHandler(request: ProfileRequest, reply: FastifyReply) {
  return remove(request, reply, ["persistent_menu"], "remove the menu");
}
