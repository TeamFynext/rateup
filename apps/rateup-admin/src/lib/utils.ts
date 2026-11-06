import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Whether the console may show an image from this address. The CSP (public/_headers) is
 * `img-src 'self' data:`: the console loads nothing from anyone else's servers, so a
 * Google profile photo or an org logo on CloudFront is never requested; the avatar shows
 * initials instead. Only a path on this origin or an inline data: image qualifies.
 */
export function isOwnImage(src: string | null | undefined): src is string {
  if (!src) return false;
  return src.startsWith("data:image/") || (src.startsWith("/") && !src.startsWith("//"));
}
