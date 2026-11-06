import { z } from "zod";

import {
  toMoney,
  type ShopProduct,
  type ShopProductInput,
  type ShopProductOption,
} from "@/backend/commerce/shop.api";

const decimal = /^\d+(\.\d{1,2})?$/;
const whole = /^\d+$/;

const variantSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  optionValues: z.record(z.string(), z.string()).nullable(),
  sku: z.string().max(64),
  price: z.string().trim().regex(decimal, "Enter a price"),
  compareAtPrice: z
    .string()
    .trim()
    .refine((v) => v === "" || decimal.test(v), "Enter a price or leave it empty"),
  trackInventory: z.boolean(),
  stock: z
    .string()
    .trim()
    .refine((v) => v === "" || whole.test(v), "Whole number"),
  lowStockAt: z
    .string()
    .trim()
    .refine((v) => v === "" || whole.test(v), "Whole number"),
  allowBackorder: z.boolean(),
  imageUrl: z.string().nullable(),
  /** People waiting for a restock message; read-only. */
  waiting: z.number(),
  currentStock: z.number(),
});

export const productFormSchema = z.object({
  title: z.string().trim().min(1, "Give the product a name").max(150),
  description: z.string().max(5000),
  brand: z.string().max(100),
  category: z.string().max(250),
  productUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || z.url().safeParse(v).success,
      "Enter a full link, starting with https://",
    ),
  images: z.array(z.string()).max(10),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  options: z
    .array(z.object({ name: z.string().trim().max(30), values: z.array(z.string()).max(30) }))
    .max(3),
  variants: z.array(variantSchema).min(1).max(100),
  showOnWhatsapp: z.boolean(),
  showOnInstagram: z.boolean(),
  showOnFacebook: z.boolean(),
  showOnStorefront: z.boolean(),
  loyaltyMultiplier: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, "Enter a number"),
  collectionIds: z.array(z.string()),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type VariantFormValues = ProductFormValues["variants"][number];

export function blankVariant(seed?: Partial<VariantFormValues>): VariantFormValues {
  return {
    title: "Default",
    optionValues: null,
    sku: "",
    price: "",
    compareAtPrice: "",
    // Tracking starts when a stock number is typed: an empty count means "not counted", not 0.
    trackInventory: false,
    stock: "",
    lowStockAt: "",
    allowBackorder: false,
    imageUrl: null,
    waiting: 0,
    currentStock: 0,
    ...seed,
  };
}

export const BLANK_PRODUCT: ProductFormValues = {
  title: "",
  description: "",
  brand: "",
  category: "",
  productUrl: "",
  images: [],
  status: "ACTIVE",
  options: [],
  variants: [blankVariant()],
  showOnWhatsapp: true,
  showOnInstagram: true,
  showOnFacebook: false,
  showOnStorefront: true,
  loyaltyMultiplier: "1",
  collectionIds: [],
};

const moneyText = (value: ShopProduct["variants"][number]["price"] | null) =>
  value === null ? "" : toMoney(value).toFixed(2);

export function productFormValues(product: ShopProduct): ProductFormValues {
  return {
    title: product.title,
    description: product.description ?? "",
    brand: product.brand ?? "",
    category: product.category ?? "",
    productUrl: product.productUrl ?? "",
    images: product.images,
    status: product.status,
    options: product.options ?? [],
    variants: [...product.variants]
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        id: v.id,
        title: v.title,
        optionValues: v.optionValues,
        sku: v.sku ?? "",
        price: moneyText(v.price),
        compareAtPrice: moneyText(v.compareAtPrice),
        trackInventory: v.trackInventory,
        stock: "",
        lowStockAt: v.lowStockAt === null ? "" : String(v.lowStockAt),
        allowBackorder: v.allowBackorder,
        imageUrl: v.imageUrl,
        waiting: v._count?.stockAlerts ?? 0,
        currentStock: v.stock,
      })),
    showOnWhatsapp: product.showOnWhatsapp,
    showOnInstagram: product.showOnInstagram,
    showOnFacebook: product.showOnFacebook,
    showOnStorefront: product.showOnStorefront,
    loyaltyMultiplier: String(toMoney(product.loyaltyMultiplier)),
    collectionIds: product.collections.map((c) => c.id),
  };
}

const comboKey = (values: Record<string, string> | null) =>
  values
    ? Object.keys(values)
        .sort()
        .map((k) => `${k}=${values[k]}`)
        .join("|")
    : "";

/**
 * The variant grid for a set of options: one row per combination of values. Rows that already
 * exist for a combination are kept (with their id, price and stock), and a new row copies the
 * first row's price so adding a size doesn't leave a blank to fill in.
 */
export function buildVariants(
  options: readonly ShopProductOption[],
  current: readonly VariantFormValues[],
): VariantFormValues[] {
  const usable = options.filter((o) => o.name.trim() && o.values.length > 0);
  const seed = current[0];
  if (usable.length === 0) {
    const single = current.find((v) => !v.optionValues) ?? seed;
    return [single ? { ...single, title: "Default", optionValues: null } : blankVariant()];
  }
  let combos: Record<string, string>[] = [{}];
  for (const option of usable) {
    combos = combos.flatMap((combo) =>
      option.values.map((value) => ({ ...combo, [option.name.trim()]: value })),
    );
  }
  const byKey = new Map(current.map((v) => [comboKey(v.optionValues), v]));
  return combos.map((combo) => {
    const title = usable.map((o) => combo[o.name.trim()]).join(" / ");
    const existing = byKey.get(comboKey(combo));
    if (existing) return { ...existing, title, optionValues: combo };
    return blankVariant({
      title,
      optionValues: combo,
      price: seed?.price ?? "",
      compareAtPrice: seed?.compareAtPrice ?? "",
      trackInventory: seed?.trackInventory ?? false,
      lowStockAt: seed?.lowStockAt ?? "",
      allowBackorder: seed?.allowBackorder ?? false,
    });
  });
}

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export function productPayload(values: ProductFormValues): ShopProductInput {
  const options = values.options.filter((o) => o.name.trim() && o.values.length > 0);
  return {
    title: values.title.trim(),
    description: orNull(values.description),
    brand: orNull(values.brand),
    category: orNull(values.category),
    productUrl: orNull(values.productUrl),
    images: values.images,
    status: values.status,
    options:
      options.length > 0 ? options.map((o) => ({ name: o.name.trim(), values: o.values })) : null,
    showOnWhatsapp: values.showOnWhatsapp,
    showOnInstagram: values.showOnInstagram,
    showOnFacebook: values.showOnFacebook,
    showOnStorefront: values.showOnStorefront,
    loyaltyMultiplier: Number(values.loyaltyMultiplier),
    collectionIds: values.collectionIds,
    variants: values.variants.map((v) => ({
      id: v.id,
      title: v.title,
      optionValues: v.optionValues,
      sku: orNull(v.sku),
      price: Number(v.price),
      compareAtPrice: numOrNull(v.compareAtPrice),
      trackInventory: v.trackInventory,
      // The server reads stock on new variants only; existing ones change through the stock endpoint.
      stock: v.id || !v.trackInventory ? undefined : Number(v.stock || 0),
      lowStockAt: numOrNull(v.lowStockAt),
      allowBackorder: v.allowBackorder,
      imageUrl: v.imageUrl,
    })),
  };
}

/** Meta and Instagram drop a product with no photo, so the editor and the list flag it. */
export function hasPhoto(product: {
  images: readonly string[];
  variants: readonly { imageUrl: string | null }[];
}): boolean {
  return product.images.length > 0 || product.variants.some((v) => Boolean(v.imageUrl));
}

/**
 * Common entries from Google's product taxonomy, which Meta reads for the category. A merchant
 * can still type any other path; these are the ones most small shops need.
 */
export const PRODUCT_CATEGORIES: readonly string[] = [
  "Apparel & Accessories",
  "Apparel & Accessories > Clothing",
  "Apparel & Accessories > Clothing Accessories",
  "Apparel & Accessories > Handbags, Wallets & Cases",
  "Apparel & Accessories > Jewelry",
  "Apparel & Accessories > Shoes",
  "Animals & Pet Supplies",
  "Animals & Pet Supplies > Pet Supplies",
  "Arts & Entertainment",
  "Arts & Entertainment > Hobbies & Creative Arts",
  "Arts & Entertainment > Party & Celebration",
  "Baby & Toddler",
  "Business & Industrial",
  "Cameras & Optics",
  "Electronics",
  "Electronics > Audio",
  "Electronics > Communications",
  "Electronics > Computers",
  "Electronics > Electronics Accessories",
  "Food, Beverages & Tobacco",
  "Food, Beverages & Tobacco > Beverages",
  "Food, Beverages & Tobacco > Food Items",
  "Furniture",
  "Hardware",
  "Hardware > Tools",
  "Health & Beauty",
  "Health & Beauty > Health Care",
  "Health & Beauty > Personal Care",
  "Health & Beauty > Personal Care > Cosmetics",
  "Home & Garden",
  "Home & Garden > Decor",
  "Home & Garden > Decor > Home Fragrances",
  "Home & Garden > Household Supplies",
  "Home & Garden > Kitchen & Dining",
  "Home & Garden > Lawn & Garden",
  "Home & Garden > Lighting",
  "Home & Garden > Linens & Bedding",
  "Luggage & Bags",
  "Media > Books",
  "Office Supplies",
  "Software",
  "Sporting Goods",
  "Sporting Goods > Exercise & Fitness",
  "Sporting Goods > Outdoor Recreation",
  "Toys & Games",
  "Toys & Games > Games",
  "Toys & Games > Toys",
  "Vehicles & Parts > Vehicle Parts & Accessories",
];
