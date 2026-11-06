import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const client = vi.hoisted(() => ({ createWooOrder: vi.fn(), updateWooOrder: vi.fn() }));
vi.mock("./woocommerce.client.js", () => client);
vi.mock("./woocommerce.products.js", () => ({
  WOO_RETAILER_PREFIX: "wc_",
  connectedStore: vi.fn(async () => ({
    credential: { storeUrl: "https://shop.example.com" },
    client: {},
  })),
}));

const {
  cancelWooOrder,
  createWooCheckoutOrder,
  createWooWriteBackOrder,
  markWooOrderPaid,
  wooLineItem,
} = await import("./woocommerce.shopOrders.js");
const { isRateupWriteBack, rateupOrderIdOf } = await import("./woocommerce.mapping.js");

beforeEach(() => vi.clearAllMocks());

describe("RateUp lines as WooCommerce line items", () => {
  test("a variation names its parent product", () => {
    expect(wooLineItem({ productExternalId: "wc_10", retailerId: "wc_11", quantity: 2 })).toEqual({
      product_id: 10,
      variation_id: 11,
      quantity: 2,
    });
  });

  test("a simple product is its own product", () => {
    expect(
      wooLineItem({ productExternalId: "wc_12", retailerId: "wc_12", quantity: 1, total: 18 }),
    ).toEqual({ product_id: 12, quantity: 1, total: "18.00" });
  });

  test("refuses anything that isn't a WooCommerce product", () => {
    expect(() =>
      wooLineItem({ productExternalId: null, retailerId: "sku-1", quantity: 1 }),
    ).toThrow();
  });
});

describe("orders RateUp creates in WooCommerce", () => {
  test("a checkout is a pending order carrying the RateUp order id, paid on the store's page", async () => {
    client.createWooOrder.mockResolvedValue({ id: 77, order_key: "wc_order_k" });
    const result = await createWooCheckoutOrder("org-1", {
      rateupOrderId: "r-1",
      source: "ig_comment",
      lines: [{ productExternalId: "wc_12", retailerId: "wc_12", quantity: 1 }],
      phone: "15550100",
    });
    expect(result).toEqual({
      id: "77",
      number: null,
      payUrl: "https://shop.example.com/checkout/order-pay/77/?pay_for_order=true&key=wc_order_k",
    });
    const body = client.createWooOrder.mock.calls[0][1];
    expect(body).toMatchObject({
      status: "pending",
      set_paid: false,
      billing: { phone: "15550100" },
    });
    expect(body.billing.email).toBeUndefined();
    expect(rateupOrderIdOf(body)).toBe("r-1");
    expect(isRateupWriteBack(body)).toBe(false);
  });

  test("the address and delivery picked on RateUp's page go with it, since its page asks for neither", async () => {
    client.createWooOrder.mockResolvedValue({ id: 80, number: "1080", order_key: "k" });
    const address = {
      first_name: "Sam",
      address_1: "1 Main St",
      city: "Springfield",
      country: "US",
    };
    const result = await createWooCheckoutOrder("org-1", {
      rateupOrderId: "r-4",
      source: "storefront",
      lines: [{ productExternalId: "wc_12", retailerId: "wc_12", quantity: 1 }],
      address,
      email: "sam@example.com",
      shipping: { name: "Standard", price: 5 },
    });
    expect(result.number).toBe("1080");
    expect(client.createWooOrder.mock.calls[0][1]).toMatchObject({
      billing: { ...address, email: "sam@example.com" },
      shipping: address,
      shipping_lines: [{ method_id: "rateup", method_title: "Standard", total: "5.00" }],
    });
  });

  test("prefers the payment page WooCommerce names itself", async () => {
    client.createWooOrder.mockResolvedValue({
      id: 78,
      payment_url: "https://shop.example.com/pay/78",
    });
    const result = await createWooCheckoutOrder("org-1", {
      rateupOrderId: "r-2",
      source: "storefront",
      lines: [{ productExternalId: "wc_12", retailerId: "wc_12", quantity: 1 }],
    });
    expect(result.payUrl).toBe("https://shop.example.com/pay/78");
  });

  test("a written-back order is paid, with delivery, discount and tax as RateUp charged them", async () => {
    client.createWooOrder.mockResolvedValue({ id: 79 });
    await expect(
      createWooWriteBackOrder("org-1", {
        rateupOrderId: "r-3",
        paid: true,
        currency: "USD",
        paymentMethod: "stripe",
        lines: [{ productExternalId: "wc_10", retailerId: "wc_11", quantity: 1, total: 40 }],
        address: { first_name: "Sam", city: "Springfield", country: "US" },
        email: "sam@example.com",
        shipping: { name: "Standard", price: 5 },
        discount: 4,
        tax: 3.2,
      }),
    ).resolves.toEqual({ id: "79", number: null });
    expect(isRateupWriteBack(client.createWooOrder.mock.calls[0][1])).toBe(true);
    expect(client.createWooOrder.mock.calls[0][1]).toMatchObject({
      status: "processing",
      set_paid: true,
      billing: { first_name: "Sam", email: "sam@example.com" },
      shipping_lines: [{ method_id: "rateup", method_title: "Standard", total: "5.00" }],
      fee_lines: [
        { name: "Discount", total: "-4.00" },
        { name: "Tax", total: "3.20" },
      ],
      meta_data: [
        { key: "rateup_order_id", value: "r-3" },
        { key: "rateup_writeback", value: "1" },
      ],
    });
  });

  test("a cash order waits on hold, unpaid, until RateUp marks it paid", async () => {
    client.createWooOrder.mockResolvedValue({ id: 81 });
    await createWooWriteBackOrder("org-1", {
      rateupOrderId: "r-5",
      paid: false,
      currency: "USD",
      paymentMethod: "cod",
      lines: [{ productExternalId: "wc_12", retailerId: "wc_12", quantity: 1 }],
      address: { first_name: "Sam" },
    });
    expect(client.createWooOrder.mock.calls[0][1]).toMatchObject({
      status: "on-hold",
      set_paid: false,
    });
    await markWooOrderPaid("org-1", "81");
    expect(client.updateWooOrder).toHaveBeenCalledWith({}, "81", {
      status: "processing",
      set_paid: true,
    });
    await cancelWooOrder("org-1", "81");
    expect(client.updateWooOrder).toHaveBeenLastCalledWith({}, "81", { status: "cancelled" });
  });
});
