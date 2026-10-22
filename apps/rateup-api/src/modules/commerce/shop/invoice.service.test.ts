import { beforeEach, describe, expect, test, vi } from "vitest";

interface Row {
  id: string;
  storeId: string;
  paymentStatus: string;
  invoiceNumber: string | null;
  invoiceIssuedAt: Date | null;
  invoiceKey: string | null;
  invoiceSentAt: Date | null;
  checkoutVia?: string;
}

/**
 * An in-memory order table behind a transaction whose `FOR UPDATE` really blocks: a second
 * transaction on the same order waits until the first one ends, as Postgres would make it.
 */
const state = vi.hoisted(() => ({
  orders: new Map<string, Row>(),
  seq: 0,
  autoSend: true,
  logoUrl: null as string | null,
  prefix: "INV-",
  locks: new Map<string, Promise<void>>(),
}));

const db = vi.hoisted(() => {
  const tick = () => new Promise((r) => setTimeout(r, 1));
  const select = (row: Row) => ({
    ...row,
    orgId: "org",
    number: 1001,
    channel: "WHATSAPP",
    channelAccountId: "phone-1",
    contactId: "c1",
    customerPhone: "+15555550164",
    checkoutToken: "tok",
    store: { name: "Fern", invoiceAutoSend: state.autoSend },
  });
  const shopOrder = {
    findFirst: vi.fn(
      async ({ where }: { where: { storeId: string; invoiceNumber: string } }) =>
        [...state.orders.values()].find(
          (o) => o.storeId === where.storeId && o.invoiceNumber === where.invoiceNumber,
        ) ?? null,
    ),
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      const row = state.orders.get(where.id);
      return row ? select(row) : null;
    }),
    findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
      const row = state.orders.get(where.id);
      if (!row) throw new Error("missing");
      return {
        ...select(row),
        store: {
          name: "Fern",
          logoUrl: state.logoUrl,
          businessAddress: null,
          taxId: null,
          taxRate: null,
          pricesIncludeTax: true,
        },
        items: [],
        currency: "USD",
      };
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
      await tick();
      Object.assign(state.orders.get(where.id)!, data);
    }),
    updateMany: vi.fn(
      async ({ where, data }: { where: { id: string } & Partial<Row>; data: Partial<Row> }) => {
        const row = state.orders.get(where.id)!;
        const guard = Object.entries(where).filter(([k]) => k !== "id");
        if (!guard.every(([k, v]) => row[k as keyof Row] === v)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    ),
  };
  const shopOrderEvent = { create: vi.fn(), findFirst: vi.fn() };
  return {
    shopOrder,
    shopOrderEvent,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const held: string[] = [];
      const releases: (() => void)[] = [];
      const tx = {
        shopOrder,
        shopOrderEvent,
        shopStore: {
          update: vi.fn(async () => {
            await tick();
            state.seq += 1;
            return { invoiceNumberSeq: state.seq, invoicePrefix: state.prefix };
          }),
        },
        $queryRaw: vi.fn(async (_strings: TemplateStringsArray, id: string) => {
          while (state.locks.has(id)) await state.locks.get(id);
          let release!: () => void;
          state.locks.set(id, new Promise<void>((r) => (release = r)));
          held.push(id);
          releases.push(release);
        }),
      };
      try {
        return await fn(tx);
      } finally {
        for (const id of held) state.locks.delete(id);
        for (const r of releases) r();
      }
    }),
  };
});

const notify = vi.hoisted(() => ({ sendShopMessage: vi.fn() }));
const s3 = vi.hoisted(() => ({
  uploadFile: vi.fn(async () => ({})),
  privateBucket: () => "private-bucket",
  signedFileUrl: vi.fn(
    async (key: string, o: { expiresIn: number }) =>
      `https://s3.test/${key}?expires=${o.expiresIn}`,
  ),
}));
const fetcher = vi.hoisted(() => ({ fetchPublicBytes: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../utils/upload/s3Upload.js", () => s3);
vi.mock("./notify.js", () => notify);
vi.mock("../../../utils/publicFetch.js", () => fetcher);
vi.mock("./invoice.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./invoice.js")>()),
  buildInvoicePdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
}));

const { issueInvoiceNumber, sendInvoice, ensureInvoice, openInvoice } =
  await import("./invoice.service.js");

const paidOrder = (id: string): Row => ({
  id,
  storeId: "s1",
  paymentStatus: "PAID",
  invoiceNumber: null,
  invoiceIssuedAt: null,
  invoiceKey: null,
  invoiceSentAt: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.orders.clear();
  state.locks.clear();
  state.seq = 0;
  state.autoSend = true;
  state.logoUrl = null;
  state.prefix = "INV-";
  db.shopOrderEvent.findFirst.mockResolvedValue(null);
  notify.sendShopMessage.mockResolvedValue({ sent: true, channel: "WHATSAPP" });
});

describe("invoice numbers", () => {
  test("racing callers give each order exactly one number, all distinct", async () => {
    for (const id of ["a", "b", "c", "d"]) state.orders.set(id, paidOrder(id));

    const results = await Promise.all(
      ["a", "b", "c", "d", "a", "b", "c", "d", "a"].map((id) =>
        issueInvoiceNumber(id).then((r) => [id, r.number] as const),
      ),
    );

    const perOrder = new Map<string, Set<string>>();
    for (const [id, n] of results) perOrder.set(id, (perOrder.get(id) ?? new Set()).add(n));
    for (const numbers of perOrder.values()) expect(numbers.size).toBe(1);
    const all = [...perOrder.values()].map((s) => [...s][0]).sort();
    expect(all).toEqual(["INV-0001", "INV-0002", "INV-0003", "INV-0004"]);
    expect(state.seq).toBe(4);
  });

  test("a number an edited prefix already used is skipped, not a permanent failure", async () => {
    state.orders.set("old", { ...paidOrder("old"), invoiceNumber: "INV-10001" });
    state.orders.set("a", paidOrder("a"));
    state.prefix = "INV-1";
    state.seq = 0;
    // "INV-1" + "0001" collides with the old "INV-" + "10001".
    const { number } = await issueInvoiceNumber("a");
    expect(number).toBe("INV-10002");
  });

  test("the invoice is drawn from what the order said when it was numbered", async () => {
    state.orders.set("a", paidOrder("a"));
    await issueInvoiceNumber("a");
    const snapshot = db.shopOrderEvent.create.mock.calls[0][0].data;
    expect(snapshot).toMatchObject({ type: "invoice_numbered" });
    db.shopOrderEvent.findFirst.mockResolvedValue({
      data: { ...snapshot.data, order: { ...snapshot.data.order, customerName: "Then" } },
    });
    const { buildInvoicePdf } = await import("./invoice.js");
    await ensureInvoice("a");
    expect(vi.mocked(buildInvoicePdf).mock.calls[0][0].order.customerName).toBe("Then");
  });

  test("an order paid on the Shopify checkout gets no second invoice from RateUp", async () => {
    state.orders.set("a", { ...paidOrder("a"), checkoutVia: "SHOPIFY" });
    await expect(ensureInvoice("a")).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("Shopify"),
    });
    expect(state.seq).toBe(0);
  });

  test("an unpaid order gets no invoice", async () => {
    state.orders.set("a", { ...paidOrder("a"), paymentStatus: "UNPAID" });
    await expect(ensureInvoice("a")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.seq).toBe(0);
  });
});

describe("sending the invoice", () => {
  test("goes out once however often the job runs", async () => {
    state.orders.set("a", paidOrder("a"));

    const first = await sendInvoice("a");
    const second = await sendInvoice("a");

    expect(first).toMatchObject({ sent: true, number: "INV-0001" });
    expect(second).toMatchObject({ sent: false, reason: "already_sent" });
    expect(notify.sendShopMessage).toHaveBeenCalledTimes(1);
    expect(s3.uploadFile).toHaveBeenCalledTimes(1);
    const [, message] = notify.sendShopMessage.mock.calls[0];
    expect(message.document).toMatchObject({ filename: "INV-0001.pdf", label: "View invoice" });
    // WhatsApp gets a day-long signed link; the DM button goes through the token route.
    expect(message.document.url).toMatch(
      /^https:\/\/s3\.test\/shop-invoices\/org\/.*expires=86400$/,
    );
    expect(message.document.linkUrl).toMatch(/\/api\/public\/shop\/checkout\/tok\/invoice$/);
  });

  test("hands the claim back and throws when the channel refuses, so the queue retries", async () => {
    state.orders.set("a", paidOrder("a"));
    notify.sendShopMessage.mockResolvedValueOnce({ sent: false, reason: "failed", detail: "500" });

    await expect(sendInvoice("a")).rejects.toThrow(/Invoice send failed/);
    expect(state.orders.get("a")!.invoiceSentAt).toBeNull();

    await sendInvoice("a");
    expect(notify.sendShopMessage).toHaveBeenCalledTimes(2);
    expect(s3.uploadFile).toHaveBeenCalledTimes(1);
  });

  test("a closed window is logged on the order and not retried", async () => {
    state.orders.set("a", paidOrder("a"));
    notify.sendShopMessage.mockResolvedValueOnce({ sent: false, reason: "window_closed" });

    await expect(sendInvoice("a")).resolves.toMatchObject({ sent: false, reason: "window_closed" });
    expect(db.shopOrderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "message_not_sent",
        message: expect.stringContaining("24-hour window"),
      }),
    });
  });

  test("does nothing when the store sends invoices by hand, but staff can still resend", async () => {
    state.orders.set("a", paidOrder("a"));
    state.autoSend = false;

    await expect(sendInvoice("a")).resolves.toMatchObject({ reason: "turned_off" });
    expect(notify.sendShopMessage).not.toHaveBeenCalled();

    await expect(sendInvoice("a", { force: true })).resolves.toMatchObject({ sent: true });
    await expect(sendInvoice("a", { force: true })).resolves.toMatchObject({ sent: true });
    expect(notify.sendShopMessage).toHaveBeenCalledTimes(2);
  });
});

describe("invoice files stay private", () => {
  test("are stored by key in the private bucket and opened with a short-lived link", async () => {
    state.orders.set("a", paidOrder("a"));
    const opened = await openInvoice("a");

    expect(s3.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: "private-bucket" }),
    );
    expect(state.orders.get("a")!.invoiceKey).toMatch(/^shop-invoices\/org\/.+\/INV-0001\.pdf$/);
    expect(opened.url).toMatch(/expires=600$/);
  });

  test("the store logo is fetched through the public-only fetcher", async () => {
    state.orders.set("a", paidOrder("a"));
    state.logoUrl = "https://169.254.169.254/latest/meta-data";
    fetcher.fetchPublicBytes.mockRejectedValueOnce(new Error("private address"));

    await openInvoice("a");

    expect(fetcher.fetchPublicBytes).toHaveBeenCalledWith(state.logoUrl);
    expect(s3.uploadFile).toHaveBeenCalledTimes(1);
  });
});
