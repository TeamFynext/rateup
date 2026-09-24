import { beforeEach, describe, expect, test, vi } from "vitest";

const db = {
  waCatalogOrder: { findFirst: vi.fn(), update: vi.fn() },
  waTemplate: { findFirst: vi.fn() },
};
vi.mock("../../../utils/prisma.js", () => ({ default: db, excludeFields: vi.fn() }));

const sendMessage = vi.fn();
vi.mock("./wasurvey.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendMessage,
}));
const captureShopifyOrderPayment = vi.fn();
vi.mock("../../integrations/shopify/shopify.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  captureShopifyOrderPayment,
}));

const { handlePaymentConfirmation } = await import("./wasurvey.utils.js");

beforeEach(() => {
  vi.clearAllMocks();
  db.waTemplate.findFirst.mockResolvedValue(null);
});

describe("handlePaymentConfirmation", () => {
  // The order is what names the paid org. There used to be a ROOT_ORG fallback,
  // which answered an unmatched payment from RateUp's own number.
  test("sends nothing for a payment that matches no order", async () => {
    db.waCatalogOrder.findFirst.mockResolvedValue(null);

    await expect(handlePaymentConfirmation("919188346187", "ref-1")).resolves.toBeUndefined();

    expect(sendMessage).not.toHaveBeenCalled();
    expect(db.waTemplate.findFirst).not.toHaveBeenCalled();
    expect(db.waCatalogOrder.update).not.toHaveBeenCalled();
  });

  test("marks the order paid and confirms from the order's own org", async () => {
    db.waCatalogOrder.findFirst.mockResolvedValue({
      id: "order-1",
      shopifyDraftOrderId: null,
      catalog: { orgId: "org-1" },
    });
    db.waTemplate.findFirst.mockResolvedValue({
      data: { components: [{ type: "BODY", text: "Thanks, your order is confirmed." }] },
    });

    await handlePaymentConfirmation("919188346187", "ref-1");

    expect(db.waCatalogOrder.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { paymentStatus: "PAID", orderStage: "COMPLETED" },
    });
    expect(db.waTemplate.findFirst).toHaveBeenCalledWith({
      where: { orgId: "org-1", templateType: expect.anything() },
    });
    const [orgId, message] = sendMessage.mock.calls[0];
    expect(orgId).toBe("org-1");
    expect(message.interactive.body.text).toBe("Thanks, your order is confirmed.");
  });
});
