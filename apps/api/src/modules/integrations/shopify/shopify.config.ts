import "@shopify/shopify-api/adapters/node";
import { ApiVersion, LogSeverity, shopifyApi } from "@shopify/shopify-api";
import { API_URL } from "../../../utils/constants/constants.js";

const apiUrl = new URL(API_URL);
const protocol = apiUrl.protocol.replace(":", "");

function initializeShopify() {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecretKey = process.env.SHOPIFY_API_SECRET;
  const scopes = process.env.SHOPIFY_SCOPES;
  if (!apiKey || !apiSecretKey || !scopes) {
    return;
  }

  return shopifyApi({
    apiKey,
    apiSecretKey,
    scopes: scopes.split(","),
    hostName: protocol == "http" ? "localhost:3001" : apiUrl.hostname,
    hostScheme: protocol as "http" | "https",
    // Keep in step with [webhooks] api_version in shopify.app.toml. Shopify
    // supports each version for 12 months, then silently serves the oldest
    // supported one instead.
    apiVersion: ApiVersion.July26,
    isEmbeddedApp: false,
    // Warnings and errors only: Debug/Info log every OAuth redirect and session
    // creation, plus the startup banner.
    logger: {
      level: LogSeverity.Warning,
      timestamps: true,
    },
    // The flags it would list only affect REST resources and managed pricing,
    // neither of which this app uses.
    _logDisabledFutureFlags: false,
  });
}

const shopify = initializeShopify();

export default shopify;
