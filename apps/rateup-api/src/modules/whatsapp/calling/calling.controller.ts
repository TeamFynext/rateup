import type { FastifyReply, FastifyRequest } from "fastify";
import {
  acceptCall,
  getCallOffer,
  getCallPermission,
  getCallSettings,
  heartbeatCall,
  isCallingDisabled,
  isMissingCallPermission,
  listRingingCalls,
  rejectCall,
  requestCallPermission,
  startCall,
  terminateCall,
  updateCallSettings,
} from "./calling.service.js";
import type {
  AcceptCallInput,
  CallIdParams,
  CallPermissionQuery,
  CallSettingsInput,
  CallSettingsParams,
  RequestCallPermissionInput,
  StartCallInput,
} from "./calling.schema.js";

// Errors are left to the module's error handler (handleWhatsappError): an HttpError keeps
// its status, and a Graph error becomes a 400 carrying Meta's own message.

/**
 * Calling switched off on the number is a setup step, not a failure: its own code lets the
 * UI send the agent to the toggle instead of showing Meta's sentence.
 */
function replyIfCallingDisabled(error: unknown, reply: FastifyReply): boolean {
  if (!isCallingDisabled(error)) return false;
  reply.code(409).send({
    code: "calling_disabled",
    message: "Calling is turned off for this WhatsApp number",
  });
  return true;
}

export async function listRingingCallsHandler(request: FastifyRequest, reply: FastifyReply) {
  reply.send(await listRingingCalls(request.actor!));
}

export async function getCallOfferHandler(
  request: FastifyRequest<{ Params: CallIdParams }>,
  reply: FastifyReply,
) {
  reply.send(await getCallOffer(request.actor!, request.params.callId));
}

export async function acceptCallHandler(
  request: FastifyRequest<{ Params: CallIdParams; Body: AcceptCallInput }>,
  reply: FastifyReply,
) {
  reply.send(await acceptCall(request.actor!, request.params.callId, request.body.sdp));
}

export async function rejectCallHandler(
  request: FastifyRequest<{ Params: CallIdParams }>,
  reply: FastifyReply,
) {
  reply.send(await rejectCall(request.actor!, request.params.callId));
}

export async function terminateCallHandler(
  request: FastifyRequest<{ Params: CallIdParams }>,
  reply: FastifyReply,
) {
  await terminateCall(request.actor!, request.params.callId);
  reply.code(204).send();
}

export async function startCallHandler(
  request: FastifyRequest<{ Body: StartCallInput }>,
  reply: FastifyReply,
) {
  try {
    reply.code(201).send(await startCall(request.actor!, request.body));
  } catch (error) {
    // Its own code so the UI can offer to ask the customer instead of showing an error.
    if (replyIfCallingDisabled(error, reply)) return;
    if (isMissingCallPermission(error)) {
      reply.code(409).send({
        code: "call_permission_required",
        message: "The customer has not given permission to be called",
      });
      return;
    }
    throw error;
  }
}

export async function getCallPermissionHandler(
  request: FastifyRequest<{ Querystring: CallPermissionQuery }>,
  reply: FastifyReply,
) {
  const { phoneId, contactId } = request.query;
  try {
    reply.send(await getCallPermission(request.actor!, phoneId, contactId));
  } catch (error) {
    if (replyIfCallingDisabled(error, reply)) return;
    throw error;
  }
}

export async function requestCallPermissionHandler(
  request: FastifyRequest<{ Body: RequestCallPermissionInput }>,
  reply: FastifyReply,
) {
  try {
    await requestCallPermission(request.actor!, request.body);
    reply.code(204).send();
  } catch (error) {
    if (replyIfCallingDisabled(error, reply)) return;
    throw error;
  }
}

export async function getCallSettingsHandler(
  request: FastifyRequest<{ Params: CallSettingsParams }>,
  reply: FastifyReply,
) {
  reply.send(await getCallSettings(request.user.orgId, request.params.phoneId));
}

export async function updateCallSettingsHandler(
  request: FastifyRequest<{ Params: CallSettingsParams; Body: CallSettingsInput }>,
  reply: FastifyReply,
) {
  reply.send(await updateCallSettings(request.user.orgId, request.params.phoneId, request.body));
}

export async function heartbeatCallHandler(
  request: FastifyRequest<{ Params: CallIdParams }>,
  reply: FastifyReply,
) {
  await heartbeatCall(request.actor!, request.params.callId);
  reply.code(204).send();
}
