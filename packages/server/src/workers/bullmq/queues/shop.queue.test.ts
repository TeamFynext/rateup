import { beforeEach, describe, expect, test, vi } from "vitest";

const queue = vi.hoisted(() => ({ getJob: vi.fn(), add: vi.fn(), remove: vi.fn() }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: {} }));
vi.mock("bullmq", () => ({
  Queue: class {
    getJob = queue.getJob;
    add = queue.add;
    remove = queue.remove;
  },
}));

const { enqueueCatalogPublish } = await import("./shop.queue.js");

function job(state: string, removedRetailerIds: string[] = [], removable = true) {
  return {
    data: { productId: "p1", removedRetailerIds },
    getState: vi.fn(async () => state),
    remove: vi.fn(async () => {
      if (!removable) throw new Error("locked");
    }),
  };
}

const addedJobId = () => queue.add.mock.calls[0][2].jobId as string;
const addedData = () => queue.add.mock.calls[0][1] as { removedRetailerIds: string[] };

describe("publishing a product to Meta", () => {
  beforeEach(() => vi.clearAllMocks());

  test("a save while one is waiting replaces it and keeps its removed variants", async () => {
    queue.getJob.mockResolvedValue(job("delayed", ["old"]));
    await enqueueCatalogPublish("p1", ["new"]);
    expect(addedJobId()).toBe("shop-publish-p1");
    expect(addedData().removedRetailerIds).toEqual(["old", "new"]);
  });

  test("a save while one is running follows it under its own id instead of being dropped", async () => {
    const running = job("active", ["old"]);
    queue.getJob.mockResolvedValue(running);
    await enqueueCatalogPublish("p1", ["new"]);
    expect(running.remove).not.toHaveBeenCalled();
    expect(addedJobId()).toMatch(/^shop-publish-p1-\d+$/);
    expect(addedData().removedRetailerIds).toEqual(["new"]);
  });

  test("a failed job still holding the id is cleared so the next publish runs", async () => {
    queue.getJob.mockResolvedValue(job("failed"));
    await enqueueCatalogPublish("p1");
    expect(addedJobId()).toBe("shop-publish-p1");
  });

  test("a job that cannot be removed is followed rather than shadowed", async () => {
    queue.getJob.mockResolvedValue(job("delayed", ["old"], false));
    await enqueueCatalogPublish("p1");
    expect(addedJobId()).toMatch(/^shop-publish-p1-\d+$/);
  });
});
