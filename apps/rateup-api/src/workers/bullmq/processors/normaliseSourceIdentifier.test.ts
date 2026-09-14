import { beforeEach, describe, expect, test, vi } from "vitest";

const queryRaw = vi.fn();
const executeRawUnsafe = vi.fn();
const startNext = vi.fn();

vi.mock("../../../utils/prisma.js", () => ({
  default: { $queryRaw: queryRaw, $executeRawUnsafe: executeRawUnsafe },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../queues/backfill.queue.js", () => ({
  startMessageIdentifierNormalisation: startNext,
}));

const { normaliseContactIdentifiers, normaliseMessageBatch } =
  await import("./normaliseSourceIdentifier.js");

const START = "00000000-0000-0000-0000-000000000000";
const page = (lastId: string) => queryRaw.mockResolvedValueOnce([{ id: lastId }]);
const endOfTable = () => queryRaw.mockResolvedValueOnce([]);

beforeEach(() => {
  vi.clearAllMocks();
  executeRawUnsafe.mockResolvedValue(0);
});

describe("normalising WaMessage.sourceIdentifier", () => {
  test("rewrites only the page it was handed", async () => {
    page("aaaa0000-0000-0000-0000-000000000000");

    await normaliseMessageBatch({ data: { cursor: START } });

    const [sql, from, to] = executeRawUnsafe.mock.calls[0];
    expect(from).toBe(START);
    expect(to).toBe("aaaa0000-0000-0000-0000-000000000000");
    expect(sql).toContain(`id > $1::uuid AND id <= $2::uuid`);
  });

  /**
   * The column is shared: `internal` marks a system note, and Instagram and
   * Facebook account ids live here too. Stripping one of those to its digits
   * would invent an identifier rather than tidy one.
   */
  test("only touches identifiers that are a number written with formatting", async () => {
    page("aaaa0000-0000-0000-0000-000000000000");

    await normaliseMessageBatch({ data: { cursor: START } });

    const [sql] = executeRawUnsafe.mock.calls[0];
    expect(sql).toContain(`"sourceIdentifier" ~ '[^0-9]'`);
    expect(sql).toContain(`^[+[:space:]().-]*[0-9][0-9[:space:]().-]*$`);
    expect(sql).toContain(`"sourcePlatform" = 'WHATSAPP'`);
  });

  // Carrying a cursor is what keeps each batch's cost constant: without it the
  // sweep re-reads every row already done, because no index can serve the
  // predicate.
  test("hands the next batch the page it ended on", async () => {
    page("bbbb0000-0000-0000-0000-000000000000");
    executeRawUnsafe.mockResolvedValue(7);

    await normaliseMessageBatch({
      data: { cursor: START, batchSize: 10, rewritten: 5, scanned: 10 },
    });

    expect(startNext).toHaveBeenCalledWith({
      cursor: "bbbb0000-0000-0000-0000-000000000000",
      batchSize: 10,
      scanned: 20,
      rewritten: 12,
    });
  });

  test("stops chaining at the end of the table", async () => {
    endOfTable();

    const result = await normaliseMessageBatch({ data: { cursor: START, rewritten: 99 } });

    expect(result).toMatchObject({ done: true, rewritten: 99 });
    expect(startNext).not.toHaveBeenCalled();
    expect(executeRawUnsafe).not.toHaveBeenCalled();
  });

  // A worker that dies mid-batch leaves the job to be retried with the same
  // cursor. Redoing it must be free, not a double-rewrite.
  test("enqueues the next batch only after this one's update has run", async () => {
    page("cccc0000-0000-0000-0000-000000000000");
    const order: string[] = [];
    executeRawUnsafe.mockImplementation(async () => {
      order.push("update");
      return 3;
    });
    startNext.mockImplementation(async () => {
      order.push("enqueue");
    });

    await normaliseMessageBatch({ data: { cursor: START } });

    expect(order).toEqual(["update", "enqueue"]);
  });

  test("starts at the beginning of the table when given no cursor", async () => {
    page("dddd0000-0000-0000-0000-000000000000");

    await normaliseMessageBatch({ data: {} });

    expect(executeRawUnsafe.mock.calls[0][1]).toBe(START);
  });
});

describe("normalising Contact.lastMessageSourceIdentifier", () => {
  // Nothing indexes this column, so its updates take the HOT path and there is
  // no index to serve a cursor either — one statement beats many.
  test("does the whole column in one statement, with the same guard", async () => {
    executeRawUnsafe.mockResolvedValue(8863);

    const result = await normaliseContactIdentifiers();

    expect(result).toEqual({ rewritten: 8863 });
    expect(executeRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql] = executeRawUnsafe.mock.calls[0];
    expect(sql).toContain(`"lastMessageSourceIdentifier" ~ '[^0-9]'`);
    expect(sql).toContain(`^[+[:space:]().-]*[0-9][0-9[:space:]().-]*$`);
  });
});
