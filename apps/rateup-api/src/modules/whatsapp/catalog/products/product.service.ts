import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { getWaSettings } from "../../settings/wa_settings.service.js";
import { callMetaApi } from "../../wa_axios.js";
import { getWaCatalog } from "../catalog.service.js";
import { getShopifyInfo } from "../../../integrations/shopify/shopify.service.js";
import shopify from "../../../integrations/shopify/shopify.config.js";
import { Prisma } from "../../../../../generated/prisma/client.js";
import type { GraphQLClientResponse } from "@shopify/shopify-api";
import {
  catalogHotel,
  catalogHotelRoom,
  CatalogHotelInput,
  CatalogHotelRoomInput,
  CatalogItemQueryFilter,
  catalogItemSchema,
  catalogProductCore,
  CatalogProductCoreInput,
  CatalogProductIdsSchema,
  catalogProductResponseSchema,
  CatalogProductTypes,
  CatalogResponseInput,
} from "./product.schema.js";

/**
 * Item as accepted by `createCatalogProductsBatch`. `shopifyVariantId` isn't
 * part of any of the wire schemas — it's a service-level tag added when
 * importing Shopify-sourced items (see `importSelectedShopifyProducts`) so
 * the stored row can be traced back to its Shopify variant.
 */
type CatalogBatchItem =
  | (CatalogProductCoreInput & { shopifyVariantId?: string })
  | (CatalogHotelInput & { shopifyVariantId?: string })
  | (CatalogHotelRoomInput & { shopifyVariantId?: string });

/** Same as `CatalogBatchItem`, but every field is optional (an update need not touch every field). */
type CatalogBatchUpdateItem =
  | (Partial<CatalogProductCoreInput> & { shopifyVariantId?: string })
  | (Partial<CatalogHotelInput> & { shopifyVariantId?: string })
  | (Partial<CatalogHotelRoomInput> & { shopifyVariantId?: string });

/**
 * The Meta Graph API "batch item" payload built from a `CatalogBatchItem`.
 * `id`/`hotel_id`/`hotel_retailer_id`/`hotel_room_id` are the only fields read
 * back out of it (to derive the Prisma row's identifying columns); the
 * remaining, per-vertical fields are already fully validated by the zod
 * schema upstream and are only ever forwarded to Meta or stashed in a Prisma
 * `Json` column, so a catch-all index signature is the accurate type for them.
 */
type CatalogBatchPayload = {
  id?: string;
  hotel_id?: string;
  hotel_retailer_id?: string;
  hotel_room_id?: string;
} & Record<string, unknown>;

/** Intermediate row shape built by `updateCatalogProducts` before it is split into per-vertical Prisma updates. */
type CatalogUpdateProductRow = {
  type: catalogItemSchema["type"];
  retailer_id?: string;
  hotel_id?: string;
  hotel_retailer_id?: string;
  hotel_room_id?: string;
  currency?: string;
  image_link?: string;
  additional_image_link?: string[];
} & Record<string, unknown>;

export async function createCatalogProductsBatch(
  orgId: string,
  type: catalogItemSchema["type"],
  dataList: CatalogBatchItem[],
  catalogId: string,
) {
  const requests: SendProductRequestProps[] = [];
  const newProducts: Prisma.WaCatalogProductCreateManyInput[] = [];
  for (const data of dataList) {
    let input: CatalogBatchPayload | undefined;
    const shopifyVariantId: string | undefined = data.shopifyVariantId ?? undefined;
    if (type === "PRODUCT_ITEM") {
      const {
        price,
        currencyCode,
        internal_label,
        sale_price,
        retailer_id,
        shopifyVariantId: _svid, // strip from Meta payload
        ...rest
      } = data as CatalogProductCoreInput & {
        shopifyVariantId?: string;
      };
      input = {
        ...rest,
        id: retailer_id,
        price: `${parseFloat(String(price)).toFixed(2)} ${currencyCode}`,
        sale_price: `${sale_price} ${currencyCode}`,
        internal_label: (internal_label ?? []).map((label) => `'${label}'`),
      };
    }
    if (type === "HOTEL") {
      const { base_price, currencyCode, tags, numbertags, sale_price, ...rest } =
        data as CatalogHotelInput;
      const tagInputs: Record<string, string | number> = {};
      tags.map((tag, index) => {
        tagInputs[`custom_label_${index}`] = tag;
      });
      numbertags.map((tag, index) => {
        tagInputs[`custom_number_${index}`] = tag;
      });
      input = {
        ...rest,
        base_price: `${base_price} ${currencyCode}`,
        sale_price: `${sale_price} ${currencyCode}`,
        ...tagInputs,
      };
    }
    if (type === "HOTEL_ROOM") {
      const { base_price, currencyCode, ...rest } = data as CatalogHotelRoomInput;
      input = {
        ...rest,
        base_price: `${base_price} ${currencyCode}`,
      };
    }
    // `type` may in principle be any CatalogProductTypes member (FLIGHT,
    // DESTINATION, HOME_LISTING, VEHICLE), none of which are handled above —
    // previously `input` silently stayed `undefined` and the code below threw
    // a confusing "Cannot destructure property 'id' of undefined". Fail with
    // a clear message instead. See issues.txt.
    if (!input) {
      throw new Error(`Unsupported catalog product type: ${type}`);
    }
    requests.push({ method: "CREATE", data: input });
    const { id, hotel_id, hotel_retailer_id, hotel_room_id, ...rest } = input;
    const props = {
      currency: data.currencyCode,
      image_link: data.image?.length ? data.image[0].url : undefined,
      additional_image_link: data.image?.length ? data.image.map((image) => image.url) : undefined,
      ...rest,
    };
    newProducts.push({
      type,
      retailer_id: id ?? undefined,
      hotel_id,
      // DB column is `hotel_ratailer_id` (a pre-existing typo baked into the
      // Prisma schema); the DTO/API field is correctly spelled
      // `hotel_retailer_id`. See issues.txt — BUG (fixed).
      hotel_ratailer_id: hotel_retailer_id,
      hotel_room_id,
      shopifyVariantId: shopifyVariantId ?? undefined,
      ...(type === "PRODUCT_ITEM"
        ? {
            productProps: props,
          }
        : type === "HOTEL"
          ? {
              hotelProps: props,
            }
          : type === "HOTEL_ROOM"
            ? {
                hotelRoomProps: props,
              }
            : {}),
      catalogId,
    });
  }
  await sendProducts(orgId, requests, type, catalogId);

  await prisma.waCatalogProduct.createMany({
    data: newProducts,
    skipDuplicates: true,
  });
}

interface SendProductRequestProps {
  method: "CREATE" | "UPDATE" | "DELETE";
  // Payload sent to Meta's catalog items_batch endpoint. Its shape is fully
  // discriminated by `method`/the batch's `item_type` at each call site and
  // only ever forwarded to Meta as JSON, so a dynamic bag is the accurate
  // type here rather than a fixed interface.
  data: Record<string, unknown>;
}
export async function sendProducts(
  orgId: string,
  requests: SendProductRequestProps[],
  type: catalogItemSchema["type"],
  catalogId: string,
) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) {
    throw new Error(`No WhatsApp settings found for org ${orgId}`);
  }
  const { accessToken } = waSettings;
  const data = {
    access_token: accessToken,
    item_type: type,
    requests,
  };
  const res = await callMetaApi(`/${catalogId}/items_batch`, "POST", null, data, undefined, {
    "Content-Type": "application/json",
  });

  return res.data;
}

export async function syncCatalogProducts(
  orgId: string,
  catalogId: string,
  { limit, next }: CatalogItemQueryFilter,
) {
  const [waSettings, catalogInfo] = await Promise.all([
    getWaSettings(orgId),
    getWaCatalog(catalogId),
  ]);
  if (!waSettings || !catalogInfo) return;
  const { accessToken } = waSettings;
  const url = `/${catalogId}/products`;
  const filter: { limit: number; after?: string } = {
    limit: 50,
  };
  if (limit) {
    filter.limit = limit;
  }
  if (next) {
    filter.after = next;
  }

  const fields = Array.from(
    new Set([
      ...catalogProductResponseSchema.keyof().options,
      ...catalogHotel.keyof().options,
      ...catalogHotelRoom.keyof().options,
      ...catalogProductCore.keyof().options,
    ]),
  ).join(",");

  const params = {
    access_token: accessToken,
    summary: "true",
    fields,
    ...filter,
  };

  const res = await callMetaApi(`${url}`, "GET", null, null, { params });
  if (!res.data?.data) {
    log.warn("No products data returned from Meta for catalog %s", catalogId);
    return;
  }
  const { vertical } = catalogInfo;
  for (const product of res.data.data) {
    if (vertical === "commerce") {
      const existing = await prisma.waCatalogProduct.findUnique({
        where: {
          catalog_retailer_id_unique: {
            retailer_id: product.retailer_id,
            catalogId,
          },
        },
      });
      const { name, image_url, additional_image_urls, retailer_id, id, ...rest } =
        product as CatalogResponseInput;
      const item = {
        title: name,
        additional_image_link: additional_image_urls,
        image_link: image_url,
        ...rest,
      } as unknown as CatalogProductCore;
      if (existing) {
        await prisma.waCatalogProduct.update({
          where: {
            catalog_retailer_id_unique: {
              retailer_id: product.retailer_id,
              catalogId,
            },
          },
          data: {
            productMetaId: id,
            productProps: item,
          },
        });
      } else {
        await prisma.waCatalogProduct.create({
          data: {
            retailer_id,
            type: "PRODUCT_ITEM",
            productMetaId: id,
            productProps: item,
            catalogId,
          },
        });
      }
    }
    if (vertical === "hotels") {
      const existing = await prisma.waCatalogProduct.findUnique({
        where: {
          catalog_hotel_id_unique: {
            hotel_id: product.retailer_id,
            catalogId,
          },
        },
      });
      const { hotel_id, id, ...rest } = product;
      if (existing) {
        await prisma.waCatalogProduct.update({
          where: {
            catalog_retailer_id_unique: {
              retailer_id: product.retailer_id,
              catalogId,
            },
          },
          data: {
            productMetaId: id,
            hotelProps: rest as CatalogHotel,
          },
        });
      } else {
        await prisma.waCatalogProduct.create({
          data: {
            hotel_id,
            type: "HOTEL",
            productMetaId: id,
            hotelProps: rest as CatalogHotel,
            catalogId,
          },
        });
      }
    }
    if (vertical === "hotel_room") {
      const existing = await prisma.waCatalogProduct.findUnique({
        where: {
          catalog_hotel_room_id_unique: {
            hotel_ratailer_id: product.hotel_ratailer_id,
            hotel_room_id: product.hotel_room_id,
            catalogId,
          },
        },
      });
      const { hotel_ratailer_id, hotel_room_id, id, ...rest } = product;
      if (existing) {
        await prisma.waCatalogProduct.update({
          where: {
            catalog_hotel_room_id_unique: {
              hotel_ratailer_id: product.hotel_ratailer_id,
              hotel_room_id: product.hotel_room_id,
              catalogId,
            },
          },
          data: {
            productMetaId: id,
            hotelRoomProps: rest as CatalogHotelRoom,
          },
        });
      } else {
        await prisma.waCatalogProduct.create({
          data: {
            hotel_ratailer_id,
            hotel_room_id,
            type: "HOTEL_ROOM",
            productMetaId: id,
            hotelRoomProps: rest as CatalogHotel,
            catalogId,
          },
        });
      }
    }
  }
  const hasNextPage = !!(res.data.paging && res.data.paging.next);
  return {
    hasNextPage,
    next: hasNextPage ? res.data.paging.cursors.after : null,
  };
}

export async function getCatalogProducts(catalogId: string, _query: unknown = null) {
  return await prisma.waCatalogProduct.findMany({
    where: {
      catalogId,
    },
  });
}

export async function deleteCatalogProducts(
  orgId: string,
  catalogId: string,
  productIds: CatalogProductIdsSchema["productIds"],
) {
  const catalogInfo = await getWaCatalog(catalogId);
  if (!catalogInfo) {
    throw new Error(`Catalog not found for id ${catalogId}`);
  }
  const { vertical } = catalogInfo;

  const requests = productIds.map((id) => {
    let obj = {
      method: "DELETE",
      data: {},
    } as SendProductRequestProps;
    if (vertical === "commerce") {
      obj.data["id"] = id.id;
    }
    if (vertical === "hotels") {
      obj.data["hotel_id"] = id.id;
    }
    if (vertical === "hotel_room") {
      obj.data = {
        hotel_retailer_id: id.hotel_retailer_id,
        hotel_room_id: id,
      };
    }
    return obj;
  });

  const catalogProductType = getCatalogProdutType(vertical);
  if (!catalogProductType) {
    throw new Error(`Unsupported catalog vertical: ${vertical}`);
  }
  await sendProducts(orgId, requests, catalogProductType, catalogId);
  let whereCondition;
  if (vertical === "commerce") {
    whereCondition = {
      retailer_id: {
        in: productIds.map((p) => p.id),
      },
    };
  } else if (vertical === "hotels") {
    whereCondition = {
      hotel_id: {
        in: productIds.map((p) => p.id),
      },
    };
  } else {
    whereCondition = {
      OR: productIds.map((p) => ({
        hotel_ratailer_id: p.hotel_retailer_id,
        hotel_room_id: p.id,
      })),
    };
  }
  if (whereCondition)
    await prisma.waCatalogProduct.deleteMany({
      where: whereCondition,
    });
}

export async function updateCatalogProducts(
  orgId: string,
  catalogId: string,
  dataList: CatalogBatchUpdateItem[],
  type: catalogItemSchema["type"],
) {
  const requests: SendProductRequestProps[] = [];
  const newProducts: CatalogUpdateProductRow[] = [];
  for (const data of dataList) {
    let input: CatalogBatchPayload | undefined;

    if (type === "PRODUCT_ITEM") {
      const { price, currencyCode, internal_label, sale_price, retailer_id, ...rest } =
        data as Partial<CatalogProductCoreInput>;
      input = {
        ...rest,
        id: retailer_id,
        price: `${price} ${currencyCode}`,
        sale_price: `${sale_price} ${currencyCode}`,
        internal_label: internal_label && internal_label.map((label) => `'${label}'`),
      };
    }
    if (type === "HOTEL") {
      const { base_price, currencyCode, tags, numbertags, sale_price, ...rest } =
        data as Partial<CatalogHotelInput>;
      const tagInputs: Record<string, string | number> = {};
      // `tags`/`numbertags` are optional under Partial (an update need not
      // touch them); previously this threw "Cannot read properties of
      // undefined (reading 'map')" whenever an update omitted them. See
      // issues.txt — BUG (fixed).
      (tags ?? []).map((tag, index) => {
        tagInputs[`custom_label_${index}`] = tag;
      });
      (numbertags ?? []).map((tag, index) => {
        tagInputs[`custom_number_${index}`] = tag;
      });
      input = {
        ...rest,
        base_price: `${base_price} ${currencyCode}`,
        sale_price: `${sale_price} ${currencyCode}`,
        ...tagInputs,
      };
    }
    if (type === "HOTEL_ROOM") {
      const { base_price, currencyCode, ...rest } = data as Partial<CatalogHotelRoomInput>;
      input = {
        ...rest,
        base_price: `${base_price} ${currencyCode}`,
      };
    }
    if (!input) {
      throw new Error(`Unsupported catalog product type: ${type}`);
    }
    requests.push({ method: "UPDATE", data: input });
    const { id, hotel_id, hotel_retailer_id, hotel_room_id, ...rest } = input;
    const obj: CatalogUpdateProductRow = {
      type,
      retailer_id: id ?? undefined,
      hotel_id,
      hotel_retailer_id,
      hotel_room_id,
      currency: data.currencyCode,
      image_link: data.image?.length ? data.image[0].url : undefined,
      additional_image_link: data.image?.length ? data.image.map((image) => image.url) : undefined,
      ...rest,
    };
    newProducts.push(obj);
  }
  await sendProducts(orgId, requests, type, catalogId);
  for (const product of newProducts) {
    const { retailer_id, type, hotel_id, hotel_retailer_id, hotel_room_id, ...rest } = product;
    if (type === CatalogProductTypes.PRODUCT_ITEM) {
      // An update payload is a Partial — `retailer_id` (Meta's `id`) could in
      // principle be omitted. It's the only way to locate the row, so fail
      // clearly rather than sending `undefined` into the compound unique
      // filter below (which Prisma would reject with a much less clear
      // error). See issues.txt.
      if (!retailer_id) {
        throw new Error("Cannot update a PRODUCT_ITEM catalog product without a retailer_id");
      }
      await prisma.waCatalogProduct.update({
        where: {
          catalog_retailer_id_unique: {
            catalogId,
            retailer_id,
          },
        },
        data: {
          productProps: rest,
        },
      });
    } else if (type === CatalogProductTypes.HOTEL) {
      if (!hotel_id) {
        throw new Error("Cannot update a HOTEL catalog product without a hotel_id");
      }
      await prisma.waCatalogProduct.update({
        where: {
          catalog_hotel_id_unique: {
            catalogId,
            hotel_id,
          },
        },
        data: {
          hotelProps: rest,
        },
      });
    } else if (type === CatalogProductTypes.HOTEL_ROOM) {
      if (!hotel_retailer_id || !hotel_room_id) {
        throw new Error(
          "Cannot update a HOTEL_ROOM catalog product without hotel_retailer_id and hotel_room_id",
        );
      }
      await prisma.waCatalogProduct.update({
        where: {
          catalog_hotel_room_id_unique: {
            catalogId,
            // DB column is `hotel_ratailer_id` (pre-existing typo in the
            // Prisma schema); `hotel_retailer_id` above is the correctly
            // spelled DTO field. Previously this destructured a
            // `hotel_ratailer_id` variable that never matched any key on
            // `product`, so it was always `undefined` here — the compound
            // unique filter could never match a HOTEL_ROOM row. See
            // issues.txt — BUG (fixed).
            hotel_ratailer_id: hotel_retailer_id,
            hotel_room_id,
          },
        },
        data: {
          hotelRoomProps: rest,
        },
      });
    }
  }
}

function getCatalogProdutType(vertical: string) {
  switch (vertical) {
    case "commerce":
      return CatalogProductTypes.PRODUCT_ITEM;
    case "hotels":
      return CatalogProductTypes.HOTEL;
    case "hotel_room":
      return CatalogProductTypes.HOTEL_ROOM;
  }
}

interface ShopifyProductVariantNode {
  id: string;
  sku?: string;
  price: string;
  compareAtPrice?: string | null;
  availableForSale: boolean;
  inventoryQuantity?: number;
  title: string;
}

interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  vendor: string;
  handle: string;
  onlineStoreUrl?: string | null;
  images: { edges: { node: { url: string } }[] };
  variants: { edges: { node: ShopifyProductVariantNode }[] };
}

interface ShopifyProductsPageData {
  products: {
    edges: { node: ShopifyProductNode }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface ShopifyShopCurrencyData {
  shop: { currencyCode?: string };
}

// Fetches all Shopify products, maps them to catalogProductCore format,
// and filters out any variants already imported into this catalog.
export async function getShopifyProductsForCatalog(orgId: string, catalogId: string) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo?.credential?.session) {
    throw new Error("No Shopify integration found for this org");
  }
  if (!shopify) throw new Error("Shopify integration is not configured");

  const session = shopifyInfo.credential.session;
  const client = new shopify.clients.Graphql({ session });

  const shopData: GraphQLClientResponse<ShopifyShopCurrencyData> =
    await client.request(`{ shop { currencyCode } }`);
  const currencyCode: string = shopData.data?.shop?.currencyCode ?? "USD";
  const shopDomain: string = session.shop;

  // Paginate through all Shopify products
  let hasNextPage = true;
  let cursor: string | null = null;
  const allProducts: ShopifyProductNode[] = [];

  while (hasNextPage) {
    const data: GraphQLClientResponse<ShopifyProductsPageData> = await client.request(
      `query getFullProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          edges {
            node {
              id
              title
              description
              vendor
              handle
              onlineStoreUrl
              images(first: 5) {
                edges { node { url } }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    sku
                    price
                    compareAtPrice
                    availableForSale
                    inventoryQuantity
                    title
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
      { variables: { cursor } },
    );
    if (!data.data) throw new Error("Shopify products query returned no data");
    hasNextPage = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;
    allProducts.push(...data.data.products.edges.map((e) => e.node));
  }

  // Get already-imported retailer_ids for this catalog
  const existing = await prisma.waCatalogProduct.findMany({
    where: { catalogId },
    select: { retailer_id: true },
  });
  const existingIds = new Set(existing.map((p) => p.retailer_id).filter(Boolean));

  // Map each unimported variant to a catalogProductCore item
  const catalogItems: CatalogProductCoreInput[] = [];
  for (const product of allProducts) {
    const images = (product.images?.edges ?? []).map((e) => ({
      url: e.node.url,
    }));
    if (images.length === 0) continue; // Meta requires at least one image

    const productLink: string =
      product.onlineStoreUrl ?? `https://${shopDomain}/products/${product.handle}`;
    const productGroupId: string = product.id.split("/").pop() ?? product.id;

    for (const variantEdge of product.variants?.edges ?? []) {
      const v = variantEdge.node;
      const numericId: string = v.id.split("/").pop() ?? v.id;

      if (existingIds.has(numericId)) continue; // skip already imported

      const variantSuffix = v.title && v.title !== "Default Title" ? ` - ${v.title}` : "";
      const salePrice = parseFloat(v.price);
      const originalPrice = v.compareAtPrice ? parseFloat(v.compareAtPrice) : salePrice;

      catalogItems.push({
        retailer_id: numericId,
        title: `${product.title}${variantSuffix}`.substring(0, 100),
        description: (product.description || product.title).substring(0, 5000),
        condition: "new",
        image: images,
        internal_label: [],
        link: productLink,
        price: originalPrice,
        currencyCode,
        availability: v.availableForSale ? "in stock" : "out of stock",
        brand: product.vendor || product.title,
        sale_price: salePrice.toFixed(2),
        item_group_id: productGroupId,
      });
    }
  }

  return catalogItems;
}

// Syncs already-imported Shopify products: compares Shopify data against DB,
// updates mismatched fields in DB + pushes changes to Meta catalog.
export async function syncShopifyProductsToCatalog(
  orgId: string,
  catalogId: string,
): Promise<{ updated: number; unchanged: number; notFound: number }> {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo?.credential?.session) {
    throw new Error("No Shopify integration found for this org");
  }
  if (!shopify) throw new Error("Shopify integration is not configured");

  const session = shopifyInfo.credential.session;
  const client = new shopify.clients.Graphql({ session });

  const shopData: GraphQLClientResponse<ShopifyShopCurrencyData> =
    await client.request(`{ shop { currencyCode } }`);
  const currencyCode: string = shopData.data?.shop?.currencyCode ?? "USD";
  const shopDomain: string = session.shop;

  // Paginate through all Shopify products
  let hasNextPage = true;
  let cursor: string | null = null;
  const allProducts: ShopifyProductNode[] = [];

  while (hasNextPage) {
    const data: GraphQLClientResponse<ShopifyProductsPageData> = await client.request(
      `query getFullProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          edges {
            node {
              id
              title
              description
              vendor
              handle
              onlineStoreUrl
              images(first: 5) {
                edges { node { url } }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    price
                    compareAtPrice
                    availableForSale
                    title
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { variables: { cursor } },
    );
    if (!data.data) throw new Error("Shopify products query returned no data");
    hasNextPage = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;
    allProducts.push(...data.data.products.edges.map((e) => e.node));
  }

  // Build a map: numericVariantId → { variant, product }
  const variantMap = new Map<
    string,
    { variant: ShopifyProductVariantNode; product: ShopifyProductNode }
  >();
  for (const product of allProducts) {
    for (const variantEdge of product.variants?.edges ?? []) {
      const v = variantEdge.node;
      const numericId: string = v.id.split("/").pop() ?? v.id;
      variantMap.set(numericId, { variant: v, product });
    }
  }

  // Get all PRODUCT_ITEM DB products that have a retailer_id (i.e., Shopify-imported)
  const dbProducts = await prisma.waCatalogProduct.findMany({
    where: {
      catalogId,
      type: CatalogProductTypes.PRODUCT_ITEM,
      retailer_id: { not: null },
    },
  });

  const toUpdate: CatalogBatchUpdateItem[] = [];
  let unchanged = 0;
  let notFound = 0;

  for (const dbProd of dbProducts) {
    const match = variantMap.get(dbProd.retailer_id!);
    if (!match) {
      notFound++; // variant deleted in Shopify — skip
      continue;
    }

    const { variant: v, product } = match;
    const images = (product.images?.edges ?? []).map((e) => ({
      url: e.node.url,
    }));
    if (images.length === 0) continue;

    const productLink: string =
      product.onlineStoreUrl ?? `https://${shopDomain}/products/${product.handle}`;
    const productGroupId: string = product.id.split("/").pop() ?? product.id;
    const variantSuffix = v.title && v.title !== "Default Title" ? ` - ${v.title}` : "";
    const salePrice = parseFloat(v.price);
    const originalPrice = v.compareAtPrice ? parseFloat(v.compareAtPrice) : salePrice;
    const availability = v.availableForSale ? "in stock" : "out of stock";
    const newTitle = `${product.title}${variantSuffix}`.substring(0, 100);
    const newDescription = (product.description || product.title).substring(0, 5000);
    const newBrand: string = product.vendor || product.title;

    // Compare against stored productProps (prices stored as "10.00 USD")
    const props: Partial<CatalogProductCore> = dbProd.productProps ?? {};
    const currentPrice = parseFloat(String(props.price ?? "0").split(" ")[0]);
    const currentSalePrice = parseFloat(String(props.sale_price ?? "0").split(" ")[0]);

    const hasChanged =
      props.title !== newTitle ||
      props.description !== newDescription ||
      props.availability !== availability ||
      props.brand !== newBrand ||
      Math.abs(currentPrice - originalPrice) > 0.001 ||
      Math.abs(currentSalePrice - salePrice) > 0.001 ||
      (images[0]?.url && props.image_link !== images[0].url);

    if (!hasChanged) {
      unchanged++;
      continue;
    }

    // Preserve user-managed internal_label (stored with quotes — strip before passing)
    const rawLabels: string[] = (props.internal_label ?? []).map((l) => l.replace(/^'|'$/g, ""));

    toUpdate.push({
      retailer_id: dbProd.retailer_id ?? undefined,
      title: newTitle,
      description: newDescription,
      condition: props.condition ?? "new",
      image: images,
      internal_label: rawLabels,
      link: productLink,
      price: originalPrice,
      currencyCode,
      availability,
      brand: newBrand,
      sale_price: salePrice.toFixed(2),
      item_group_id: productGroupId,
    });
  }

  if (toUpdate.length > 0) {
    await updateCatalogProducts(orgId, catalogId, toUpdate, CatalogProductTypes.PRODUCT_ITEM);
  }

  log.info(
    { orgId, catalogId, updated: toUpdate.length, unchanged, notFound },
    "Shopify→Catalog sync complete",
  );

  return { updated: toUpdate.length, unchanged, notFound };
}

// Imports a pre-selected list of mapped catalog items into Meta + DB.
export async function importSelectedShopifyProducts(
  orgId: string,
  catalogId: string,
  items: CatalogProductCoreInput[],
) {
  if (items.length === 0) return { imported: 0 };

  // Tag every item so the DB knows it came from Shopify
  const taggedItems = items.map((item) => ({
    ...item,
    shopifyVariantId: item.retailer_id,
  }));

  await createCatalogProductsBatch(orgId, CatalogProductTypes.PRODUCT_ITEM, taggedItems, catalogId);

  log.info({ orgId, catalogId, imported: items.length }, "Shopify→Catalog import complete");

  return { imported: items.length };
}
