export const QR_LINKS_PATHS = {
  qrCodes: "/dashboard/qr-codes",
  qrCode: "/dashboard/qr-codes/$shortUrlId",
  linkPages: "/dashboard/link-pages",
  linkPage: "/dashboard/link-pages/$shortUrlId",
} as const;

/** The printed URLs. Codes already in the wild point here, so these never change. */
export function qrShortUrl(shortUrlId: string) {
  return `${import.meta.env.VITE_FRONTEND_URL}/qr/${shortUrlId}`;
}

export function linkPageUrl(shortUrlId: string) {
  return `${import.meta.env.VITE_FRONTEND_URL}/lt/${shortUrlId}`;
}
