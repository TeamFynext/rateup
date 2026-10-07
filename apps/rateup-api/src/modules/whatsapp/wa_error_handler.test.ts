import { beforeEach, describe, expect, test, vi } from "vitest";

// The limit errors' module reaches prisma; stub it so importing never opens a connection.
vi.mock("../../utils/prisma.js", () => ({ default: {} }));

import { GraphApiError } from "./wa_axios.js";
import { handleWhatsappError } from "./wa_error_handler.js";
import {
  ActiveContactLimitError,
  CampaignCreditsExhaustedError,
} from "./whatsappSurvey/wasurvey.auth.js";

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
  test.each([
    ["ActiveContactLimitError", new ActiveContactLimitError(), "ACTIVE_CONTACT_LIMIT_REACHED"],
    [
      "CampaignCreditsExhaustedError",
      new CampaignCreditsExhaustedError(),
      "CAMPAIGN_CREDITS_EXHAUSTED",
    ],
  ])("maps %s to a 403 the client can show and recognise", (_label, err, code) => {
    const reply = makeReply();

    handleWhatsappError(err, request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      message: err.message,
      code,
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
