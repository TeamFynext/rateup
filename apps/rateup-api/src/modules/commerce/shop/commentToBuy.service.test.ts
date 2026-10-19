import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * An in-memory claim table behind a transaction whose `pg_advisory_xact_lock` really blocks
 * until the holder's transaction ends, the way Postgres would.
 */
const state = vi.hoisted(() => ({
  claims: [] as Array<{
    id: string;
    ruleId: string;
    recipient: string;
    orderId: string | null;
    createdAt: Date;
  }>,
  orders: {} as Record<string, { status: string; checkoutExpiresAt: Date | null }>,
  locked: Promise.resolve() as Promise<void>,
}));

/** The live-claim rule `claimDropUnit`'s SQL applies, run over the in-memory tables. */
const isLive = vi.hoisted(() => (c: { orderId: string | null; createdAt: Date }, now: Date) => {
  if (!c.orderId) return c.createdAt.getTime() > now.getTime() - 15 * 60_000;
  const o = state.orders[c.orderId];
  if (!o) return false;
  if (o.status === "OPEN" || o.status === "COMPLETED") return true;
  return o.status === "DRAFT" && (!o.checkoutExpiresAt || o.checkoutExpiresAt > now);
});

const tx = vi.hoisted(() => ({
  shopDropClaim: {
    findUnique: vi.fn(async ({ where }: any) => {
      const { ruleId, recipient } = where.ruleId_recipient;
      return state.claims.find((c) => c.ruleId === ruleId && c.recipient === recipient) ?? null;
    }),
    create: vi.fn(async ({ data }: any) => {
      const claim = {
        id: `claim-${state.claims.length + 1}`,
        orderId: null,
        createdAt: new Date(),
        ...data,
      };
      state.claims.push(claim);
      return claim;
    }),
    delete: vi.fn(async ({ where }: any) => {
      state.claims = state.claims.filter((c) => c.id !== where.id);
    }),
  },
  shopOrder: {
    findUnique: vi.fn(async ({ where }: any) => state.orders[where.id] ?? null),
  },
}));

const db = vi.hoisted(() => ({
  shopStore: { findUnique: vi.fn() },
  shopProduct: { findMany: vi.fn() },
  shopOrder: { findUnique: vi.fn() },
  shopDropClaim: { update: vi.fn() },
  contact: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

const messaging = vi.hoisted(() => ({
  sendInstagramPrivateReply: vi.fn(),
  sendInstagramTextMessage: vi.fn(),
}));
const orders = vi.hoisted(() => ({ createDraftOrder: vi.fn() }));
const attribution = vi.hoisted(() => ({ rememberSocialSource: vi.fn() }));
const chatProducts = vi.hoisted(() => ({ sendProductsInChat: vi.fn() }));

vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../whatsapp/instagram/instagram_messaging.service.js", () => messaging);
vi.mock("./orders.service.js", () => orders);
vi.mock("./attribution.js", () => attribution);
vi.mock("./chatProducts.service.js", () => chatProducts);
vi.mock("./externalCheckout.service.js", () => ({
  checkoutLinkFor: vi.fn(async (id: string) => {
    const order = await db.shopOrder.findUnique({ where: { id } });
    return order?.status === "DRAFT" && order.checkoutToken
      ? `https://app.test/c/${order.checkoutToken}`
      : null;
  }),
}));
vi.mock("./store.service.js", () => ({ commerceEnabled: vi.fn(async () => true) }));
vi.mock("./events.js", () => ({
  checkoutUrl: (t: string) => `https://app.test/c/${t}`,
  storefrontUrl: (s: string) => `https://app.test/s/${s}`,
}));
vi.mock("./storefrontLinks.js", async (load) => {
  const real = await load<typeof import("./storefrontLinks.js")>();
  return {
    ...real,
    storefrontProductUrl: (s: string, p: { id: string; title: string }) =>
      `https://app.test/s/${s}/p/${real.productHandle(p)}`,
  };
});

const { claimDropUnit, runShopProductsAction } = await import("./commentToBuy.service.js");

const store = {
  id: "store-1",
  orgId: "org-1",
  slug: "fern",
  currency: "USD",
  storefrontEnabled: true,
};
const variant = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  price: 18,
  trackInventory: false,
  stock: 0,
  allowBackorder: false,
  ...extra,
});
const mug = { id: "11111111-1111-4111-8111-111111111111", title: "Mug", variants: [variant("v1")] };
const tee = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "Tee",
  variants: [variant("v2"), variant("v3", { price: 22 })],
};

const input = (value: unknown, extra: Record<string, unknown> = {}) => ({
  orgId: "org-1",
  ruleId: "rule-1",
  triggerEvent: "INSTAGRAM_COMMENT",
  value,
  accountId: "iba-1",
  recipient: "igs-1",
  commentId: "comment-1",
  mediaId: "media-1",
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  state.claims = [];
  state.orders = {};
  state.locked = Promise.resolve();
  db.$transaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    const lockTx = {
      ...tx,
      $queryRaw: vi.fn(async (sql: TemplateStringsArray) => {
        if (sql.join("").includes("pg_advisory_xact_lock")) {
          const previous = state.locked;
          state.locked = previous.then(() => held);
          await previous;
          return [];
        }
        // A yield between reading and writing is where an unlocked claim would oversell.
        await new Promise((r) => setTimeout(r, 1));
        const now = new Date();
        return [{ taken: BigInt(state.claims.filter((c) => isLive(c, now)).length) }];
      }),
    };
    try {
      return await fn(lockTx);
    } finally {
      release();
    }
  });
  db.shopStore.findUnique.mockResolvedValue(store);
  db.contact.findUnique.mockResolvedValue({ id: "contact-1" });
  db.shopProduct.findMany.mockResolvedValue([mug]);
  orders.createDraftOrder.mockResolvedValue({ id: "order-1", checkoutToken: "tok1" });
  db.shopOrder.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id === "order-1" ? { id: "order-1", status: "DRAFT", checkoutToken: "tok1" } : null,
  );
});

describe("a limited drop", () => {
  test("never sells more claims than units, however many comments arrive at once", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => claimDropUnit("rule-1", `igs-${i}`, 2)),
    );
    expect(results.filter((r) => r.status === "claimed")).toHaveLength(2);
    expect(results.filter((r) => r.status === "sold_out")).toHaveLength(4);
    expect(state.claims).toHaveLength(2);
  });

  test("gives a repeat commenter their first claim, not a second unit", async () => {
    await claimDropUnit("rule-1", "igs-1", 5);
    const again = await claimDropUnit("rule-1", "igs-1", 5);
    expect(again.status).toBe("already");
    expect(state.claims).toHaveLength(1);
  });

  test("ties the claim to the order it starts and links straight to its checkout", async () => {
    await runShopProductsAction(input({ productIds: [mug.id], dropLimit: 1 }));

    expect(db.shopDropClaim.update).toHaveBeenCalledWith({
      where: { id: "claim-1" },
      data: { orderId: "order-1" },
    });
    expect(messaging.sendInstagramPrivateReply).toHaveBeenCalledExactlyOnceWith(
      "comment-1",
      "Thanks for your comment! Here it is:\n• Mug · USD 18.00\nBuy it here: https://app.test/c/tok1",
      "iba-1",
      "org-1",
      "igs-1",
    );
  });

  test("tells later commenters it sold out, with the storefront", async () => {
    state.claims.push({
      id: "c0",
      ruleId: "rule-1",
      recipient: "igs-0",
      orderId: null,
      createdAt: new Date(),
    });

    await runShopProductsAction(input({ productIds: [mug.id], dropLimit: 1 }));

    expect(orders.createDraftOrder).not.toHaveBeenCalled();
    expect(messaging.sendInstagramPrivateReply.mock.calls[0][1]).toBe(
      "Sorry, Mug has sold out. See what's still available: https://app.test/s/fern",
    );
  });
});

describe("claims that can no longer become a sale", () => {
  const claim = (id: string, orderId: string | null, createdAt = new Date()) =>
    state.claims.push({ id, ruleId: "rule-1", recipient: `igs-${id}`, orderId, createdAt });

  test("don't hold a unit: an expired draft, a cancelled order or an old bare claim", async () => {
    state.orders = {
      expired: { status: "DRAFT", checkoutExpiresAt: new Date(Date.now() - 60_000) },
      cancelled: { status: "CANCELLED", checkoutExpiresAt: null },
    };
    claim("a", "expired");
    claim("b", "cancelled");
    claim("c", null, new Date(Date.now() - 20 * 60_000));

    expect((await claimDropUnit("rule-1", "igs-new", 1)).status).toBe("claimed");
  });

  test("still hold one for a placed order or a draft inside its window", async () => {
    state.orders = {
      placed: { status: "OPEN", checkoutExpiresAt: null },
      live: { status: "DRAFT", checkoutExpiresAt: new Date(Date.now() + 60_000) },
    };
    claim("a", "placed");
    claim("b", "live");

    expect((await claimDropUnit("rule-1", "igs-new", 2)).status).toBe("sold_out");
  });

  test("let a commenter whose checkout lapsed claim again", async () => {
    state.orders = { old: { status: "DRAFT", checkoutExpiresAt: new Date(Date.now() - 1) } };
    state.claims.push({
      id: "mine",
      ruleId: "rule-1",
      recipient: "igs-1",
      orderId: "old",
      createdAt: new Date(),
    });

    const again = await claimDropUnit("rule-1", "igs-1", 1);

    expect(again.status).toBe("claimed");
    expect(state.claims.map((c) => c.id)).not.toContain("mine");
  });
});

describe("attribution", () => {
  test("marks the checkout and the contact as coming from the comment", async () => {
    await runShopProductsAction(input({ productIds: [mug.id] }));

    const expected = {
      kind: "ig_comment",
      mediaId: "media-1",
      commentId: "comment-1",
      ruleId: "rule-1",
    };
    expect(orders.createDraftOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "INSTAGRAM",
        source: "ig_comment",
        contactId: "contact-1",
        attribution: expected,
      }),
    );
    expect(attribution.rememberSocialSource).toHaveBeenCalledWith("org-1", "contact-1", expected);
  });

  test("calls a story mention ig_story and follows up with cards in the open DM", async () => {
    await runShopProductsAction(
      input(
        { productIds: [mug.id] },
        { triggerEvent: "INSTAGRAM_STORY_MENTION", commentId: undefined },
      ),
    );

    expect(orders.createDraftOrder.mock.calls[0][0].source).toBe("ig_story");
    expect(messaging.sendInstagramTextMessage).toHaveBeenCalledOnce();
    expect(chatProducts.sendProductsInChat).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: "contact-1", productIds: [mug.id] }),
    );
  });
});

describe("the reply", () => {
  test("sends a choice of variants to the storefront rather than guessing one", async () => {
    db.shopProduct.findMany.mockResolvedValue([tee]);

    await runShopProductsAction(input({ productIds: [tee.id], message: "Here you go!" }));

    expect(orders.createDraftOrder).not.toHaveBeenCalled();
    expect(messaging.sendInstagramPrivateReply.mock.calls[0][1]).toBe(
      `Here you go!\n• Tee · from USD 18.00\nShop here: https://app.test/s/fern/p/tee-22222222`,
    );
  });

  test("sends nothing for an action without valid products", async () => {
    await expect(runShopProductsAction(input({ productIds: [] }))).resolves.toBe(false);
    expect(messaging.sendInstagramPrivateReply).not.toHaveBeenCalled();
  });
});
