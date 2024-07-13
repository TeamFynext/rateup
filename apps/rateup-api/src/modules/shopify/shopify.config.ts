import "@shopify/shopify-api/adapters/node";
import { ApiVersion, LogSeverity, shopifyApi } from "@shopify/shopify-api";
import webhookHandlers from "./shopify.handler";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-04";
import { envConstants } from "../../utils/constants/constants";

const apiUrl = new URL(envConstants.API_URL);

const shopify = shopifyApi({
  apiKey: envConstants.SHOPIFY_API_KEY,
  apiSecretKey: envConstants.SHOPIFY_API_SECRET,
  scopes: envConstants.SHOPIFY_SCOPES.split(","),
  hostName: apiUrl.hostname,
  hostScheme: "https",
  apiVersion: ApiVersion.April24,
  restResources,
  isEmbeddedApp: false,
  future: {
    customerAddressDefaultFix: true,
    lineItemBilling: true,
  },
  logger: {
    level: LogSeverity.Debug,
    timestamps: true,
    httpRequests: true,
  },
});

shopify.webhooks.addHandlers(webhookHandlers);

export default shopify;
