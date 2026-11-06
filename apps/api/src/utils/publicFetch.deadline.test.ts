import { EventEmitter } from "node:events";

import { expect, test, vi } from "vite-plus/test";

// A server that keeps the socket busy but never finishes: the idle timeout never fires.
vi.mock("node:https", () => ({
  default: {
    get: (_url: URL, opts: { signal: AbortSignal }) => {
      const req = Object.assign(new EventEmitter(), { destroy: vi.fn() });
      opts.signal.addEventListener("abort", () => req.emit("error", new Error("aborted")));
      return req;
    },
  },
}));

const { fetchPublicBytes } = await import("./publicFetch.js");

test("gives up at the overall deadline even when the socket never goes idle", async () => {
  const started = Date.now();
  await expect(
    fetchPublicBytes("https://8.8.8.8/logo.png", { deadlineMs: 50, timeoutMs: 60_000 }),
  ).rejects.toThrow("Timed out");
  expect(Date.now() - started).toBeLessThan(2000);
});
