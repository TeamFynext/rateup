import { z } from "zod";

import prisma from "../../../utils/prisma.js";
import { generateApiKey } from "../../apiAccessToken/apiAccessToken.service.js";
import type { ConnectorToolBody, ParameterNode } from "../metaAgent.schema.js";
import {
  createConnector,
  createConnectorTool,
  deleteConnector,
  getAgentRecord,
  MetaAgentValidationError,
} from "../metaAgent.service.js";

/**
 * The connector RateUp installs on the agent for itself: loyalty lookups and CRM
 * updates, served by `rateupTools.route.ts`. One click in the UI does what a
 * business would otherwise do by hand — create the connector, give Meta a key,
 * describe each tool — and a reinstall rotates the key and rewrites the tools.
 */

export const RATEUP_BUILT_IN = "rateup";

/** The customer, filled in by Meta. The agent cannot choose or change it. */
const customerPhone: ParameterNode = {
  type: "string",
  description: "The customer's WhatsApp number",
  required: true,
  binding: { kind: "macro", macro: "WHATSAPP_PHONE_NUMBER" },
};

const namedBody = (
  field: string,
  description: string,
): ConnectorToolBody["request_definition"]["body"] => ({
  content_type: "application/json",
  params: {
    phone: {
      type: "string",
      description: "The customer's WhatsApp number",
      binding: { kind: "macro", macro: "WHATSAPP_PHONE_NUMBER" },
    },
    [field]: { type: "string", description },
  },
  required: ["phone", field],
});

export type RateupToolGroup = "loyalty" | "crm" | "commerce";

interface RateupTool {
  group: RateupToolGroup;
  definition: ConnectorToolBody;
}

export const RATEUP_TOOLS = {
  get_loyalty_status: {
    group: "loyalty",
    definition: {
      name: "get_loyalty_status",
      description:
        "Look up the customer you are talking to in the loyalty programme: their points balance, tier and progress to the next tier, rewards they can afford now, and vouchers ready to use. Call it whenever they ask about points, rewards, vouchers or their membership. A member_not_found error means they have not joined.",
      request_definition: {
        method: "GET",
        path: "/loyalty/member",
        query_parameters: { phone: customerPhone },
      },
      user_auth_required: false,
    },
  },
  list_loyalty_rewards: {
    group: "loyalty",
    definition: {
      name: "list_loyalty_rewards",
      description:
        "List every reward in the loyalty programme with its points cost. Use it to answer what can be earned or bought with points, including for someone who has not joined yet.",
      request_definition: { method: "GET", path: "/loyalty/rewards" },
      user_auth_required: false,
    },
  },
  get_crm_options: {
    group: "crm",
    definition: {
      name: "get_crm_options",
      description:
        "List the labels, lead stages and teams this business uses. Call it before add_contact_label, set_lead_stage or assign_to_team so you use a name that exists.",
      request_definition: { method: "GET", path: "/crm/options" },
      user_auth_required: false,
    },
  },
  add_contact_label: {
    group: "crm",
    definition: {
      name: "add_contact_label",
      description:
        "Tag the customer you are talking to with one of the business's existing labels, for example to mark their interest or the reason they got in touch. Only existing labels can be used; see get_crm_options.",
      request_definition: {
        method: "POST",
        path: "/crm/label",
        body: namedBody("label", "The label name, exactly as get_crm_options lists it"),
      },
      user_auth_required: false,
    },
  },
  set_lead_stage: {
    group: "crm",
    definition: {
      name: "set_lead_stage",
      description:
        "Move the customer you are talking to to a stage on the business's lead board, for example when they ask for a quote or confirm they want to buy. Only existing stages can be used; see get_crm_options.",
      request_definition: {
        method: "POST",
        path: "/crm/stage",
        body: namedBody("stage", "The stage name, exactly as get_crm_options lists it"),
      },
      user_auth_required: false,
    },
  },
  assign_to_team: {
    group: "crm",
    definition: {
      name: "assign_to_team",
      description:
        "Route the customer you are talking to to one of the business's teams, so the right people see the conversation — for example billing questions to Billing. Call it before handing the conversation over to a human. Only existing teams can be used; see get_crm_options.",
      request_definition: {
        method: "POST",
        path: "/crm/team",
        body: namedBody("team", "The team name, exactly as get_crm_options lists it"),
      },
      user_auth_required: false,
    },
  },
  search_products: {
    group: "commerce",
    definition: {
      name: "search_products",
      description:
        "Search the shop's products by what the customer asks for (a name, a kind of product, a colour or a size). Returns matching products with each option's variant_id, price and whether it is in stock. Use the variant_id with start_checkout. Never invent products or prices: only offer what this returns.",
      request_definition: {
        method: "GET",
        path: "/shop/products",
        query_parameters: {
          q: {
            type: "string",
            description: "What to search for; leave empty to list bestsellers",
            required: false,
          },
        },
      },
      user_auth_required: false,
    },
  },
  start_checkout: {
    group: "commerce",
    definition: {
      name: "start_checkout",
      description:
        "Put chosen products in a cart for the customer you are talking to and get a secure checkout link where they add their address, apply points or a coupon, and pay. Send the link in your reply with the total. Only use variant_ids from search_products.",
      request_definition: {
        method: "POST",
        path: "/shop/checkout",
        body: {
          content_type: "application/json",
          params: {
            phone: {
              type: "string",
              description: "The customer's WhatsApp number",
              binding: { kind: "macro", macro: "WHATSAPP_PHONE_NUMBER" },
            },
            items: {
              type: "array",
              description: "What the customer wants to buy",
              items: {
                type: "object",
                properties: {
                  variant_id: { type: "string", description: "A variant_id from search_products" },
                  quantity: { type: "integer", description: "How many, 1 or more" },
                },
                required: ["variant_id", "quantity"],
              },
            },
            coupon_code: { type: "string", description: "A coupon code the customer gave, if any" },
          },
          required: ["phone", "items"],
        },
      },
      user_auth_required: false,
    },
  },
  get_order_status: {
    group: "commerce",
    definition: {
      name: "get_order_status",
      description:
        "Look up the recent orders of the customer you are talking to: what they ordered, whether it is paid, where it is (packed, shipped, delivered) and the tracking link. Call it whenever they ask where their order is.",
      request_definition: {
        method: "GET",
        path: "/shop/orders",
        query_parameters: { phone: customerPhone },
      },
      user_auth_required: false,
    },
  },
  notify_when_back_in_stock: {
    group: "commerce",
    definition: {
      name: "notify_when_back_in_stock",
      description:
        "When something the customer wants is sold out, sign them up to get a WhatsApp message as soon as it is back. Use the sold-out variant_id from search_products.",
      request_definition: {
        method: "POST",
        path: "/shop/back-in-stock",
        body: {
          content_type: "application/json",
          params: {
            phone: {
              type: "string",
              description: "The customer's WhatsApp number",
              binding: { kind: "macro", macro: "WHATSAPP_PHONE_NUMBER" },
            },
            variant_id: { type: "string", description: "The sold-out variant_id" },
          },
          required: ["phone", "variant_id"],
        },
      },
      user_auth_required: false,
    },
  },
} satisfies Record<string, RateupTool>;

export type RateupToolName = keyof typeof RATEUP_TOOLS;
export const RATEUP_TOOL_NAMES = Object.keys(RATEUP_TOOLS) as RateupToolName[];

/** The CRM actions take names only get_crm_options tells the agent. */
const CRM_WRITES: RateupToolName[] = ["add_contact_label", "set_lead_stage", "assign_to_team"];

export const installRateupConnectorBodySchema = z.object({
  tools: z
    .array(z.enum(RATEUP_TOOL_NAMES as [RateupToolName, ...RateupToolName[]]))
    .min(1, "Choose at least one tool")
    // Duplicates would create the same tool twice at Meta. The options lookup
    // is never offered on its own: it comes with any CRM action, which cannot
    // work without it.
    .transform((tools) => {
      const chosen = new Set(tools);
      if (tools.some((tool) => CRM_WRITES.includes(tool))) chosen.add("get_crm_options");
      return [...chosen];
    }),
});
export type InstallRateupConnectorBody = z.infer<typeof installRateupConnectorBodySchema>;

/** Where Meta reaches this agent's tools. Meta only calls https. */
function toolsBaseUrl(agentRowId: string) {
  const base = (process.env.API_URL ?? "").replace(/\/+$/, "");
  if (!base.startsWith("https://")) {
    throw new MetaAgentValidationError(
      "The RateUp connector needs the API to be reachable over https (API_URL), so it cannot be installed from here.",
    );
  }
  return `${base}/api/public/meta-agent-tools/${agentRowId}`;
}

async function findBuiltIn(agentRowId: string) {
  return prisma.metaAgentConnector.findFirst({
    where: { agentId: agentRowId, builtIn: RATEUP_BUILT_IN },
  });
}

export async function getRateupConnector(orgId: string, whatsappSettingsId: string) {
  const agent = await getAgentRecord(orgId, whatsappSettingsId);
  const connector = agent ? await findBuiltIn(agent.id) : null;
  if (!connector) return { installed: false as const, tools: [] as string[] };
  const tools = await prisma.metaAgentConnectorTool.findMany({
    where: { connectorId: connector.id },
    select: { name: true },
  });
  return {
    installed: true as const,
    connectorId: connector.id,
    connectionStatus: connector.connectionStatus,
    tools: tools.map((tool) => tool.name),
  };
}

/**
 * Installs (or reinstalls) the connector with the chosen tools. A reinstall
 * starts from nothing: the old connector goes, and a new key is issued, so a
 * leaked key stops working the moment someone presses the button.
 */
export async function installRateupConnector(
  orgId: string,
  whatsappSettingsId: string,
  toolNames: RateupToolName[],
) {
  const agent = await getAgentRecord(orgId, whatsappSettingsId);
  if (!agent?.agentId) {
    throw new MetaAgentValidationError("Create the agent before installing the RateUp connector");
  }
  const baseUrl = toolsBaseUrl(agent.id);

  const previous = await findBuiltIn(agent.id);
  if (previous) await deleteConnector(orgId, whatsappSettingsId, previous.id);

  const { key, hash } = await generateApiKey();
  await prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: { rateupToolsKeyHash: hash },
  });

  // The key goes with the create: Meta refuses an API_KEY connector without one.
  const connector = await createConnector(orgId, whatsappSettingsId, {
    name: "RateUp",
    description:
      "The business's own RateUp account: the customer's loyalty points and rewards, and the labels, lead stages and teams the business organises conversations with.",
    base_url: baseUrl,
    auth_type: "API_KEY",
    auth_config: {
      api_key: { headers: [{ field_name: "Authorization", prefix: "Bearer ", value: key }] },
    },
  });

  try {
    for (const name of toolNames) {
      await createConnectorTool(
        orgId,
        whatsappSettingsId,
        connector.id,
        RATEUP_TOOLS[name].definition,
      );
    }
  } catch (error) {
    // Half an install is worse than none: the agent would see tools that fail.
    try {
      await deleteConnector(orgId, whatsappSettingsId, connector.id);
    } catch {
      // Best effort: the key is revoked below either way, so a leftover fails closed.
    }
    await prisma.metaBusinessAgent.update({
      where: { id: agent.id },
      data: { rateupToolsKeyHash: null },
    });
    throw error;
  }

  // Marked last, so the hand-edit guards do not stop the install itself.
  await prisma.metaAgentConnector.update({
    where: { id: connector.id },
    data: { builtIn: RATEUP_BUILT_IN },
  });
  return getRateupConnector(orgId, whatsappSettingsId);
}

export async function uninstallRateupConnector(orgId: string, whatsappSettingsId: string) {
  const agent = await getAgentRecord(orgId, whatsappSettingsId);
  if (!agent) return getRateupConnector(orgId, whatsappSettingsId);
  const connector = await findBuiltIn(agent.id);
  if (connector) await deleteConnector(orgId, whatsappSettingsId, connector.id);
  // Without the hash the tool endpoints refuse every call, whatever Meta still holds.
  await prisma.metaBusinessAgent.update({
    where: { id: agent.id },
    data: { rateupToolsKeyHash: null },
  });
  return getRateupConnector(orgId, whatsappSettingsId);
}
