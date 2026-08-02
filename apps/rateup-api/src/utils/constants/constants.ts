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

/**
 * The host serving the images embedded in outbound email, or "" when it is not
 * configured on this instance.
 *
 * The variable is named for Next.js because the frontend owns the same value and
 * the API reads it too; renaming it is an environment-wide change and a dozen
 * files read it directly, so the name stays. What is fixed here is the rendering:
 * interpolating it unchecked wrote a src of "undefined/images/…" into the email.
 * Callers should omit the image when this is empty rather than emit a broken one.
 *
 * A function, not a constant, so it reads the environment at the point of use —
 * dotenv and the test suite both set it after this module is first imported.
 * See issues.txt 16.5.
 */
export function webImagesBaseUrl(): string {
  return process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL?.replace(/\/+$/, "") ?? "";
}
