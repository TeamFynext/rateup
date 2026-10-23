import type { Permission } from "./permissions.js";

/**
 * What an API key can be limited to: the partner API's own feature areas, not the
 * dashboard's permission catalogue. Each feature is the set of permissions its external
 * routes declare (src/external/v1, src/external/v2), so a key that has a feature can call
 * every endpoint in it and nothing else. Keys still store and are checked on permissions;
 * features are only how a key's access is chosen and shown.
 *
 * Adding an external route that needs a permission not listed here means adding it to the
 * feature it belongs to — apiKeyFeatures.test.ts fails until every route's permission is
 * covered by some feature.
 */
export const API_KEY_FEATURES = {
  contacts: ["contacts.read", "contacts.manage"],
  teams: ["teams.read"],
  campaigns: ["campaigns.read", "campaigns.manage", "campaigns.send"],
  surveys: ["surveys.read"],
  whatsapp: ["templates.read", "inbox.read", "inbox.reply"],
  loyalty: ["loyalty.read", "loyalty.cashier"],
  /**
   * The embedded support widget: its socket and `/api/support/*`. Not a partner API route —
   * the widget's key is in the customer's page source, so a key holding only this opens
   * nothing else.
   */
  widget: ["widget.connect"],
} as const satisfies Record<string, readonly Permission[]>;

export type ApiKeyFeature = keyof typeof API_KEY_FEATURES;

export const API_KEY_FEATURE_NAMES = Object.keys(API_KEY_FEATURES) as [
  ApiKeyFeature,
  ...ApiKeyFeature[],
];

/** The permissions a key limited to `features` holds. */
export function permissionsForFeatures(features: readonly ApiKeyFeature[]): Permission[] {
  return [...new Set(features.flatMap((f) => API_KEY_FEATURES[f]))];
}

/**
 * The features a stored scope list fully covers. Empty scopes is a full-access key, which
 * covers every feature. A key scoped by permission before features existed may hold only part
 * of one; that feature is not listed, and the console shows the key as custom.
 */
export function featuresForScopes(scopes: readonly string[]): ApiKeyFeature[] {
  if (scopes.length === 0) return [...API_KEY_FEATURE_NAMES];
  const held = new Set(scopes);
  return API_KEY_FEATURE_NAMES.filter((f) => API_KEY_FEATURES[f].every((p) => held.has(p)));
}

/**
 * Whether a key may run the support widget: full access (empty scopes, every key from
 * before features) or one carrying the widget feature.
 */
export function scopesAllowWidget(scopes: readonly string[]): boolean {
  return scopes.length === 0 || scopes.includes("widget.connect");
}

/** Why the widget refused a key that is valid but limited to other features. */
export const WIDGET_KEY_REFUSED =
  "This API key cannot run the webchat widget. Use a key with the Webchat widget feature " +
  "(Settings › Integrations › Widget › Create widget key), or a full-access key.";

/** Why the widget refused a key it could not find: missing, revoked, or not an `rk_` key. */
export const WIDGET_KEY_INVALID =
  "Invalid widget key. Use a key from Settings › Integrations › Widget › Create widget key " +
  "(it starts with rk_).";
