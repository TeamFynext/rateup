//CONSTANTS
export const statsPage = `${process.env.FRONTEND_URL}/dashboard/settings?activeTab=account&view=stats`;
export const billingPage = `${process.env.FRONTEND_URL}/dashboard/settings?activeTab=account&view=billing`;
export const ordersPage = `${process.env.FRONTEND_URL}/dashboard/settings?activeTab=account&view=myOrders`;

export const envConstants = {
  API_URL: process.env.API_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
  SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES,
};
