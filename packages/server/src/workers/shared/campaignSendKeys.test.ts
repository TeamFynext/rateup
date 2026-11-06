import { describe, expect, test } from "vitest";

import { campaignSendJobId, campaignSendJobsKey } from "./campaignSendKeys.js";

const SEND_ID = "fd2428e4-6891-479f-909c-5535c6f58447";
const PARTICIPANT_ID = "20ed2cd8-08b9-4d18-9e54-cb812bb13e6e";

describe("campaignSendJobId", () => {
  // The regression this exists for: BullMQ refuses a custom job id containing a
  // colon, so a colon here failed every campaign's fan-out with "Custom Id
  // cannot contain :" — after the participants had been resolved and the send
  // opened, which is the most expensive place to fall over.
  test("contains no colon, which BullMQ rejects in a custom job id", () => {
    expect(campaignSendJobId(SEND_ID, PARTICIPANT_ID)).not.toContain(":");
  });

  test("is unique per participant within a send", () => {
    expect(campaignSendJobId(SEND_ID, "a")).not.toBe(campaignSendJobId(SEND_ID, "b"));
  });

  test("is unique per send for the same participant, so a retry is not deduplicated away", () => {
    expect(campaignSendJobId("send-1", PARTICIPANT_ID)).not.toBe(
      campaignSendJobId("send-2", PARTICIPANT_ID),
    );
  });

  test("keeps the colon in the Redis key, where it is the conventional separator", () => {
    expect(campaignSendJobsKey(SEND_ID)).toBe(`campaignSend:${SEND_ID}:jobs`);
  });
});
