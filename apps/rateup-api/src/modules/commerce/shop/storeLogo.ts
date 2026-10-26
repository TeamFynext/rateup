/**
 * A store logo as a link a browser can load. Stores created from the org's logo saved its
 * S3 key (what Org.logo holds) rather than a URL, so a bare key is resolved through CloudFront.
 */
export function storeLogoUrl(logo: string | null | undefined): string | null {
  if (!logo) return null;
  if (/^https?:\/\//i.test(logo)) return logo;
  const domain = process.env.AWS_CLOUDFRONT_DOMAIN;
  return domain ? `https://${domain}/${logo.replace(/^\//, "")}` : null;
}
