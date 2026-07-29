import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../generated/prisma/client.js", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      meta: { target?: string[] };
      constructor(message: string, code: string, meta: { target?: string[] } = {}) {
        super(message);
        this.code = code;
        this.meta = meta;
      }
    },
  },
}));

import { Prisma } from "../../generated/prisma/client.js";
import {
  asyncErrHandler,
  getShortUrlId,
  isEmptyString,
  shortIdUniqueConstraintErrHandler,
} from "./commonUtils.js";

/** The unique-constraint error Postgres raises when a shortUrlId collides. */
function shortUrlCollision() {
  return new (Prisma.PrismaClientKnownRequestError as any)("Unique constraint", "P2002", {
    target: ["shortUrlId"],
  });
}

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("getShortUrlId", () => {
  test("produces an eight character id", () => {
    expect(getShortUrlId()).toHaveLength(8);
  });

  test("avoids look-alike characters so the id can be read aloud", () => {
    const ids = Array.from({ length: 50 }, () => getShortUrlId()).join("");

    // nolookalikesSafe excludes the characters people confuse for one another.
    expect(ids).not.toMatch(/[0O1lI]/);
  });

  test("does not repeat itself across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => getShortUrlId()));

    expect(ids.size).toBe(100);
  });
});

describe("isEmptyString", () => {
  test("returns the text when it has content", () => {
    expect(isEmptyString("hello")).toBe("hello");
  });

  test("keeps text that merely has padding", () => {
    expect(isEmptyString("  hello  ")).toBe("  hello  ");
  });

  test.each([
    ["an empty string", ""],
    ["only spaces", "   "],
    ["a tab and newline", "\t\n"],
    ["undefined", undefined],
    ["null", null],
  ])("returns null for %s", (_name, input) => {
    expect(isEmptyString(input as any)).toBeNull();
  });
});

describe("asyncErrHandler", () => {
  test("runs the handler with the request and reply", async () => {
    const handler = vi.fn();
    const reply = makeReply();
    const request = { id: "req-1" } as any;

    await asyncErrHandler(handler)(request, reply);

    expect(handler).toHaveBeenCalledWith(request, reply);
    expect(reply.code).not.toHaveBeenCalled();
  });

  test("turns a thrown error into a 500 rather than letting it escape", async () => {
    const reply = makeReply();

    await asyncErrHandler(async () => {
      throw new Error("boom");
    })({} as any, reply);

    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({
      success: false,
      message: "something went wrong, please try again later",
    });
  });
});

describe("shortIdUniqueConstraintErrHandler", () => {
  test("returns the result when nothing collides", async () => {
    const create = vi.fn(async () => ({ id: "row-1" }));

    await expect(shortIdUniqueConstraintErrHandler(create, "a", "b")).resolves.toEqual({
      id: "row-1",
    });
    expect(create).toHaveBeenCalledWith("a", "b");
  });

  test("retries when the generated short id is already taken", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(shortUrlCollision())
      .mockResolvedValueOnce({ id: "row-1" });

    await expect(shortIdUniqueConstraintErrHandler(create, "a")).resolves.toEqual({ id: "row-1" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  // NOTE: the retry calls the wrapped function without forwarding `...args`, so the
  // second attempt runs with no arguments at all. Whatever the first call was given
  // is lost the moment a short id collides.
  test("loses the arguments on the retry", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(shortUrlCollision())
      .mockResolvedValueOnce({ id: "row-1" });

    await shortIdUniqueConstraintErrHandler(create, "first-arg", "second-arg");

    expect(create.mock.calls[0]).toEqual(["first-arg", "second-arg"]);
    expect(create.mock.calls[1]).toEqual([]);
  });

  test("rethrows a unique-constraint error on some other column", async () => {
    const other = new (Prisma.PrismaClientKnownRequestError as any)("Unique", "P2002", {
      target: ["email"],
    });
    const create = vi.fn().mockRejectedValue(other);

    await expect(shortIdUniqueConstraintErrHandler(create, "a")).rejects.toThrow("Unique");
    expect(create).toHaveBeenCalledTimes(1);
  });

  test("rethrows a different Prisma error", async () => {
    const create = vi
      .fn()
      .mockRejectedValue(
        new (Prisma.PrismaClientKnownRequestError as any)("FK violated", "P2003", {}),
      );

    await expect(shortIdUniqueConstraintErrHandler(create, "a")).rejects.toThrow("FK violated");
  });

  test("rethrows an ordinary error untouched", async () => {
    const create = vi.fn().mockRejectedValue(new Error("db down"));

    await expect(shortIdUniqueConstraintErrHandler(create, "a")).rejects.toThrow("db down");
  });
});
