import { describe, expect, test, vi } from "vitest";

vi.mock("ioredis", () => ({ default: { default: vi.fn() } }));
process.env.REDIS_URL ??= "redis://localhost:6379";
const { redisOptionsFromUrl } = await import("./redisConnection.js");

describe("redisOptionsFromUrl", () => {
  test("defaults to database 0 when the URL has no path", () => {
    expect(redisOptionsFromUrl("redis://localhost:6379").db).toBe(0);
    expect(redisOptionsFromUrl("redis://localhost:6379/").db).toBe(0);
  });

  test("honours the database index in the path", () => {
    expect(redisOptionsFromUrl("redis://localhost:6379/9").db).toBe(9);
  });

  test("keeps host, port and credentials", () => {
    const o = redisOptionsFromUrl("redis://default:s3cret@redis.internal:6380/2");
    expect(o).toMatchObject({
      host: "redis.internal",
      port: 6380,
      username: "default",
      password: "s3cret",
      db: 2,
    });
  });

  test("refuses a non-numeric database index", () => {
    expect(() => redisOptionsFromUrl("redis://localhost:6379/abc")).toThrow(
      /invalid database index/,
    );
  });
});
