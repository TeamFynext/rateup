import { imagesPath } from "@/utils/constants.ts";

/**
 * Client logos shown in the "trusted by" strips across the product pages.
 * The files still sit under the `ticketing/` prefix on the image CDN — that is
 * where they were first uploaded, and the path is unrelated to the retired
 * ticketing product.
 */
export const clientIcons = Array.from(
  { length: 16 },
  (_, i) => `${imagesPath}/ticketing/icons/${i + 1}.png`,
);
