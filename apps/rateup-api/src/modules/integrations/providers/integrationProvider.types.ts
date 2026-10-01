import type { FastifyRequest } from "fastify";

import type { Integration } from "../../../../generated/prisma/client.js";
import type { IntegratedApps } from "../../../types/enums.js";
import type { IntegrationEvent, IntegrationEventType } from "../events/integrationEvent.types.js";
import type { OAuth2Config, OAuth2Tokens } from "../shared/oauth2.js";

/**
 * Every provider in the registry. Mostly `IntegratedApps` — the names stored on
 * `Integration` rows — plus the outgoing Webhook, which has its own table.
 */
export type IntegrationProviderName = IntegratedApps | "webhook";

/**
 * A provider job on `integrationTriggerQueue`: one call to one provider's API,
 * enqueued by that provider's `handleEvent` and run by its `processJob`.
 *
 * `data` is whatever the provider's own `handleEvent` put there; the provider
 * narrows it in `processJob`, since only it knows the shape.
 */
export interface ProviderJobData<TData = unknown> {
  integrationName: string;
  triggerKey: string;
  orgId: string;
  data: TData;
  rateupContactId?: string;
  rateupLeadId?: string;
}

export interface IntegrationEventContext {
  orgId: string;
  /** The org's active row for this provider; `null` for a `self`-gated provider. */
  integration: Integration | null;
}

/**
 * One integration, as the rest of Rateup sees it. Adding a provider means
 * writing one of these in the provider's directory and listing it in
 * `registry.ts` — nothing in the contact, lead or dispatch code changes.
 */
export interface IntegrationProvider {
  name: IntegrationProviderName;
  /** How the provider is named to people — in notifications and the timeline. */
  label: string;
  /** How an org connects it. Read by the shared connect UI (Phase 0.5). */
  auth: "oauth2" | "apiKey" | "custom";
  /**
   * `integration`: needs an active `Integration` row for the org; the fan-out
   * skips it otherwise and hands the row to every hook.
   * `self`: decides for itself — Zapier checks its hook subscriptions, the
   * outgoing Webhook reads its own settings row.
   */
  connection: "integration" | "self";
  /** Every event this provider can act on — the fan-out's cheap first filter. */
  events: readonly IntegrationEventType[];
  /**
   * The events this org has switched on, from its settings. Should err towards
   * including an event: `processJob` still checks each call against the org's
   * finer-grained toggles, so this is only there to skip work nobody wants.
   */
  subscribedEvents(integration: Integration | null): readonly IntegrationEventType[];
  /** Translates an event into this provider's jobs and enqueues them. */
  handleEvent(event: IntegrationEvent, context: IntegrationEventContext): Promise<void>;
  /** Runs one of the jobs `handleEvent` enqueued. Absent for providers that enqueue elsewhere. */
  processJob?(integration: Integration, job: ProviderJobData): Promise<void>;
  /**
   * Provider → Rateup webhooks, delivered to the shared receiver at
   * `inboundWebhookUrl(name, integration.id)`. Verify the signature against the
   * integration's own secret (throw `InboundWebhookRejected` if it fails), then
   * enqueue the work and return, so the provider gets its 200 quickly.
   */
  handleInbound?(integration: Integration, request: FastifyRequest): Promise<void>;
  /**
   * Keeps the credential alive — an OAuth refresh, plus anything renewed with
   * it. Called for every active integration by the shared refresh cron
   * (`credentialRefresh.ts`); saving the new credential is up to the provider.
   */
  refreshCredential?(integration: Integration): Promise<void>;
  /** Unregisters anything set up remotely. Called, best-effort, before the row is deleted. */
  disconnect?(integration: Integration): Promise<void>;
  /**
   * The consent-screen connect, for `auth: "oauth2"` providers. With this set,
   * the shared routes (`oauth.route.ts`) build the authorize URL and exchange the
   * code; the provider only says where to send the user and what to keep.
   */
  oauth?: ProviderOAuth;
  /**
   * The pasted-key connect, for `auth: "apiKey"` providers. With this set, the
   * shared route (`POST /:name/connect`) hands it the form's fields.
   */
  apiKey?: ProviderApiKey;
}

export interface ProviderApiKey {
  /**
   * Checks the fields against the provider and saves the connection. Validate
   * the fields here — the route only knows they are strings — and throw
   * `IntegrationConnectError` for a refusal the user should read. What it
   * returns is sent back to the settings page.
   */
  connect(orgId: string, fields: Readonly<Record<string, string>>): Promise<unknown>;
}

export interface ProviderOAuth {
  config: OAuth2Config;
  scopes: readonly string[];
  /**
   * Scopes that depend on a choice made before connecting — Zoho's CRM / Bigin
   * picker. Given the authorize-url's query; throw `OAuthConnectError` (400) for
   * a choice it does not know. Without it, `scopes` is always asked for.
   */
  scopesFor?(options: Readonly<Record<string, string>>): readonly string[];
  scopeSeparator?: string;
  extraAuthorizeParams?: Record<string, string>;
  /**
   * Saves the connection from freshly exchanged tokens: creates or updates the
   * org's `Integration` row and sets up anything remote (webhooks). Throw to
   * fail the connect; the user sees it on the callback page.
   */
  connect(orgId: string, tokens: OAuth2Tokens): Promise<void>;
}
