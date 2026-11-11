//CONSTANTS
import "dotenv/config";
import { trimTrailingSlash, webImageUrl } from "../url.js";

export const API_URL = trimTrailingSlash(process.env.API_URL) || "http://localhost:3001";
export const FRONTEND_URL = trimTrailingSlash(process.env.FRONTEND_URL) || "http://localhost:3000";
export const statsPage = `${FRONTEND_URL}/dashboard/settings/billing`;
export const billingPage = `${FRONTEND_URL}/dashboard/settings/billing`;
export const ordersPage = `${FRONTEND_URL}/dashboard/settings/billing#order-history`;

export const BATCH_SIZE = 30000; // Keep it below the database limit

export const DEFAULT_JOIN_MESSAGE_TEMPLATE = [
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "🎉 Welcome {{1}}!\nYou are now registered in our Loyalty Program.\n🔗 Your referral code: {{2}}\nShare & earn rewards",
      },
    ],
  },
];

export const rateupLogo = webImageUrl("images/rateup.png");

export function webImagesBaseUrl(): string {
  return trimTrailingSlash(process.env.WEB_IMAGES_CDN_URL);
}
