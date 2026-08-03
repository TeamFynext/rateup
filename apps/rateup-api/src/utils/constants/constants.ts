//CONSTANTS
export const statsPage = `${process.env.FRONTEND_URL}/dashboard/settings/billing`;
export const billingPage = `${process.env.FRONTEND_URL}/dashboard/settings/billing`;
export const ordersPage = `${process.env.FRONTEND_URL}/dashboard/settings/billing#order-history`;

export const API_URL = process.env.API_URL || "http://localhost:3001";
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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

export const rateupLogo = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-stacked-white-transparent.png`;

export function webImagesBaseUrl(): string {
  return process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL?.replace(/\/+$/, "") ?? "";
}
