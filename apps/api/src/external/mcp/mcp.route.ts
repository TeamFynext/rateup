import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { assertApiKeyV2 } from "../../modules/settings/apiKeys/apiKey.auth.js";
import { isOrgSuspended, ORG_SUSPENDED_MESSAGE } from "../../modules/settings/org/orgSuspension.js";
import { clientIp } from "../../utils/http.js";
import { log } from "../../utils/logger.js";
import { ExternalApiError, externalErrorHandler } from "../shared/errors.js";
import { externalRateLimit } from "../shared/rateLimit.js";
import { v2Routes } from "./catalog.js";
import { buildTools, publicTool, toRequest, type McpTool } from "./tools.js";

/**
 * The partner API as a Model Context Protocol server, so an AI assistant (Claude, Cursor,
 * ChatGPT…) can work with an org's RateUp data using a v2 API key.
 *
 * Streamable HTTP, stateless: every message is one POST answered with one JSON body, no
 * session id and no server-to-client stream. Auth is the same `Authorization: Bearer rk_…`
 * as v2.
 *
 * A `tools/call` is replayed into the v2 route it stands for with `inject`, carrying the
 * caller's key and address. So scopes, test-key refusals, plan gates, rate limits,
 * idempotency, validation, the error envelope and the per-key usage log are exactly v2's,
 * with nothing restated here.
 */

export const MCP_PATH = "/api/external/v2/mcp";

/** Newest first; an unknown version from the client is answered with the first. */
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const SERVER_INFO = { name: "rateup", title: "RateUp", version: "1.0.0" };

const INSTRUCTIONS = [
  "RateUp's partner API v2 for one organisation (the one the API key belongs to).",
  "Phone numbers are digits with the country code and no +, e.g. 919876543210.",
  "Lists are cursor-paged: pass the previous answer's nextCursor as `cursor` for the next page.",
  "Writes are real, even with a test key; test keys only refuse paid WhatsApp sends.",
  "Ask the user before sending messages, sending campaigns, deleting or merging.",
].join("\n");

// JSON-RPC 2.0 error codes.
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

type JsonRpcId = string | number | null;

interface JsonRpcMessage {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

let toolCache: { tools: McpTool[]; byName: Map<string, McpTool> } | null = null;

/** Built on first use: the v2 routes are complete only once the app is ready. */
function tools() {
  if (!toolCache) {
    const list = buildTools(v2Routes());
    toolCache = { tools: list, byName: new Map(list.map((t) => [t.name, t])) };
  }
  return toolCache;
}

/** Test hook: forget the built tools so a test app's routes are read afresh. */
export function resetMcpToolCache() {
  toolCache = null;
}

/** What the key may call: listing a tool it would be refused on only wastes the model's turn. */
function visibleTo(request: FastifyRequest, tool: McpTool) {
  const actor = request.actor;
  if (!actor || !tool.route.permissions.some((p) => actor.can(p))) return false;
  return !(tool.route.paid && request.apiKey?.mode === "test");
}

async function callTool(server: FastifyInstance, request: FastifyRequest, params: unknown) {
  const { name, arguments: args = {} } = (params ?? {}) as { name?: unknown; arguments?: unknown };
  if (typeof name !== "string") throw new RpcError(INVALID_PARAMS, "params.name is required");
  const tool = tools().byName.get(name);
  if (!tool) throw new RpcError(INVALID_PARAMS, `Unknown tool: ${name}`);
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new RpcError(INVALID_PARAMS, "params.arguments must be an object");
  }

  let call;
  try {
    call = toRequest(tool, args as Record<string, unknown>);
  } catch (err) {
    return toolError((err as Error).message);
  }

  const headers: Record<string, string> = {
    authorization: request.headers.authorization ?? "",
    // The v2 IP limit and the usage log should see the caller, not this process.
    "cf-connecting-ip": clientIp(request),
    "user-agent": `rateup-mcp (${request.headers["user-agent"] ?? "unknown client"})`,
  };
  if (call.idempotencyKey) headers["idempotency-key"] = call.idempotencyKey;

  const res = await server.inject({
    method: call.method as "GET",
    url: call.url,
    query: call.query,
    headers,
    ...(call.body !== undefined ? { payload: call.body as object } : {}),
  });

  const text = res.payload || JSON.stringify({ status: res.statusCode });
  return {
    content: [{ type: "text", text }],
    isError: res.statusCode >= 400,
  };
}

function toolError(message: string) {
  return {
    content: [
      { type: "text", text: JSON.stringify({ error: { code: "invalid_arguments", message } }) },
    ],
    isError: true,
  };
}

async function dispatch(
  server: FastifyInstance,
  request: FastifyRequest,
  method: string,
  params: unknown,
) {
  switch (method) {
    case "initialize": {
      const asked = (params as { protocolVersion?: unknown } | undefined)?.protocolVersion;
      const protocolVersion =
        typeof asked === "string" && PROTOCOL_VERSIONS.includes(asked)
          ? asked
          : PROTOCOL_VERSIONS[0];
      return {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      };
    }
    case "ping":
      return {};
    case "tools/list":
      return {
        tools: tools()
          .tools.filter((t) => visibleTo(request, t))
          .map(publicTool),
      };
    case "tools/call":
      return callTool(server, request, params);
    // Asked by some clients whatever the capabilities say; empty is the honest answer.
    case "resources/list":
      return { resources: [] };
    case "prompts/list":
      return { prompts: [] };
    default:
      throw new RpcError(METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
}

/** One message in; a response, or null for a notification (which gets none). */
async function handleMessage(
  server: FastifyInstance,
  request: FastifyRequest,
  message: unknown,
): Promise<object | null> {
  const msg = (message ?? {}) as JsonRpcMessage;
  const hasId = typeof msg.id === "string" || typeof msg.id === "number";
  const id: JsonRpcId = hasId ? (msg.id as string | number) : null;

  if (typeof message !== "object" || message === null || msg.jsonrpc !== "2.0") {
    return rpcError(id, INVALID_REQUEST, "Not a JSON-RPC 2.0 message");
  }
  // A response from the client (we never ask it anything) or a notification: nothing to say.
  if (typeof msg.method !== "string") return null;
  if (!hasId) return null;

  try {
    const result = await dispatch(server, request, msg.method, msg.params);
    return { jsonrpc: "2.0", id, result };
  } catch (err) {
    if (err instanceof RpcError) return rpcError(id, err.code, err.message);
    log.error({ err, method: msg.method }, "MCP request failed");
    return rpcError(id, INTERNAL_ERROR, "Internal error");
  }
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function methodNotAllowed(_request: FastifyRequest, reply: FastifyReply) {
  // No server-to-client stream and no sessions to end: POST is the whole transport.
  return reply
    .code(405)
    .header("allow", "POST")
    .send(rpcError(null, INVALID_REQUEST, "Use POST"));
}

export async function externalMcpRoutes(server: FastifyInstance) {
  server.setErrorHandler(externalErrorHandler);

  server.addHook("onRoute", (route) => {
    (route.config ??= {}).access = "token";
  });

  // Ahead of the key check, as on v2 (partnerHooks.ts): it bounds key guessing.
  server.addHook(
    "preHandler",
    externalRateLimit({
      max: 300,
      windowSeconds: 60,
      key: "mcpIp",
      keyFrom: clientIp,
      failClosed: true,
    }),
  );

  server.addHook("preHandler", async (request) => {
    await assertApiKeyV2(request);
    if (await isOrgSuspended(request.user.orgId)) {
      throw new ExternalApiError(403, "org_suspended", ORG_SUSPENDED_MESSAGE);
    }
  });

  // Lets a client that has no key configured say so, rather than report a bare 401.
  server.addHook("onSend", async (_request, reply, payload) => {
    if (reply.statusCode === 401) reply.header("www-authenticate", 'Bearer realm="rateup"');
    return payload;
  });

  server.post("/", async (request, reply) => {
    const body = request.body;
    if (body === undefined || body === null || typeof body !== "object") {
      return reply.code(400).send(rpcError(null, PARSE_ERROR, "Send a JSON-RPC message as JSON"));
    }

    // Batches were dropped from the protocol in 2025-06-18; older clients may still send one.
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return reply.code(400).send(rpcError(null, INVALID_REQUEST, "Empty batch"));
      }
      const answers = [];
      for (const message of body) {
        const answer = await handleMessage(server, request, message);
        if (answer) answers.push(answer);
      }
      return answers.length > 0 ? reply.send(answers) : reply.code(202).send();
    }

    const answer = await handleMessage(server, request, body);
    return answer ? reply.send(answer) : reply.code(202).send();
  });

  server.get("/", methodNotAllowed);
  server.delete("/", methodNotAllowed);
}
