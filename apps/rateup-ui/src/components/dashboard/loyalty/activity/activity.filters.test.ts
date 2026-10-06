import { describe, expect, test } from "vitest";

import { validateActivitySearch, ledgerQueryFor } from "./activity.filters";

describe("activity filters", () => {
  test("bad search params fall back rather than throw", () => {
    expect(validateActivitySearch({ filter: "nonsense", page: "x" })).toEqual({
      filter: "all",
      page: 1,
    });
    expect(validateActivitySearch({ filter: "earned", page: "3", customerId: "c1" })).toEqual({
      filter: "earned",
      page: 3,
      customerId: "c1",
    });
  });

  test("each ledger filter maps onto the transaction type it means", () => {
    expect(ledgerQueryFor({ filter: "all", page: 2 })).toEqual({ page: 2, limit: 20 });
    expect(ledgerQueryFor({ filter: "earned", page: 1 })).toEqual({
      page: 1,
      limit: 20,
      transactionType: "earn",
    });
    expect(ledgerQueryFor({ filter: "redeemed", page: 1, customerId: "c1" })).toEqual({
      page: 1,
      limit: 20,
      transactionType: "redeem",
      customerId: "c1",
    });
  });

  test("pending is the approvals table, not a ledger query", () => {
    expect(ledgerQueryFor({ filter: "pending", page: 1 })).toBeNull();
  });
});
