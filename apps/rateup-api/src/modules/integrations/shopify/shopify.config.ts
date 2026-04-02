import "@shopify/shopify-api/adapters/node";
import { ApiVersion, LogSeverity, shopifyApi } from "@shopify/shopify-api";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";
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
    apiVersion: ApiVersion.October24,
    restResources,
    isEmbeddedApp: false,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
    },
    logger: {
      level: LogSeverity.Debug,
      timestamps: true,
    },
  });
}

const shopify = initializeShopify();

export default shopify;
