import type { IncomingMessage, ServerResponse } from "http";
import type { Session } from "@shopify/shopify-api";
import type { FastifyReply, FastifyRequest } from "fastify";

import { IntegratedApps } from "../../../types/enums.js";
import { createIntegration } from "../integrations.service.js";
import shopify from "./shopify.config.js";
import {
  getShopifyIntegrationByShop,
  updateShopifyIntegrationByOrgId,
} from "./shopify.credential.js";
import { saveShopifySession, toStoredSession } from "./shopify.session.js";

/**
 * Shopify's connect flow starts in Shopify, not in RateUp: the merchant installs
 * the app, Shopify calls `/api/public/integrations/shopify/auth`, and the
 * callback saves the shop with no org. The merchant's RateUp login then claims
 * it (`PUT /integrations/shopify/session/:shop`). That is why Shopify keeps its
 * own routes rather than the shared OAuth flow, which signs the org into the
 * state before the consent screen. Both URLs are registered with Shopify.
 */
export async function getShopifyAuthUrl(
  rawRequest: IncomingMessage,
  rawResponse: ServerResponse,
  shop: string,
) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  // sanitizeShop(shop, true) throws on an invalid shop domain (throwOnInvalid),
  // so a null return here only ever means "somehow returned without throwing" —
  // still worth a real guard rather than a non-null assertion.
  const sanitizedShop = shopify.utils.sanitizeShop(shop, true);
  if (!sanitizedShop) throw new Error(`Invalid Shopify shop domain: ${shop}`);
  return await shopify.auth.begin({
    shop: sanitizedShop,
    callbackPath: "/api/public/integrations/shopify/auth/callback",
    isOnline: false,
    rawRequest,
    rawResponse,
  });
}

export async function handleShopifyAuthCallback(request: FastifyRequest, reply: FastifyReply) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  return await shopify.auth.callback({
    // Public apps must use expiring offline tokens from 2027-01-01.
    expiring: true,
    rawRequest: request.raw,
    rawResponse: reply.raw,
  });
}

/**
 * Saves the session an install produced. A shop already claimed by an org is
 * reactivated in place; anything else becomes a new row with no org, waiting to
 * be claimed.
 */
export async function connectShopify(session: Session) {
  const credential = {
    session: toStoredSession(session),
    isWebhookRegistered: false,
    // A freshly connected shop has no surveys configured yet.
    shopifySurveys: [] as ShopifySurvey[],
  };
  const existing = await getShopifyIntegrationByShop(session.shop);
  if (existing?.orgId) {
    await updateShopifyIntegrationByOrgId(existing.orgId, { credential, active: true });
    // The credential update above never touches the session; only this does.
    await saveShopifySession(existing.id, session);
  } else {
    await createIntegration({ name: IntegratedApps.shopify, credential });
  }
  // app/uninstalled and app/subscriptions_update are app-level subscriptions
  // in shopify.app.toml, so nothing is registered per shop here.
}
