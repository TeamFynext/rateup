import type { RouteOptions } from "fastify";
import z from "zod";

import type { Permission } from "../../authz/permissions.js";
import { EXTERNAL_V2_PREFIX } from "../v2/prefix.js";

/**
 * Partner API v2 routes as MCP tools.
 *
 * Each tool is one v2 route, built from what the route already declares: its summary and
 * description, its Zod `params`, `querystring` and `body`, its permission and whether it
 * spends money. A call is run through the real route (mcp.route.ts), so there is no second
 * copy of any rule here.
 *
 * Names are listed by hand below so they stay short and stable; `tools.test.ts` fails when a
 * v2 route has no entry, so a new route has to be named (or left out on purpose) here.
 */

type JsonSchema = Record<string, unknown>;

/** "METHOD /path under /api/external/v2" → tool name. `null` keeps a route out of MCP. */
export const TOOL_NAMES: Record<string, string | null> = {
  // Contacts
  "GET /contacts": "contacts_list",
  "GET /contacts/lookup": "contacts_lookup",
  "POST /contacts": "contacts_create",
  "POST /contacts/bulk": "contacts_create_bulk",
  "GET /contacts/:contactId": "contacts_get",
  "PATCH /contacts/:contactId": "contacts_update",
  "DELETE /contacts/:contactId": "contacts_delete",
  "GET /contacts/:contactId/identities": "contacts_list_identities",
  "POST /contacts/:contactId/identities": "contacts_add_identity",
  "DELETE /contacts/:contactId/identities/:identityId": "contacts_remove_identity",
  "POST /contacts/:contactId/merge": "contacts_merge",

  // Audiences
  "GET /audiences": "audiences_list",
  "POST /audiences": "audiences_create",
  "GET /audiences/:contactGroupId": "audiences_get",
  "PATCH /audiences/:contactGroupId": "audiences_update",
  "DELETE /audiences/:contactGroupId": "audiences_delete",
  "GET /audiences/:contactGroupId/contacts": "audiences_list_contacts",
  "POST /audiences/:contactGroupId/contacts": "audiences_add_contacts",
  "POST /audiences/:contactGroupId/contacts/remove": "audiences_remove_contacts",
  "POST /audiences/:contactGroupId/contacts/import": "audiences_import_contacts",

  // Teams
  "GET /teams": "teams_list",

  // Campaigns
  "GET /campaigns": "campaigns_list",
  "GET /campaigns/:campaignId": "campaigns_get",
  "POST /campaigns": "campaigns_create",
  "DELETE /campaigns/:campaignId": "campaigns_delete",
  "POST /campaigns/:campaignId/send": "campaigns_send",
  "GET /campaigns/:campaignId/responses": "campaigns_list_responses",

  // WhatsApp templates
  "GET /wa/templates": "templates_list",
  "POST /wa/templates/send": "templates_send",
  // Multipart with a streamed file: nothing an MCP client can pass as JSON arguments.
  "POST /wa/templates/send-with-file": null,
  "POST /wa/templates/:templateId/send/contacts": "templates_send_to_contacts",
  "GET /wa/templates/messages/:messageId/status": "messages_get_status",

  // Surveys
  "GET /surveys": "surveys_list",
  "GET /surveys/:surveyId": "surveys_get",
  "GET /surveys/:surveyId/responses": "surveys_list_responses",

  // Loyalty
  "GET /loyalty/ping": "loyalty_ping",
  "GET /loyalty/program": "loyalty_get_program",
  "GET /loyalty/tiers": "loyalty_list_tiers",
  "GET /loyalty/earning-rules": "loyalty_list_earning_rules",
  "GET /loyalty/rewards": "loyalty_list_rewards",
  "GET /loyalty/rewards/:rewardCode": "loyalty_get_reward",
  "GET /loyalty/members/lookup": "loyalty_lookup_member",
  "GET /loyalty/members": "loyalty_list_members",
  "GET /loyalty/members/preflight": "loyalty_check_member_phone",
  "POST /loyalty/members": "loyalty_enrol_member",
  "PATCH /loyalty/members": "loyalty_update_member",
  "POST /loyalty/members/card/send": "loyalty_send_card",
  "POST /loyalty/points/award": "loyalty_award_points",
  "POST /loyalty/points/adjust": "loyalty_adjust_points",
  "GET /loyalty/points/transactions": "loyalty_list_transactions",
  "POST /loyalty/rewards/:rewardCode/issue": "loyalty_issue_reward",
  "POST /loyalty/rewards/:rewardCode/redeem": "loyalty_redeem_reward",
  "GET /loyalty/vouchers/:code": "loyalty_check_voucher",
  "POST /loyalty/vouchers/:code/redeem": "loyalty_redeem_voucher",
};

/** Writes that delete or merge away data, beyond plain DELETEs. */
const DESTRUCTIVE = new Set([
  "contacts_merge",
  "contacts_remove_identity",
  "audiences_remove_contacts",
]);

/** Argument that carries the request body, beside the flattened path and query arguments. */
const BODY_ARG = "body";
/** Argument sent as the `Idempotency-Key` header on writes. */
const IDEMPOTENCY_ARG = "idempotencyKey";

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
  /** How a call becomes a request. Never sent to the client. */
  route: {
    method: string;
    /** Full URL pattern, `/api/external/v2/...` with `:params`. */
    url: string;
    pathParams: string[];
    queryParams: string[];
    hasBody: boolean;
    isWrite: boolean;
    permissions: Permission[];
    paid: boolean;
  };
}

export function routeKey(route: Pick<RouteOptions, "method" | "url">): string {
  const method = Array.isArray(route.method) ? route.method.join("|") : route.method;
  const path = route.url.slice(EXTERNAL_V2_PREFIX.length).replace(/\/$/, "") || "/";
  return `${method} ${path}`;
}

function isZod(value: unknown): value is z.ZodType {
  return value instanceof z.ZodType;
}

/** The JSON Schema of what a caller sends (`io: "input"`: before transforms and defaults). */
function toJson(schema: z.ZodType, defs: Record<string, unknown>): JsonSchema {
  const json = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
    target: "draft-2020-12",
  }) as JsonSchema;
  delete json.$schema;
  // Refs point at `#/$defs/...` from the root, so moving the definitions up keeps them valid.
  if (json.$defs) {
    Object.assign(defs, json.$defs);
    delete json.$defs;
  }
  return json;
}

/** Path and query schemas are flattened into the tool's arguments, so each must be an object. */
function objectProperties(json: JsonSchema, where: string) {
  const properties = json.properties as Record<string, JsonSchema> | undefined;
  if (json.type !== "object" || !properties) {
    throw new Error(`${where} schema is not a plain object`);
  }
  return { properties, required: (json.required as string[] | undefined) ?? [] };
}

export function buildTool(route: RouteOptions): McpTool | null {
  const key = routeKey(route);
  if (!(key in TOOL_NAMES)) throw new Error(`No MCP tool name for ${key} (mcp/tools.ts)`);
  const name = TOOL_NAMES[key];
  if (!name) return null;

  const method = Array.isArray(route.method) ? route.method[0]! : route.method;
  const isWrite = method !== "GET";
  const schema = (route.schema ?? {}) as Record<string, unknown>;
  const config = route.config ?? {};
  const permission = config.permission;
  const permissions = (
    permission ? (Array.isArray(permission) ? permission : [permission]) : []
  ) as Permission[];

  const defs: Record<string, unknown> = {};
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  const pathParams: string[] = [];
  const queryParams: string[] = [];

  if (isZod(schema.params)) {
    const params = objectProperties(toJson(schema.params, defs), `${key} params`);
    for (const [prop, json] of Object.entries(params.properties)) {
      properties[prop] = json;
      required.push(prop);
      pathParams.push(prop);
    }
  }

  if (isZod(schema.querystring)) {
    const query = objectProperties(toJson(schema.querystring, defs), `${key} querystring`);
    for (const [prop, json] of Object.entries(query.properties)) {
      if (prop in properties) throw new Error(`${key}: query "${prop}" clashes with the path`);
      properties[prop] = json;
      queryParams.push(prop);
    }
    required.push(...query.required);
  }

  // Reserved only where the tool adds them: a read may filter by a query named the same
  // (the loyalty ledger takes `?idempotencyKey=`).
  const reserved = [
    ...(isZod(schema.body) ? [BODY_ARG] : []),
    ...(isWrite ? [IDEMPOTENCY_ARG] : []),
  ];
  for (const arg of reserved) {
    if (arg in properties) throw new Error(`${key}: "${arg}" is reserved for the MCP tool`);
  }

  const hasBody = isZod(schema.body);
  if (hasBody) {
    const body = schema.body as z.ZodType;
    properties[BODY_ARG] = { ...toJson(body, defs), description: "The request body." };
    if (!body.safeParse(undefined).success) required.push(BODY_ARG);
  }

  if (isWrite) {
    properties[IDEMPOTENCY_ARG] = {
      type: "string",
      description:
        "Optional Idempotency-Key (8-200 characters of A-Z a-z 0-9 _ . : @ -). Retrying with " +
        "the same key replays the first answer instead of repeating the write.",
    };
  }

  const inputSchema: JsonSchema = { type: "object", properties };
  if (required.length > 0) inputSchema.required = required;
  if (Object.keys(defs).length > 0) inputSchema.$defs = defs;

  const title = typeof schema.summary === "string" ? schema.summary : name;
  const paid = config.paid === true;
  const notes = [
    typeof schema.description === "string" ? schema.description : null,
    paid ? "Sends a paid WhatsApp message; test keys (rk_test_) are refused." : null,
    `Needs the ${permissions.join(" or ")} scope.`,
  ].filter(Boolean);

  return {
    name,
    title,
    description: [`${title}.`, ...notes].join("\n\n"),
    inputSchema,
    annotations: {
      title,
      readOnlyHint: !isWrite,
      destructiveHint: method === "DELETE" || DESTRUCTIVE.has(name),
      idempotentHint: !isWrite || method === "DELETE",
      // Sends reach people outside the org; everything else stays inside RateUp.
      openWorldHint: paid,
    },
    route: {
      method,
      url: route.url,
      pathParams,
      queryParams,
      hasBody,
      isWrite,
      permissions,
      paid,
    },
  };
}

export function buildTools(routes: readonly RouteOptions[]): McpTool[] {
  const tools = routes.map(buildTool).filter((t): t is McpTool => t !== null);
  const seen = new Set<string>();
  for (const t of tools) {
    if (seen.has(t.name)) throw new Error(`Two v2 routes share the MCP tool name ${t.name}`);
    seen.add(t.name);
  }
  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

/** What a client sees in `tools/list`. */
export function publicTool(tool: McpTool) {
  const { route: _route, ...rest } = tool;
  return rest;
}

export interface ToolRequest {
  method: string;
  url: string;
  query: Record<string, string | string[]>;
  body: unknown;
  idempotencyKey?: string;
}

/** Arguments → the v2 request they stand for. Throws on a missing path argument. */
export function toRequest(tool: McpTool, args: Record<string, unknown>): ToolRequest {
  let url = tool.route.url;
  for (const param of tool.route.pathParams) {
    const value = args[param];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing required argument "${param}"`);
    }
    url = url.replace(`:${param}`, encodeURIComponent(String(value)));
  }

  const query: Record<string, string | string[]> = {};
  for (const param of tool.route.queryParams) {
    const value = args[param];
    if (value === undefined || value === null) continue;
    query[param] = Array.isArray(value) ? value.map(String) : String(value);
  }

  const idempotencyKey = args[IDEMPOTENCY_ARG];
  return {
    method: tool.route.method,
    url,
    query,
    body: tool.route.hasBody ? args[BODY_ARG] : undefined,
    idempotencyKey:
      tool.route.isWrite && typeof idempotencyKey === "string" ? idempotencyKey : undefined,
  };
}
