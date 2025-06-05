import prisma from "../../../../utils/prisma";
import { getWaSettings } from "../../settings/wa_settings.service";
import { callWhatsappApi } from "../../wa_axios";
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
} from "./product.schema";

export async function createCatalogProductsBatch(
  orgId,
  type: catalogItemSchema["type"],
  dataList,
  catalogInfo: WhatsappCatalog,
) {
  let requests = [];
  const { catalogId, products } = catalogInfo;
  const newProducts = [...products];
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
        price: `${price} ${currencyCode}`,
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
    const { id, ...rest } = input;
    newProducts.push({
      type,
      retailer_id: id ?? undefined,
      currency: data.currencyCode,
      image_link: data.image.length ? data.image[0].url : undefined,
      additional_image_link: data.image.length
        ? data.image.map((image) => image.url)
        : undefined,
      ...rest,
    });
  }
  await sendProducts(orgId, requests, type, catalogId);

  await prisma.whatsappCatalog.update({
    where: {
      catalogId,
    },
    data: {
      products: newProducts,
    },
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
  console.dir(data, { depth: null });
  const res = await callWhatsappApi(
    `/${catalogId}/items_batch`,
    "POST",
    null,
    data,
    null,
    { "Content-Type": "application/json" },
  );
  console.dir(res, { depth: null });
  return res.data;
}

export async function syncCatalogProducts(
  orgId: string,
  catalogId,
  { limit, next }: CatalogItemQueryFilter,
) {
  const [waSettings, catalogInfo] = await Promise.all([
    getWaSettings(orgId),
    getCatalogProducts(catalogId),
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
  console.log("..here..");

  const res = await callWhatsappApi(`${url}`, "GET", null, null, { params });
  console.dir(res.data.data, { depth: null });
  const { products, vertical } = catalogInfo;
  const newProducts = [...products];
  for (const product of res.data.data) {
    if (vertical === "commerce") {
      const index = products.findIndex(
        (p: CatalogProductCore) => p.retailer_id === product.retailer_id,
      );
      const { name, image_url, additional_image_urls, ...rest } =
        product as CatalogResponseInput;
      const item = {
        title: name,
        additional_image_link: additional_image_urls,
        image_link: image_url,
        ...rest,
        type: "PRODUCT_ITEM",
      } as CatalogProductCore;
      if (index !== -1) {
        newProducts[index] = item;
      } else {
        newProducts.push(item);
      }
    }
    if (vertical === "hotels") {
      const index = products.findIndex(
        (p: CatalogHotel) => p.hotel_id === product.hotel_id,
      );
      const item = {
        ...product,
        type: "HOTEL",
      } as CatalogHotel;
      if (index !== -1) {
        newProducts[index] = item;
      } else {
        newProducts.push(item);
      }
    }
    if (vertical === "hotel_room") {
      const index = products.findIndex(
        (p: CatalogHotelRoom) =>
          p.hotel_retailer_id === product.hotel_retailer_id &&
          p.hotel_room_id === product.hotel_room_id,
      );
      const item = {
        ...product,
        type: "HOTEL_ROOM",
      } as CatalogHotelRoom;
      if (index !== -1) {
        newProducts[index] = item;
      } else {
        newProducts.push(item);
      }
    }
  }
  // const updatedProducts = newProducts.filter(p => res.data.data.some(pr => pr.id === p.id))
  await prisma.whatsappCatalog.update({
    where: {
      catalogId,
    },
    data: {
      products: newProducts,
    },
  });
  const hasNextPage = !!(res.data.paging && res.data.paging.next);
  return {
    hasNextPage,
    next: hasNextPage ? res.data.paging.cursors.after : null,
  };
}

export async function getCatalogProducts(catalogId, query = null) {
  return (await prisma.whatsappCatalog.findUnique({
    where: {
      catalogId,
    },
  })) as WhatsappCatalog;
}

export async function deleteCatalogProducts(
  orgId: string,
  catalogId: string,
  productIds: CatalogProductIdsSchema["productIds"],
) {
  const { vertical, products } = await getCatalogProducts(catalogId);

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
  const newProducts = products.filter((product) => {
    if (vertical === "commerce") {
      return productIds.some(
        (p) => p.id !== (product as CatalogProductCore).retailer_id,
      );
    }
    if (vertical === "hotels") {
      return productIds.some(
        (p) => p.id !== (product as CatalogHotel).hotel_id,
      );
    }
    if (vertical === "hotel_room") {
      return productIds.some(
        (p) =>
          !(
            p.id === (product as CatalogHotelRoom).hotel_room_id &&
            p.hotel_retailer_id ===
              (product as CatalogHotelRoom).hotel_retailer_id
          ),
      );
    }
  });
  await prisma.whatsappCatalog.update({
    where: {
      catalogId,
    },
    data: {
      products: newProducts,
    },
  });
}

export async function updateCatalogProducts(orgId, catalogId, dataList, type) {
  const { products, vertical } = await getCatalogProducts(catalogId);
  let requests = [];
  const newProducts = [...products];
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
      productIndex = newProducts.findIndex(
        (p) => p.retailer_id === retailer_id,
      );
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
      productIndex = newProducts.findIndex((p) => p.hotel_id === rest.hotel_id);
    }
    if (type === "HOTEL_ROOM") {
      const { base_price, currencyCode, ...rest } = data as Partial<
        catalogItemSchema["HOTEL_ROOM"]
      >;
      input = {
        ...rest,
        base_price: `${base_price} ${currencyCode}`,
      };
      productIndex = newProducts.findIndex(
        (p) =>
          p.hotel_room_id === rest.hotel_room_id &&
          p.hotel_retailer_id === rest.hotel_retailer_id,
      );
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
    newProducts[productIndex] = obj;
  }
  await sendProducts(orgId, requests, type, catalogId);

  await prisma.whatsappCatalog.update({
    where: {
      catalogId,
    },
    data: {
      products: newProducts,
    },
  });
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
