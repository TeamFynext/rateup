import { FastifyRequest } from "fastify";
import { QuestionType } from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../wa_axios.js";
import { getWaSettings } from "../settings/wa_settings.service.js";
import { sendMessage } from "../whatsappSurvey/wasurvey.service.js";
import { UpdateCatalogSettingsSchema } from "./catalog.schema.js";
import {
  WaFlowStatus,
  WaFlowFormElementType,
  CatalogPaymentMethod,
  CatalogAddressFlowStatus,
  CatalogOrderStage,
} from "../../../types/enums.js";

async function getWaSettingsForCatalog(catalogId: string, orgId: string) {
  const phoneMap = await prisma.catalogPhoneIdMap.findFirst({
    where: { catalogId },
    select: { whatsappSettingsPhoneId: true },
  });
  return await getWaSettings(orgId, phoneMap?.whatsappSettingsPhoneId ?? undefined);
}

// ─── Default address fields (Shopify shipping_address keys) ────────────────────
export const DEFAULT_ADDRESS_FIELDS = [
  {
    id: "first_name",
    label: "First Name",
    shopifyKey: "first_name",
    required: true,
    enabled: true,
    fixed: false,
  },
  {
    id: "last_name",
    label: "Last Name",
    shopifyKey: "last_name",
    required: false,
    enabled: true,
    fixed: false,
  },
  {
    id: "phone",
    label: "Phone Number",
    shopifyKey: "phone",
    required: true,
    enabled: true,
    fixed: true,
  },
  {
    id: "address1",
    label: "Address Line 1",
    shopifyKey: "address1",
    required: true,
    enabled: true,
    fixed: false,
  },
  {
    id: "address2",
    label: "Address Line 2",
    shopifyKey: "address2",
    required: false,
    enabled: true,
    fixed: false,
  },
  {
    id: "city",
    label: "City",
    shopifyKey: "city",
    required: true,
    enabled: true,
    fixed: false,
  },
  {
    id: "province",
    label: "State",
    shopifyKey: "province",
    required: true,
    enabled: true,
    fixed: false,
  },
  {
    id: "zip",
    label: "Pincode",
    shopifyKey: "zip",
    required: true,
    enabled: true,
    fixed: false,
  },
  {
    id: "country_code",
    label: "Country",
    shopifyKey: "country_code",
    required: true,
    enabled: true,
    fixed: true,
  },
];

// ─── Meta flow status → our internal status mapping ──────────────────────────
const META_STATUS_MAP: Record<string, string> = {
  PUBLISHED: CatalogAddressFlowStatus.APPROVED,
  APPROVED: CatalogAddressFlowStatus.APPROVED,
  DEPRECATED: CatalogAddressFlowStatus.REJECTED,
  BLOCKED: CatalogAddressFlowStatus.REJECTED,
  THROTTLED: CatalogAddressFlowStatus.REJECTED,
  DRAFT: CatalogAddressFlowStatus.IDLE,
  PENDING_MESSAGES_REVIEW: CatalogAddressFlowStatus.REVIEW,
};

/**
 * Checks Meta's Graph API for the real flow status and updates the DB if it changed.
 * Called automatically by getCatalogSettings when status is "review" or "submitting".
 */
async function checkFlowStatusFromMeta(
  catalogId: string,
  orgId: string,
  flowId: string,
): Promise<string | null> {
  try {
    const waSettings = await getWaSettingsForCatalog(catalogId, orgId);
    if (!waSettings?.accessToken) return null;

    const res = await callMetaApi(`/${flowId}?fields=status,name`, "GET", waSettings.accessToken);

    const metaStatus: string = res?.data?.status;
    if (!metaStatus) return null;

    const ourStatus = META_STATUS_MAP[metaStatus] ?? CatalogAddressFlowStatus.REVIEW;
    log.info(
      "Meta flow %s status: %s → our status: %s (catalog %s)",
      flowId,
      metaStatus,
      ourStatus,
      catalogId,
    );

    await prisma.whatsappCatalog.update({
      where: { catalogId },
      data: { addressFlowStatus: ourStatus },
    });

    return ourStatus;
  } catch (e) {
    log.warn({ err: e }, `Could not check Meta flow status for ${flowId}`);
    return null;
  }
}

// ─── Get catalog settings ──────────────────────────────────────────────────────
export async function getCatalogSettings(catalogId: string, orgId: string) {
  const catalog = await prisma.whatsappCatalog.findFirst({
    where: { catalogId, orgId },
    select: {
      catalogId: true,
      orgId: true,
      storeType: true,
      paymentMethod: true,
      standardPaymentConfig: true,
      collectAddress: true,
      collectDelivery: true,
      fixedDeliveryCharge: true,
      fixedDeliveryAmount: true,
      addressFlowId: true,
      addressFlowDbId: true,
      addressFlowStatus: true,
      addressFlowFields: true,
      deliveryOptions: true,
    },
  });
  // Same message whether the id does not exist or belongs to another org.
  if (!catalog) throw new Error("Catalog not found");

  // ── Auto-sync: if flow is under review or submitting, check Meta for updates ──
  let liveFlowStatus = catalog.addressFlowStatus;
  if (
    catalog.addressFlowId &&
    (catalog.addressFlowStatus === CatalogAddressFlowStatus.REVIEW ||
      catalog.addressFlowStatus === CatalogAddressFlowStatus.SUBMITTING)
  ) {
    const updated = await checkFlowStatusFromMeta(catalogId, catalog.orgId, catalog.addressFlowId);
    if (updated) liveFlowStatus = updated;
  }

  return {
    ...catalog,
    addressFlowStatus: liveFlowStatus,
    addressFlowFields: catalog.addressFlowFields ?? DEFAULT_ADDRESS_FIELDS,
    deliveryOptions: catalog.deliveryOptions ?? [],
  };
}

// Update catalog settings
export async function updateCatalogSettings(
  catalogId: string,
  orgId: string,
  data: UpdateCatalogSettingsSchema,
) {
  // Ownership confirmed before the write: these are commerce settings (payment method,
  // delivery charges, address collection), so another org rewriting them is a real
  // change to how that org takes money.
  const owned = await prisma.whatsappCatalog.findFirst({
    where: { catalogId, orgId },
    select: { catalogId: true },
  });
  if (!owned) {
    throw new Error("Catalog not found");
  }

  return await prisma.whatsappCatalog.update({
    where: { catalogId },
    data: {
      ...(data.storeType !== undefined && { storeType: data.storeType }),
      ...(data.paymentMethod !== undefined && {
        paymentMethod: data.paymentMethod,
      }),
      ...(data.standardPaymentConfig !== undefined && {
        standardPaymentConfig: data.standardPaymentConfig,
      }),
      ...(data.collectAddress !== undefined && {
        collectAddress: data.collectAddress,
      }),
      ...(data.collectDelivery !== undefined && {
        collectDelivery: data.collectDelivery,
      }),
      ...(data.fixedDeliveryCharge !== undefined && {
        fixedDeliveryCharge: data.fixedDeliveryCharge,
      }),
      ...(data.fixedDeliveryAmount !== undefined && {
        fixedDeliveryAmount: data.fixedDeliveryAmount,
      }),
      ...(data.deliveryOptions !== undefined && {
        deliveryOptions: data.deliveryOptions,
      }),
    },
  });
}

// ─── Create address flow in Meta + save to DB ─────────────────────────────────
export async function createAddressFlow(
  orgId: string,
  userId: string,
  catalogId: string,
  req: FastifyRequest,
  json?: WaFlowJson,
  map?: WaFlowMap,
) {
  let catalog;
  try {
    catalog = await prisma.whatsappCatalog.update({
      where: { catalogId },
      data: { addressFlowStatus: CatalogAddressFlowStatus.SUBMITTING },
      select: { addressFlowFields: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new Error(`Catalog ${catalogId} not found`);
    }
    throw e;
  }

  try {
    const fields =
      (catalog.addressFlowFields as typeof DEFAULT_ADDRESS_FIELDS) ?? DEFAULT_ADDRESS_FIELDS;
    const enabledFields = fields.filter((f) => f.enabled && f.shopifyKey !== "country_code");

    const uniqueSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const uniqueFlowName = `Address Form ${catalogId.substring(0, 8)} ${uniqueSuffix}`;

    // 1. Create Base Flow in Meta
    const { createFlowInWa, createFlowCopyInDb, syncLocalFlowToWhatsapp } =
      await import("../flows/flow.service.js");
    const { createSurveyFromFlow } = await import("../flows/flow.utils.js");

    const { id: flowId } = await createFlowInWa(orgId, {
      name: uniqueFlowName,
      categories: ["OTHER"],
    });
    log.info("Created WA address flow %s for catalog %s", flowId, catalogId);

    // 2. Build initial RateUp Flow JSON & FlowMap from address fields (default if not provided)
    const formChildren: WaFlowFormElement[] = enabledFields.map((f) => ({
      type: WaFlowFormElementType.textInput,
      name: f.shopifyKey,
      label: f.label,
      required: f.required,
      "input-type": f.shopifyKey === "phone" ? "phone" : "text",
      ...(f.shopifyKey === "address2" && {
        "helper-text": "Optional — landmark, apartment, etc.",
      }),
    }));

    const payloadMap: Record<string, string> = {};
    enabledFields.forEach((f) => {
      payloadMap[f.shopifyKey] = `\${form.${f.shopifyKey}}`;
    });
    payloadMap["country_code"] = "IN";

    const baseFlowJson: WaFlowJson = {
      version: "7.2",
      screens: [
        {
          id: "ADDRESS_SCREEN",
          title: "Shipping Address",
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                type: "Form",
                name: "form",
                children: [
                  ...formChildren,
                  {
                    type: WaFlowFormElementType.footer,
                    label: "Confirm Address",
                    "on-click-action": {
                      name: "complete",
                      payload: payloadMap,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const initialFlowMap: WaFlowMapDraft = {};
    enabledFields.forEach((f) => {
      initialFlowMap[f.shopifyKey] = {
        // "ShortText" was written here before, which is not a QuestionType — the
        // Survey questions this map creates ended up with a type outside the enum.
        type: f.shopifyKey === "phone" ? QuestionType.Phone : QuestionType.Text,
      };
    });

    const finalFlowJson = json ?? baseFlowJson;
    const finalFlowMap = map ?? initialFlowMap;

    // 3. Delegate to RateUp flow module to create Survey & internal Questions magically
    const team = await prisma.team.findFirst({ where: { orgId } });
    const firstUser = await prisma.user.findFirst({
      where: { org: { some: { id: orgId } } },
    });
    if (!firstUser) throw new Error("No user found in org to own the flow survey.");

    const { survey, flowMap: flowMapWithQuestionId } = await createSurveyFromFlow({
      flowJson: finalFlowJson,
      flowMap: finalFlowMap,
      req,
      teamIds: team ? [team.id] : [],
      title: uniqueFlowName,
      orgId,
    });

    // 4. Create internal DB flow abstraction
    const dbFlow = await createFlowCopyInDb({
      orgId,
      flowId,
      json: finalFlowJson,
      flowMap: flowMapWithQuestionId,
      surveyId: survey.id,
      status: WaFlowStatus.DRAFT,
      name: uniqueFlowName,
      version: 2,
    });

    // 5. Sync completely to Meta without dealing with assets/endpoints directly 🎉
    await syncLocalFlowToWhatsapp(orgId, dbFlow.dbFlowId);

    await prisma.whatsappCatalog.update({
      where: { catalogId },
      data: {
        addressFlowId: flowId,
        addressFlowDbId: dbFlow.dbFlowId,
        addressFlowStatus: CatalogAddressFlowStatus.REVIEW,
      },
    });

    log.info(
      "Address flow %s (DB: %s) synced & submitted (catalog %s)",
      flowId,
      dbFlow.dbFlowId,
      catalogId,
    );
    return {
      flowId,
      dbFlowId: dbFlow.dbFlowId,
      status: CatalogAddressFlowStatus.REVIEW,
    };
  } catch (e) {
    log.error({ err: e }, `Failed to create address flow for catalog ${catalogId}`);
    await prisma.whatsappCatalog.update({
      where: { catalogId },
      data: { addressFlowStatus: CatalogAddressFlowStatus.IDLE },
    });
    throw e;
  }
}

// ─── Send address WA Flow to customer ─────────────────────────────────────────
export async function sendAddressFlowToCustomer({
  orgId,
  phone,
  orderId,
  waFlowId,
  whatsappSettingsPhoneId,
}: {
  orgId: string;
  phone: string;
  orderId: string;
  waFlowId: string;
  whatsappSettingsPhoneId?: string;
}) {
  await sendMessage(
    orgId,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "interactive",
      interactive: {
        type: "flow",
        header: { type: "text", text: "📦 Complete Your Order" },
        body: {
          text: "Please fill in your shipping address to continue with your order.",
        },
        footer: { text: "Powered by RateUp" },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token: orderId,
            flow_id: waFlowId,
            flow_cta: "Enter Address",
            flow_action: "navigate",
            flow_action_payload: { screen: "ADDRESS_SCREEN" },
          },
        },
      },
    },
    undefined,
    undefined,
    whatsappSettingsPhoneId,
  );
}

// ─── Send delivery list message to customer ────────────────────────────────────
export async function sendDeliveryListMessage({
  orgId,
  phone,
  deliveryOptions,
  whatsappSettingsPhoneId,
}: {
  orgId: string;
  phone: string;
  deliveryOptions: WaCatalogDeliveryOption[];
  whatsappSettingsPhoneId?: string;
}) {
  const enabledOptions = deliveryOptions.filter((o) => o.enabled);
  if (enabledOptions.length === 0) {
    log.warn("No enabled delivery options for org %s", orgId);
    return false;
  }

  const rows = enabledOptions.map((o) => ({
    id: `delivery_${o.id}`,
    title: `${o.name} — ₹${o.charge}`,
    ...(o.days && { description: `Est. delivery: ${o.days} days` }),
  }));

  await sendMessage(
    orgId,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: "🚚 Choose Delivery" },
        body: { text: "Please select your preferred delivery partner:" },
        footer: { text: "Prices include delivery charges" },
        action: {
          button: "Select Delivery",
          sections: [{ title: "Available Options", rows }],
        },
      },
    },
    undefined,
    undefined,
    whatsappSettingsPhoneId,
  );
  return true;
}

// ─── Calculate order total (products + optional delivery) ─────────────────────
export function calculateOrderTotal(
  // Only the priced fields are read, so partially-populated lines are fine.
  products: Array<Pick<WaCatalogOrderProduct, "price" | "quantity">>,
  // Only the charge is read here.
  deliveryOption?: Pick<WaCatalogDeliveryOption, "charge"> | null,
): number {
  const itemsTotal = products.reduce((sum: number, p) => {
    const price = parseFloat(String(p.price ?? "0")) || 0;
    // parseInt, not parseFloat, is deliberate: WhatsApp catalog orders arrive from Meta
    // with whole-unit quantities, so a fraction cannot currently reach here. Switch to
    // parseFloat only if something is ever sold by weight or length — it changes order
    // totals, so it is a money-affecting change, not a tidy-up.
    const qty = parseInt(String(p.quantity ?? "1")) || 1;
    return sum + price * qty;
  }, 0);
  const deliveryCharge = deliveryOption?.charge ?? 0;
  return Math.round((itemsTotal + deliveryCharge) * 100) / 100;
}

/**
 * Order lines are persisted with `price`/`quantity` as strings on some paths
 * (the WhatsApp order webhook) and as numbers on others. Shopify's Admin API
 * and the native-payment builder both require numbers, so coerce once here
 * rather than passing whatever happened to be stored.
 */
function toNumericOrderLines(products: WaCatalogOrderProduct[]): Array<{
  retailerId: string;
  currency: string;
  quantity: number;
  price: number;
  title?: string;
}> {
  return products.map((p) => ({
    ...p,
    quantity: parseInt(String(p.quantity ?? "1")) || 1,
    price: parseFloat(String(p.price ?? "0")) || 0,
  }));
}

// ─── Build order summary lines ────────────────────────────────────────────────
function buildOrderSummaryLines(
  products: Array<Pick<WaCatalogOrderProduct, "title" | "retailerId" | "price" | "quantity">>,
): string {
  return products
    .map(
      (p) =>
        `• ${p.title ?? p.retailerId} ×${p.quantity ?? 1} — ₹${parseFloat(String(p.price ?? 0)).toFixed(2)}`,
    )
    .join("\n");
}

// ─── Handle payment dispatch (final step after address+delivery resolved) ──────
/**
 * Called once we know the final total (products + delivery).
 * Branches based on catalog paymentMethod.
 */
export async function dispatchPaymentMessage(
  order: {
    id: string;
    products: WaCatalogOrderProduct[];
    shippingAddress?: WaCatalogShippingAddress | null;
    deliveryOption?: WaCatalogSelectedDelivery | null;
    catalogId: string;
    contactId: string;
  },
  catalog: {
    orgId: string;
    storeType?: string | null;
    paymentMethod?: string | null;
    standardPaymentConfig?: WaCatalogPaymentConfig | null;
  },
  contactPhone: string,
  whatsappSettingsPhoneId?: string,
) {
  const totalAmount = calculateOrderTotal(order.products, order.deliveryOption);
  const orderSummary = buildOrderSummaryLines(order.products);
  const deliveryLine = order.deliveryOption
    ? `\n🚚 *Delivery:* ${order.deliveryOption.name} — ₹${order.deliveryOption.charge}`
    : "";
  const method = catalog.paymentMethod ?? CatalogPaymentMethod.MANUAL;
  const config = catalog.standardPaymentConfig ?? {};

  let messageBody = "";

  // ── Shopify Checkout Link (Web Checkout) ──────────────────────────────────
  if (method === CatalogPaymentMethod.SHOPIFY_CHECKOUT) {
    try {
      const { createShopifyDraftOrderWithAddress } =
        await import("../../integrations/shopify/shopify.service.js");
      const draftOrder = await createShopifyDraftOrderWithAddress(
        catalog.orgId,
        toNumericOrderLines(order.products),
        order.shippingAddress,
        order.deliveryOption,
      );
      if (draftOrder) {
        await prisma.waCatalogOrder.update({
          where: { id: order.id },
          data: {
            shopifyDraftOrderId: String(draftOrder.id),
            shopifyInvoiceUrl: draftOrder.invoice_url ?? null,
            orderStage: CatalogOrderStage.PENDING_CHECKOUT,
            deliveryOption: order.deliveryOption ?? Prisma.DbNull,
          },
        });
        await sendMessage(
          catalog.orgId,
          {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: contactPhone,
            type: "text",
            text: {
              body:
                `✅ *Order Summary*\n\n${orderSummary}${deliveryLine}\n` +
                `💰 *Total: ₹${totalAmount}*\n\n` +
                `Complete your purchase here:\n${draftOrder.invoice_url}`,
              preview_url: true,
            },
          },
          undefined,
          undefined,
          whatsappSettingsPhoneId,
        );
      }
    } catch (e) {
      log.error({ err: e }, `Shopify draft order failed for order ${order.id}`);
    }
    return;
  }

  // ── Shopify Native Payment (WhatsApp Native Pay) ──────────────────────────
  if (method === CatalogPaymentMethod.SHOPIFY_NATIVE) {
    try {
      const { createShopifyDraftOrderWithAddress } =
        await import("../../integrations/shopify/shopify.service.js");
      const draftOrder = await createShopifyDraftOrderWithAddress(
        catalog.orgId,
        toNumericOrderLines(order.products),
        order.shippingAddress,
        order.deliveryOption,
      );
      if (draftOrder) {
        await prisma.waCatalogOrder.update({
          where: { id: order.id },
          data: {
            shopifyDraftOrderId: String(draftOrder.id),
            shopifyInvoiceUrl: draftOrder.invoice_url ?? null,
            orderStage: CatalogOrderStage.PENDING_PAYMENT,
            deliveryOption: order.deliveryOption ?? Prisma.DbNull,
          },
        });
      }
      const { getWaSettingsByPhoneId } = await import("../settings/wa_settings.service.js");
      const { handleWaOrderNativePayment } = await import("./catalog.service.js");
      const waSettings = whatsappSettingsPhoneId
        ? await getWaSettingsByPhoneId(whatsappSettingsPhoneId)
        : null;
      if (waSettings) {
        await handleWaOrderNativePayment(
          catalog.orgId,
          contactPhone,
          order.catalogId,
          toNumericOrderLines(order.products),
          waSettings,
          order.id,
          order.deliveryOption,
        );
      } else {
        log.error(
          "waSettings not found for phoneId %s during Shopify Native payment",
          whatsappSettingsPhoneId,
        );
      }
    } catch (e) {
      log.error({ err: e }, `Shopify native payment dispatch failed for order ${order.id}`);
    }
    return;
  }

  // ── Standard modes ────────────────────────────────────────────────────────
  switch (method) {
    case CatalogPaymentMethod.UPI: {
      const upiId = config.upiId ?? "";
      const upiName = encodeURIComponent(config.upiDisplayName ?? "Store");
      const upiLink = `upi://pay?pa=${upiId}&pn=${upiName}&am=${totalAmount}&cu=INR`;
      messageBody =
        `🛍️ *Order Summary*\n${orderSummary}${deliveryLine}\n` +
        `💰 *Total: ₹${totalAmount}*\n\n` +
        `💳 *Pay via UPI:*\n${upiLink}`;
      await prisma.waCatalogOrder.update({
        where: { id: order.id },
        data: {
          orderStage: CatalogOrderStage.PENDING_PAYMENT,
          deliveryOption: order.deliveryOption ?? Prisma.DbNull,
        },
      });
      break;
    }
    case CatalogPaymentMethod.COD: {
      messageBody =
        `✅ *Order Confirmed!*\n\n${orderSummary}${deliveryLine}\n` +
        `💰 *Total: ₹${totalAmount}*\n\n` +
        `💵 Payment: *Cash on Delivery*\nOur team will contact you to arrange delivery.`;
      await prisma.waCatalogOrder.update({
        where: { id: order.id },
        data: {
          orderStage: CatalogOrderStage.COMPLETED,
          deliveryOption: order.deliveryOption ?? Prisma.DbNull,
        },
      });
      break;
    }
    case CatalogPaymentMethod.BANK: {
      messageBody =
        `🛍️ *Order Summary*\n${orderSummary}${deliveryLine}\n` +
        `💰 *Total: ₹${totalAmount}*\n\n` +
        `🏦 *Bank Transfer Details:*\n` +
        `Account: ${config.accountNumber ?? ""}\n` +
        `IFSC: ${config.ifsc ?? ""}\n` +
        `Bank: ${config.bankName ?? ""}\n` +
        `Holder: ${config.holderName ?? ""}\n\n` +
        `Please transfer and share the payment screenshot.`;
      await prisma.waCatalogOrder.update({
        where: { id: order.id },
        data: {
          orderStage: CatalogOrderStage.PENDING_PAYMENT,
          deliveryOption: order.deliveryOption ?? Prisma.DbNull,
        },
      });
      break;
    }
    case CatalogPaymentMethod.NATIVE: {
      await prisma.waCatalogOrder.update({
        where: { id: order.id },
        data: {
          orderStage: CatalogOrderStage.PENDING_PAYMENT,
          deliveryOption: order.deliveryOption ?? Prisma.DbNull,
        },
      });
      try {
        const { getWaSettingsByPhoneId } = await import("../settings/wa_settings.service.js");
        const { handleWaOrderNativePayment } = await import("./catalog.service.js");
        const waSettings = whatsappSettingsPhoneId
          ? await getWaSettingsByPhoneId(whatsappSettingsPhoneId)
          : null;
        if (waSettings) {
          await handleWaOrderNativePayment(
            catalog.orgId,
            contactPhone,
            order.catalogId,
            toNumericOrderLines(order.products),
            waSettings,
            order.id,
            order.deliveryOption,
          );
        } else {
          log.error(
            "waSettings not found for phoneId %s during Standard Native payment",
            whatsappSettingsPhoneId,
          );
        }
      } catch (e) {
        log.error({ err: e }, `Standard native payment dispatch failed for order ${order.id}`);
      }
      break;
    }
    default: {
      // manual
      messageBody =
        `✅ *Order Received!*\n\n${orderSummary}${deliveryLine}\n` +
        `💰 *Total: ₹${totalAmount}*\n\nOur team will reach out to confirm and arrange payment.`;
      await prisma.waCatalogOrder.update({
        where: { id: order.id },
        data: {
          orderStage: CatalogOrderStage.COMPLETED,
          deliveryOption: order.deliveryOption ?? Prisma.DbNull,
        },
      });
      break;
    }
  }

  if (messageBody) {
    await sendMessage(
      catalog.orgId,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: contactPhone,
        type: "text",
        text: { body: messageBody },
      },
      undefined,
      undefined,
      whatsappSettingsPhoneId,
    );
  }
}

// ─── Handle incoming WA Flow response (address submission) ────────────────────
/**
 * Called when a customer submits the address flow (nfm_reply).
 * flow_token is the orderId.
 */
export async function handleAddressFlowResponse({
  orgId,
  orderId,
  addressData,
  contactPhone,
  whatsappSettingsPhoneId,
}: {
  orgId: string;
  orderId: string;
  addressData: Record<string, string>;
  contactPhone: string;
  whatsappSettingsPhoneId?: string;
}) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    log.warn("Invalid orderId format (not a UUID): %s", orderId);
    return false;
  }
  const order = await prisma.waCatalogOrder.findFirst({
    where: { id: orderId, orderStage: CatalogOrderStage.PENDING_ADDRESS },
  });
  if (!order) {
    log.warn("No PENDING_ADDRESS order found with id %s", orderId);
    return false;
  }

  // Save address
  const updatedOrder = await prisma.waCatalogOrder.update({
    where: { id: orderId },
    data: {
      shippingAddress: addressData,
      orderStage: CatalogOrderStage.PENDING_DELIVERY,
    },
  });

  const catalog = await prisma.whatsappCatalog.findUnique({
    where: { catalogId: order.catalogId },
    select: {
      orgId: true,
      storeType: true,
      paymentMethod: true,
      standardPaymentConfig: true,
      collectDelivery: true,
      deliveryOptions: true,
      fixedDeliveryCharge: true,
      fixedDeliveryAmount: true,
    },
  });
  if (!catalog) return false;

  let deliveryOptions = catalog.deliveryOptions ?? [];
  if (catalog.storeType === "shopify" || catalog.storeType === "SHOPIFY") {
    try {
      const { fetchShopifyShippingRates } =
        await import("../../integrations/shopify/shopify.service.js");
      const shopifyRates = await fetchShopifyShippingRates(
        orgId,
        toNumericOrderLines(order.products),
        addressData,
      );
      if (shopifyRates && shopifyRates.length > 0) {
        deliveryOptions = shopifyRates;
      }
    } catch (e) {
      log.error({ err: e }, "Failed to fetch Shopify shipping rates dynamically");
    }
  }

  const shouldAskDelivery =
    catalog.collectDelivery &&
    !catalog.fixedDeliveryCharge &&
    deliveryOptions.some((o) => o.enabled);

  if (shouldAskDelivery) {
    await sendDeliveryListMessage({
      orgId,
      phone: contactPhone,
      deliveryOptions,
      whatsappSettingsPhoneId,
    });
    log.info("Delivery list sent for order %s", orderId);
  } else {
    // No delivery selection needed — go straight to payment
    const fixedOption = catalog.fixedDeliveryCharge
      ? { name: "Fixed Delivery", charge: catalog.fixedDeliveryAmount ?? 0 }
      : null;

    await dispatchPaymentMessage(
      {
        id: orderId,
        products: updatedOrder.products,
        shippingAddress: addressData,
        deliveryOption: fixedOption,
        catalogId: order.catalogId,
        contactId: order.contactId,
      },
      catalog,
      contactPhone,
      whatsappSettingsPhoneId,
    );
  }

  return true;
}

// ─── Handle incoming delivery list_reply from customer ────────────────────────
export async function handleDeliveryListReply({
  orgId,
  contactPhone,
  listReplyId,
  whatsappSettingsPhoneId,
}: {
  orgId: string;
  contactPhone: string;
  listReplyId: string;
  whatsappSettingsPhoneId?: string;
}) {
  if (!listReplyId.startsWith("delivery_")) return false;

  const order = await prisma.waCatalogOrder.findFirst({
    where: {
      contact: {
        phone: contactPhone,
        orgId,
      },
      orderStage: CatalogOrderStage.PENDING_DELIVERY,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!order) return false;

  const catalog = await prisma.whatsappCatalog.findUnique({
    where: { catalogId: order.catalogId },
    select: {
      orgId: true,
      storeType: true,
      paymentMethod: true,
      standardPaymentConfig: true,
      deliveryOptions: true,
    },
  });
  if (!catalog) return false;

  let deliveryOptions = catalog.deliveryOptions ?? [];
  if (catalog.storeType === "shopify" || catalog.storeType === "SHOPIFY") {
    try {
      const { fetchShopifyShippingRates } =
        await import("../../integrations/shopify/shopify.service.js");
      // Shopify prices delivery against a destination, so without a stored
      // address there is nothing to quote (previously null was passed through).
      const shopifyRates = order.shippingAddress
        ? await fetchShopifyShippingRates(
            orgId,
            toNumericOrderLines(order.products),
            order.shippingAddress,
          )
        : null;
      if (shopifyRates && shopifyRates.length > 0) {
        deliveryOptions = shopifyRates;
      }
    } catch (e) {
      log.error({ err: e }, "Failed to fetch Shopify shipping rates dynamically on reply");
    }
  }

  const optionId = listReplyId.replace("delivery_", "");
  const selectedOption = deliveryOptions.find((o) => String(o.id) === optionId && o.enabled);
  if (!selectedOption) return false;

  const updatedOrder = await prisma.waCatalogOrder.update({
    where: { id: order.id },
    data: {
      deliveryOption: selectedOption,
      orderStage: CatalogOrderStage.PENDING_PAYMENT,
    },
  });

  log.info("Delivery '%s' selected for order %s", selectedOption.name, order.id);

  await dispatchPaymentMessage(
    {
      id: order.id,
      products: updatedOrder.products,
      shippingAddress: updatedOrder.shippingAddress,
      deliveryOption: selectedOption,
      catalogId: order.catalogId,
      contactId: order.contactId,
    },
    catalog,
    contactPhone,
    whatsappSettingsPhoneId,
  );

  return true;
}
