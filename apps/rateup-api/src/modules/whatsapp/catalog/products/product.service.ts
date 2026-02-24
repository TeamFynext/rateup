import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { getWaSettings } from "../../settings/wa_settings.service.js";
import { callWhatsappApi } from "../../wa_axios.js";
import { getWaCatalog } from "../catalog.service.js";
import { getShopifyInfo } from "../../../integrations/shopify/shopify.service.js";
import shopify from "../../../integrations/shopify/shopify.config.js";
import {
  catalogHotel,
  catalogHotelRoom,
  CatalogItemQueryFilter,
  catalogItemSchema,
  catalogProductCore,
  CatalogProductIdsSchema,
  catalogProductResponseSchema,
  CatalogProductTypes,
  CatalogResponseInput,
} from "./product.schema.js";

export async function createCatalogProductsBatch(
  orgId,
  type: catalogItemSchema["type"],
  dataList,
  catalogId,
) {
  let requests = [];
  const newProducts = [];
  for (const data of dataList) {
    let input;
    if (type === "PRODUCT_ITEM") {
      const {
        price,
        currencyCode,
        internal_label,
        sale_price,
        retailer_id,
        ...rest
      } = data as catalogItemSchema["PRODUCT_ITEM"];
      input = {
        ...rest,
        id: retailer_id,
        price: `${parseFloat(String(price)).toFixed(2)} ${currencyCode}`,
        sale_price: `${sale_price} ${currencyCode}`,
        internal_label: internal_label.map((label) => `'${label}'`),
      };
    }
    if (type === "HOTEL") {
      const {
        base_price,
        currencyCode,
        tags,
        numbertags,
        sale_price,
        ...rest
      } = data as catalogItemSchema["HOTEL"];
      let tagInputs = {};
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
      const { base_price, currencyCode, ...rest } =
        data as catalogItemSchema["HOTEL_ROOM"];
      input = {
        ...rest,
        base_price: `${base_price} ${currencyCode}`,
      };
    }
    requests.push({ method: "CREATE", data: input });
    const { id, hotel_id, hotel_retailer_id, hotel_room_id, ...rest } = input;
    const props = {
      currency: data.currencyCode,
      image_link: data.image.length ? data.image[0].url : undefined,
      additional_image_link: data.image.length
        ? data.image.map((image) => image.url)
        : undefined,
      ...rest,
    };
    newProducts.push({
      type,
      retailer_id: id ?? undefined,
      hotel_id,
      hotel_retailer_id,
      hotel_room_id,
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
  data: any;
}
export async function sendProducts(
  orgId,
  requests: SendProductRequestProps[],
  type,
  catalogId,
) {
  const { accessToken } = await getWaSettings(orgId);
  const data = {
    access_token: accessToken,
    item_type: type,
    requests,
  };
  const res = await callWhatsappApi(
    `/${catalogId}/items_batch`,
    "POST",
    null,
    data,
    null,
    { "Content-Type": "application/json" },
  );

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
  let filter = {
    limit: 50,
  };
  if (limit) {
    filter["limit"] = limit;
  }
  if (next) {
    filter["after"] = next;
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

  const res = await callWhatsappApi(`${url}`, "GET", null, null, { params });
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
      const {
        name,
        image_url,
        additional_image_urls,
        retailer_id,
        id,
        ...rest
      } = product as CatalogResponseInput;
      const item = {
        title: name,
        additional_image_link: additional_image_urls,
        image_link: image_url,
        ...rest,
      } as CatalogProductCore;
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

export async function getCatalogProducts(catalogId, query = null) {
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
  const { vertical } = await getWaCatalog(catalogId);

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

  await sendProducts(
    orgId,
    requests,
    getCatalogProdutType(vertical),
    catalogId,
  );
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

export async function updateCatalogProducts(orgId, catalogId, dataList, type) {
  let requests = [];
  const newProducts = [];
  for (const data of dataList) {
    let input;
    let productIndex;
    if (type === "PRODUCT_ITEM") {
      const {
        price,
        currencyCode,
        internal_label,
        sale_price,
        retailer_id,
        ...rest
      } = data as Partial<catalogItemSchema["PRODUCT_ITEM"]>;
      input = {
        ...rest,
        id: retailer_id,
        price: `${price} ${currencyCode}`,
        sale_price: `${sale_price} ${currencyCode}`,
        internal_label:
          internal_label && internal_label.map((label) => `'${label}'`),
      };
    }
    if (type === "HOTEL") {
      const {
        base_price,
        currencyCode,
        tags,
        numbertags,
        sale_price,
        ...rest
      } = data as Partial<catalogItemSchema["HOTEL"]>;
      let tagInputs = {};
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
      const { base_price, currencyCode, ...rest } = data as Partial<
        catalogItemSchema["HOTEL_ROOM"]
      >;
      input = {
        ...rest,
        base_price: `${base_price} ${currencyCode}`,
      };
    }
    requests.push({ method: "UPDATE", data: input });
    const { id, ...rest } = input;
    const obj = {
      type,
      retailer_id: id ?? undefined,
      currency: data.currencyCode,
      image_link: data.image.length ? data.image[0].url : undefined,
      additional_image_link: data.image.length
        ? data.image.map((image) => image.url)
        : undefined,
      ...rest,
    };
    newProducts.push(obj);
  }
  await sendProducts(orgId, requests, type, catalogId);
  for (const product of newProducts) {
    const {
      retailer_id,
      type,
      hotel_id,
      hotel_ratailer_id,
      hotel_room_id,
      ...rest
    } = product;
    if (type === CatalogProductTypes.PRODUCT_ITEM) {
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
      await prisma.waCatalogProduct.update({
        where: {
          catalog_hotel_room_id_unique: {
            catalogId,
            hotel_ratailer_id,
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

function getCatalogProdutType(vertical) {
  switch (vertical) {
    case "commerce":
      return CatalogProductTypes.PRODUCT_ITEM;
    case "hotels":
      return CatalogProductTypes.HOTEL;
    case "hotel_room":
      return CatalogProductTypes.HOTEL_ROOM;
  }
}

// Fetches all Shopify products, maps them to catalogProductCore format,
// and filters out any variants already imported into this catalog.
export async function getShopifyProductsForCatalog(
  orgId: string,
  catalogId: string,
) {
  const shopifyInfo = await getShopifyInfo(orgId);
  if (!shopifyInfo?.credential?.session) {
    throw new Error("No Shopify integration found for this org");
  }

  const session = shopifyInfo.credential.session;
  const client = new shopify.clients.Graphql({ session });

  const shopData = await client.request(`{ shop { currencyCode } }`);
  const currencyCode: string = shopData.data.shop?.currencyCode ?? "USD";
  const shopDomain: string = session.shop;

  // Paginate through all Shopify products
  let hasNextPage = true;
  let cursor: string | null = null;
  const allProducts: any[] = [];

  while (hasNextPage) {
    const data: any = await client.request(
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
    hasNextPage = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;
    allProducts.push(...data.data.products.edges.map((e) => e.node));
  }

  // Get already-imported retailer_ids for this catalog
  const existing = await prisma.waCatalogProduct.findMany({
    where: { catalogId },
    select: { retailer_id: true },
  });
  const existingIds = new Set(
    existing.map((p) => p.retailer_id).filter(Boolean),
  );

  // Map each unimported variant to a catalogProductCore item
  const catalogItems: any[] = [];
  for (const product of allProducts) {
    const images = (product.images?.edges ?? []).map((e) => ({
      url: e.node.url,
    }));
    if (images.length === 0) continue; // Meta requires at least one image

    const productLink: string =
      product.onlineStoreUrl ??
      `https://${shopDomain}/products/${product.handle}`;
    const productGroupId: string = product.id.split("/").pop() ?? product.id;

    for (const variantEdge of product.variants?.edges ?? []) {
      const v = variantEdge.node;
      const numericId: string = v.id.split("/").pop() ?? v.id;

      if (existingIds.has(numericId)) continue; // skip already imported

      const variantSuffix =
        v.title && v.title !== "Default Title" ? ` - ${v.title}` : "";
      const salePrice = parseFloat(v.price);
      const originalPrice = v.compareAtPrice
        ? parseFloat(v.compareAtPrice)
        : salePrice;

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

// Imports a pre-selected list of mapped catalog items into Meta + DB.
export async function importSelectedShopifyProducts(
  orgId: string,
  catalogId: string,
  items: any[],
) {
  if (items.length === 0) return { imported: 0 };

  await createCatalogProductsBatch(
    orgId,
    CatalogProductTypes.PRODUCT_ITEM,
    items,
    catalogId,
  );

  log.info(
    { orgId, catalogId, imported: items.length },
    "Shopify→Catalog import complete",
  );

  return { imported: items.length };
}
