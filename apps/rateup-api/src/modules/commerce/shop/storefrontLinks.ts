import { FRONTEND_URL } from "../../../utils/constants/constants.js";

/**
 * A product's address on the storefront: its title for people and search engines, then the
 * start of its id, which is what the page looks it up by. Mirrors `productHandle` in
 * rateup-ui's storefrontSeo.ts, so links built here never land on a redirect.
 */
export function productHandle(product: { id: string; title: string }) {
  const words = product.title
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  const key = product.id.replace(/-/g, "").slice(0, 8);
  return words ? `${words}-${key}` : key;
}

export const storefrontProductUrl = (slug: string, product: { id: string; title: string }) =>
  `${FRONTEND_URL}/s/${slug}/p/${encodeURIComponent(productHandle(product))}`;
