import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../whatsapp/wa_axios.js", () => {
  class GraphApiError extends Error {
    error: { code: number; error_subcode?: number; message: string };
    constructor(error: { code: number; error_subcode?: number; message: string }) {
      super("Something went wrong");
      this.error = error;
    }
  }
  return { callMetaApi: vi.fn(), GraphApiError };
});
vi.mock("../../../utils/prisma.js", () => ({ default: { $queryRaw: vi.fn() } }));
vi.mock("../channels/metaChannel.service.js", () => ({ getInstagramChannel: vi.fn() }));
vi.mock("../whatsapp/settings/channelAccess.js", () => ({ getChannelScope: vi.fn() }));
vi.mock("./instagram_messaging.service.js", () => ({ replyToInstagramComment: vi.fn() }));
vi.mock("../whatsapp/wa_error_handler.js", () => ({
  getGraphApiErrorMessage: (error: { error: { message: string } }) => error.error.message,
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { getInstagramChannel } from "../channels/metaChannel.service.js";
import { getChannelScope } from "../whatsapp/settings/channelAccess.js";
import { callMetaApi, GraphApiError } from "../whatsapp/wa_axios.js";
import {
  deleteInstagramCommentHandler,
  hideInstagramCommentHandler,
  likeInstagramCommentHandler,
  listInstagramCommentsHandler,
  RECONNECT_FOR_MODERATION_MESSAGE,
  replyToInstagramCommentHandler,
  unhideInstagramCommentHandler,
  unlikeInstagramCommentHandler,
} from "./instagram_comments.controller.js";
import { instagramCommentParamsSchema } from "./instagram_comments.schema.js";
import { listInstagramComments } from "./instagram_comments.service.js";
import { replyToInstagramComment } from "./instagram_messaging.service.js";

const callMeta = vi.mocked(callMetaApi);
const queryRaw = vi.mocked(prisma.$queryRaw);
const getChannel = vi.mocked(getInstagramChannel);
const getScope = vi.mocked(getChannelScope);
const replyTo = vi.mocked(replyToInstagramComment);

const ORG = "org-a";
const IBA = "1784";
const TOKEN = "page-token";

function channel(overrides: Record<string, unknown> = {}) {
  return { id: "channel-1", orgId: ORG, accountId: IBA, pageAccessToken: TOKEN, ...overrides };
}

function request(params: Record<string, string>, extra: Record<string, unknown> = {}) {
  return {
    user: { orgId: ORG },
    actor: { orgId: ORG },
    params: { ibaId: IBA, mediaId: "55", ...params },
    query: {},
    body: {},
    ...extra,
  } as never;
}

function reply() {
  const r = { code: vi.fn(), send: vi.fn() };
  r.code.mockReturnValue(r);
  r.send.mockReturnValue(r);
  return r;
}

beforeEach(() => {
  vi.clearAllMocks();
  getChannel.mockResolvedValue(channel() as never);
  getScope.mockResolvedValue({ all: true, ids: new Set() });
  callMeta.mockResolvedValue({ data: { success: true } } as never);
  queryRaw.mockResolvedValue([] as never);
});

describe("listInstagramComments", () => {
  test("maps comments, flags the auto-replied ones in one query and returns the cursor", async () => {
    callMeta.mockResolvedValue({
      data: {
        data: [
          {
            id: "c1",
            text: "Price?",
            username: "ann",
            timestamp: "2026-11-01T10:00:00+0000",
            like_count: 2,
            hidden: false,
            from: { id: "u1", username: "ann" },
            replies: { data: [{ id: "r1", text: "DM sent", from: { id: IBA } }] },
          },
          { id: "c2", text: "Nice", timestamp: "2026-10-30T10:00:00+0000", hidden: true },
        ],
        paging: { cursors: { after: "CUR" }, next: "https://graph…" },
      },
    } as never);
    queryRaw.mockResolvedValue([{ commentId: "c1" }] as never);

    const page = await listInstagramComments(IBA, TOKEN, "55", "PREV");

    expect(callMeta).toHaveBeenCalledWith(
      "/55/comments",
      "GET",
      TOKEN,
      undefined,
      {},
      {},
      expect.objectContaining({ after: "PREV", limit: 25 }),
    );
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(page.nextCursor).toBe("CUR");
    expect(page.comments.map((c) => [c.id, c.autoReplied, c.hidden])).toEqual([
      ["c1", true, false],
      ["c2", false, true],
    ]);
    expect(page.comments[0].replies[0]).toMatchObject({ id: "r1", isOwn: true });
  });

  test("no next page without paging.next, and no query for an empty page", async () => {
    callMeta.mockResolvedValue({
      data: { data: [], paging: { cursors: { after: "X" } } },
    } as never);
    const page = await listInstagramComments(IBA, TOKEN, "55");
    expect(page).toEqual({ comments: [], nextCursor: null });
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe("comment action handlers", () => {
  test("hide and unhide post hide=true|false on the comment", async () => {
    await hideInstagramCommentHandler(request({ commentId: "c1" }), reply() as never);
    await unhideInstagramCommentHandler(request({ commentId: "c1" }), reply() as never);
    expect(callMeta.mock.calls.map((c) => [c[0], c[1], c[6]])).toEqual([
      ["/c1", "POST", { hide: true }],
      ["/c1", "POST", { hide: false }],
    ]);
  });

  test("like and unlike use the account's likes edge with comment_id", async () => {
    await likeInstagramCommentHandler(request({ commentId: "c1" }), reply() as never);
    await unlikeInstagramCommentHandler(request({ commentId: "c1" }), reply() as never);
    expect(callMeta.mock.calls.map((c) => [c[0], c[1], c[6]])).toEqual([
      [`/${IBA}/likes`, "POST", { comment_id: "c1" }],
      [`/${IBA}/likes`, "DELETE", { comment_id: "c1" }],
    ]);
  });

  test("delete calls DELETE on the comment", async () => {
    const r = reply();
    await deleteInstagramCommentHandler(request({ commentId: "c1" }), r as never);
    expect(callMeta).toHaveBeenCalledWith("/c1", "DELETE", TOKEN);
    expect(r.code).toHaveBeenCalledWith(200);
  });

  test("reply wraps replyToInstagramComment", async () => {
    replyTo.mockResolvedValue({ id: "r9" });
    const r = reply();
    await replyToInstagramCommentHandler(
      request({ commentId: "c1" }, { body: { text: "Thanks!" } }),
      r as never,
    );
    expect(replyTo).toHaveBeenCalledWith("c1", "Thanks!", IBA);
    expect(r.send).toHaveBeenCalledWith({ success: true, data: { id: "r9" } });
  });

  test("another org's account, or one outside the actor's teams, is a 404 and calls nothing", async () => {
    getChannel.mockResolvedValueOnce(null as never);
    const r1 = reply();
    await hideInstagramCommentHandler(request({ commentId: "c1" }), r1 as never);
    expect(r1.code).toHaveBeenCalledWith(404);

    getScope.mockResolvedValueOnce({ all: false, ids: new Set(["other"]) });
    const r2 = reply();
    await listInstagramCommentsHandler(request({}), r2 as never);
    expect(r2.code).toHaveBeenCalledWith(404);
    expect(callMeta).not.toHaveBeenCalled();
  });

  test("a Graph permission error asks to reconnect", async () => {
    callMeta.mockRejectedValue(
      new (GraphApiError as never as new (e: object) => Error)({
        code: 200,
        message: "Permissions error",
      }),
    );
    const r = reply();
    await likeInstagramCommentHandler(request({ commentId: "c1" }), r as never);
    expect(r.code).toHaveBeenCalledWith(403);
    expect(r.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: RECONNECT_FOR_MODERATION_MESSAGE }),
    );
  });

  test("other Graph errors pass Meta's message through as a 400", async () => {
    callMeta.mockRejectedValue(
      new (GraphApiError as never as new (e: object) => Error)({
        code: 1,
        message: "Unknown",
      }),
    );
    const r = reply();
    await deleteInstagramCommentHandler(request({ commentId: "c1" }), r as never);
    expect(r.code).toHaveBeenCalledWith(400);
  });
});

describe("params", () => {
  test("ids must be numeric so nothing else reaches a Graph path", () => {
    expect(
      instagramCommentParamsSchema.safeParse({ ibaId: "1", mediaId: "2", commentId: "3" }).success,
    ).toBe(true);
    expect(
      instagramCommentParamsSchema.safeParse({ ibaId: "1", mediaId: "2", commentId: "../me" })
        .success,
    ).toBe(false);
  });
});
