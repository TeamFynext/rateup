import { beforeEach, describe, expect, test, vi } from "vitest";

// wa_error_handler pulls in the ConversationLimitError module, whose import graph
// touches prisma. Stub it so importing the handler never opens a connection.
vi.mock("../../utils/prisma.js", () => ({ default: {} }));

import { GraphApiError } from "./wa_axios.js";
import { handleWhatsappError } from "./wa_error_handler.js";
import { ConversationLimitError } from "./whatsappSurvey/wasurvey.auth.js";

function makeReply() {
  const reply: any = {
    status: vi.fn(),
    send: vi.fn(),
  };
  reply.status.mockReturnValue(reply); // chainable: reply.status(x).send(y)
  return reply;
}

const request = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleWhatsappError", () => {
  test("maps ConversationLimitError to a 403 with a client-visible upgrade message", () => {
    const reply = makeReply();
    const err = new ConversationLimitError();

    handleWhatsappError(err, request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      message: err.message,
      displayMessageInClient: true,
    });
  });

  test("maps GraphApiError to a 400 with the user-facing message", () => {
    const reply = makeReply();
    const graphErr = new GraphApiError({
      data: { error: { message: "raw", error_user_msg: "Friendly message" } },
    } as any);

    handleWhatsappError(graphErr, request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ message: "Friendly message" });
  });

  test("passes any other error straight through without a status override", () => {
    const reply = makeReply();
    const err = new Error("something else");

    handleWhatsappError(err, request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith(err);
  });
});
