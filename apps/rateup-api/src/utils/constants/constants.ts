//CONSTANTS
export const statsPage = `${process.env.FRONTEND_URL}/dashboard/settings/billing`;
export const billingPage = `${process.env.FRONTEND_URL}/dashboard/settings/billing`;
export const ordersPage = `${process.env.FRONTEND_URL}/dashboard/settings/billing#order-history`;

export const API_URL = process.env.API_URL || "http://localhost:3001";
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export const BATCH_SIZE = 30000; // Keep it below the database limit
