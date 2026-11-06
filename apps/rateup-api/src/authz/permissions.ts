/**
 * The permission catalogue. A key names one capability as `resource.action` and never a
 * role; roles are bundles of these keys (roles.ts). Clients read an actor's list from
 * `GET /api/user/info`, and rateup-ui keeps a typed mirror that must match this list.
 */
export const PERMISSIONS = [
  "inbox.read",
  "inbox.reply",
  "inbox.assign",
  "inbox.manage",
  "inbox.delete",
  "inbox.export",
  "contacts.read",
  "contacts.manage",
  "contacts.export",
  "contacts.merge",
  "campaigns.read",
  "campaigns.manage",
  "campaigns.send",
  "surveys.read",
  "surveys.manage",
  "responses.manage",
  "flows.read",
  "flows.manage",
  "templates.read",
  "templates.manage",
  "templates.sync",
  "automation.read",
  "automation.manage",
  "chatbots.read",
  "chatbots.manage",
  "meta_agent.read",
  "meta_agent.use",
  "meta_agent.manage",
  "catalog.manage",
  "commerce.read",
  "commerce.sell",
  "commerce.orders.manage",
  "commerce.products.manage",
  "commerce.discounts.manage",
  "commerce.payments.manage",
  "commerce.storefront.manage",
  "pipelines.read",
  "pipelines.manage",
  "pipelines.admin",
  "analytics.read",
  "loyalty.read",
  "loyalty.cashier",
  "loyalty.approve",
  "loyalty.manage",
  "loyalty.api_settings",
  "loyalty.accounts.export",
  "loyalty.accounts.delete",
  "members.read",
  "members.invite",
  "members.manage",
  "members.manage_roles",
  "teams.read",
  "teams.manage",
  "teams.manage_members",
  "channels.read",
  "channels.manage",
  "integrations.read",
  "integrations.manage",
  "integrations.shopify",
  "webhooks.read",
  "webhooks.manage",
  "api_tokens.read",
  "api_tokens.manage",
  "org.settings",
  "org.webhook_secret",
  "org.audit.read",
  "billing.read",
  "billing.manage",
  "org.delete",
  "org.transfer_ownership",
  "notify.billing",
  "notify.integrations",
  "widget.connect",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ALL_PERMISSIONS: ReadonlySet<Permission> = new Set(PERMISSIONS);

/**
 * Permissions only an API key holds. `widget.connect` lets the embedded support widget open
 * its socket and post to `/api/support/*`; it means nothing for a signed-in member, so no role
 * bundles it and no member can be granted it (overrides.ts drops it).
 */
export const KEY_ONLY_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "widget.connect",
]);

/** Everything a dashboard member can hold: the catalogue less the key-only permissions. */
export const MEMBER_PERMISSIONS: ReadonlySet<Permission> = new Set(
  PERMISSIONS.filter((p) => !KEY_ONLY_PERMISSIONS.has(p)),
);

/**
 * Bumped whenever the catalogue or a role's bundle changes, so a client holding a stale
 * mirror can tell and fall back to deriving permissions from the role key.
 */
export const PERMISSIONS_VERSION = 4;

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as ReadonlySet<string>).has(value);
}
