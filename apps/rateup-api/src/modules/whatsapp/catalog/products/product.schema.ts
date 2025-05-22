import { buildJsonSchemas } from "fastify-zod";
import z, { nativeEnum } from "zod";

export const catalogProductCore = z.object({
  id: z.string(),
  title: z.string().max(100),
  description: z.string().max(5000, "Give short text describing product"),
  condition: z.enum(["new", "refurbished", "used"]),
  image: z
    .array(
      z.object({
        url: z.string(),
        tag: z.array(z.string()),
      }),
    )
    .max(20, "Only upto 20 images are supported")
    .optional(),
  internal_label: z.array(z.string()).optional(),
  link: z.string(),
  price: z.number(), // on api price:string = price + currencyCode
  currencyCode: z.string(),
  video: z
    .array(
      z.object({
        url: z.string(),
        tag: z.array(z.string()),
      }),
    )
    .optional(),
  availability: z.enum([
    "in stock",
    "out of stock",
    "available for order",
    "discontinued",
  ]),
  brand: z.string(),
  age_group: z
    .enum(["newborn", "infant", "toddler", "kids", "adult"])
    .optional(),
  color: z.string().max(100).optional(),
  gender: z.enum(["male", "female", "unisex"]).optional(),
  pattern: z.string().max(100).optional(),
  user_rating: z.number().optional(),
  rating_count: z.number().optional(),
  size: z.string().optional(),
  image_link: z.string().optional(),
  sale_price_effective_date: z.string().optional(),
  sale_price: z.string(),
  manufacturer_part_number: z.string().optional(),
  item_group_id: z.string().optional(),
  google_product_category: z.string().optional(),
  disabled_capabilities: z.array(z.string()).optional(),
  additional_image_link: z.array(z.string()).optional(),
});

export const catalogHotel = z.object({
  name: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  url: z.string(),
  sale_price: z.string(),
  address: z.record(z.string()),
  base_price: z.number(), // on api base_price:string = price + currencyCode
  currencyCode: z.string(),
  tags: z.array(z.string().max(100)).max(5), // on api custom_label_0, custom_label_1,,,etc.
  numbertags: z.array(z.number().int().nonnegative()).max(5), // on api custom_number_0, custom_number_1,,,etc.
  description: z.string().max(5000),
  hotel_id: z.string(),
  image: z
    .array(
      z.object({
        url: z.string(),
        tag: z.array(z.string()),
      }),
    )
    .max(20, "Only upto 20 images are supported"),
});

export const catalogProductResponseCoreSchema = z.object({
  id: z.string(),
  image_url: z.string().url(),
  name: z.string(),
  price: z.string(),
  retailer_id: z.string(),
  condition: z
    .enum([
      "new",
      "refurbished",
      "used",
      "used_like_new",
      "used_good",
      "used_fair",
      "cpo",
      "open_box_new",
    ])
    .default("new"),
  availability: z
    .enum([
      "in stock",
      "out of stock",
      "preorder",
      "available for order",
      "discontinued",
      "pending",
      "mark_as_sold",
    ])
    .default("in stock"),
  brand: z.string(),
  sale_price: z.string(),
  url: z.string().url(),
  visibility: z.enum(["staging", "published"]).default("published"),
  description: z.string().max(5000),
});

export const catalogProductResponseSchema =
  catalogProductResponseCoreSchema.extend({
    custom_data: z.record(z.string(), z.string()).optional(),
    additional_image_urls: z.array(z.string().url()).optional(),
    additional_variant_attributes: z.record(z.string(), z.string()).optional(),
    age_group: z
      .enum([
        "adult",
        "all ages",
        "infant",
        "kids",
        "newborn",
        "teen",
        "toddler",
      ])
      .optional(),

    category: z.string().optional(),
    category_specific_fields: z.record(z.any()).optional(),
    color: z.string().optional(),

    currency: z.string().optional(),
    custom_label_0: z.string().max(100).optional(),
    custom_label_1: z.string().max(100).optional(),
    custom_label_2: z.string().max(100).optional(),
    custom_label_3: z.string().max(100).optional(),
    custom_label_4: z.string().max(100).optional(),
    custom_number_0: z.number().int().optional(),
    custom_number_1: z.number().int().optional(),
    custom_number_2: z.number().int().optional(),
    custom_number_3: z.number().int().optional(),
    custom_number_4: z.number().int().optional(),

    expiration_date: z.string().optional(),
    fb_product_category: z.string().optional(),
    gender: z.enum(["female", "male", "unisex"]).optional(),
    gtin: z.string().optional(),
    importer_address: z.record(z.any()).optional(),
    importer_name: z.string().optional(),
    inventory: z.number().int().optional(),
    manufacturer_info: z.string().optional(),
    manufacturer_part_number: z.string().optional(),
    marked_for_product_launch: z
      .enum(["default", "marked", "not_marked"])
      .optional(),
    material: z.string().max(200).optional(),
    mobile_link: z.string().url().optional(),
    ordering_index: z.number().int().optional(),
    origin_country: z.string().optional(),
    pattern: z.string().optional(),
    product_type: z.string().max(750).optional(),
    retailer_product_group_id: z.string().optional(),

    sale_price_end_date: z.string().optional(),
    sale_price_start_date: z.string().optional(),
    short_description: z.string().optional(),
    size: z.string().optional(),
    start_date: z.string().optional(),
  });

export enum CatalogProductTypes {
  PRODUCT_ITEM = "PRODUCT_ITEM",
  HOTEL = "HOTEL",
  HOTEL_ROOM = "HOTEL_ROOM",
  FLIGHT = "FLIGHT",
  DESTINATION = "DESTINATION",
  HOME_LISTING = "HOME_LISTING",
  VEHICLE = "VEHICLE",
}

export const catalogHotelRoom = z.object({
  name: z.string(),
  url: z.string(),
  base_price: z.number(), // on api base_price:string = price + currencyCode
  currencyCode: z.string(),
  description: z.string().max(5000),
  hotel_retailer_id: z.string(),
  hotel_room_id: z.string(),
  image: z
    .array(
      z.object({
        url: z.string(),
        tag: z.array(z.string()),
      }),
    )
    .max(20, "Only upto 20 images are supported"),
});

const catalogItemCore = z.object({
  type: z.nativeEnum(CatalogProductTypes),
  PRODUCT_ITEM: catalogProductCore.optional(),
  HOTEL: catalogHotel.optional(),
  HOTEL_ROOM: catalogHotelRoom.optional(),
});

const catalogItemBatch = z.object({
  type: z.nativeEnum(CatalogProductTypes),
  PRODUCT_ITEM: z.array(catalogProductCore).optional(),
  HOTEL: z.array(catalogHotel).optional(),
  HOTEL_ROOM: z.array(catalogHotelRoom).optional(),
});

const catalogItemQueryFilter = z.object({
  next: z.string().optional(),
  limit: z.number().optional(),
});

const catalogProductIdsSchema = z.object({
  produtIds: z.array(
    z.object({
      id: z.string(),
      hotel_retailer_id: z.string().optional(),
    }),
  ),
});

export const { schemas: catalogProductSchema, $ref: $wCp } = buildJsonSchemas(
  {
    catalogItemCore,
    catalogItemBatch,
    catalogItemQueryFilter,
    catalogProductIdsSchema,
  },
  { $id: "catalogProductSchema" },
);

export type catalogItemSchema = z.infer<typeof catalogItemCore>;
export type catalogItemBatchSchema = z.infer<typeof catalogItemBatch>;
export type CatalogItemQueryFilter = z.infer<typeof catalogItemQueryFilter>;
export type CatalogResponseInput = z.infer<typeof catalogProductResponseSchema>;
export type CatalogProductIdsSchema = z.infer<typeof catalogProductIdsSchema>;
