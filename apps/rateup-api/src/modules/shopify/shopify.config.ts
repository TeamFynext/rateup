import "@shopify/shopify-api/adapters/node";
import {
  ApiVersion,
  LogSeverity,
  Session,
  SessionParams,
  shopifyApi,
} from "@shopify/shopify-api";
import { getShopifyAuthUrl, getShopifySession } from "./shopify.service";
import webhookHandlers from "./shopify.handler";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-04";

const shopify = shopifyApi({
  // The next 4 values are typically read from environment variables for added security
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY,
  scopes: [
    "read_products",
    "read_cart_transforms",
    "read_checkouts",
    "read_orders",
    "read_draft_orders",
    "read_fulfillments",
    "write_customers",
    "read_customers",
    "unauthenticated_read_customers",
    "unauthenticated_write_customers",
  ],
  hostName: "d754-103-153-105-63.ngrok-free.app",
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

export async function checkShopifySession(request, reply) {
  try {
    const { shop } = request.query;
    //getShopifysession from table with orgId and shop name
    let session: SessionParams = await getShopifySession(shop);
    if (!session)
      if (!shopify.config.scopes.equals(session.scope)) {
        // Scopes have changed, the app should redirect the merchant to OAuth
        // await getShopifyAuthUrl(request, reply)
      }
    //attach rest or graphql client to request object here

    // const client = new shopify.clients.Rest({session});
    //request.shopifyRestClient = client
  } catch (e) {
    console.error("error checking shopify session");
    console.error(e);
    reply.code(500).send(e);
  }
}

export default shopify;
