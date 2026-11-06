import { describe, expect, it } from "vitest";

import { isWaMessageIdConflict } from "./waMessageIdConflict.js";

const p2002 = (meta?: unknown) =>
  Object.assign(new Error("Unique constraint failed"), { code: "P2002", meta });

describe("isWaMessageIdConflict", () => {
  it("recognises the driver adapter's index name", () => {
    const error = p2002({
      modelName: "WaMessage",
      driverAdapterError: {
        cause: {
          kind: "UniqueConstraintViolation",
          constraint: { index: "WaMessage_messageId_key" },
        },
      },
    });
    expect(isWaMessageIdConflict(error)).toBe(true);
  });

  it("recognises the driver adapter's field list", () => {
    const error = p2002({
      driverAdapterError: { cause: { constraint: { fields: ["messageId"] } } },
    });
    expect(isWaMessageIdConflict(error)).toBe(true);
  });

  it("recognises the classic engine's target", () => {
    expect(isWaMessageIdConflict(p2002({ target: ["messageId"] }))).toBe(true);
    expect(isWaMessageIdConflict(p2002({ target: "WaMessage_messageId_key" }))).toBe(true);
  });

  it("treats a P2002 that names no constraint as the message id", () => {
    expect(isWaMessageIdConflict(p2002())).toBe(true);
    expect(isWaMessageIdConflict(p2002({ modelName: "WaMessage" }))).toBe(true);
  });

  it("rejects a P2002 on some other constraint", () => {
    const error = p2002({
      driverAdapterError: {
        cause: { constraint: { index: "WaMessageCampaginParticipantMap_waMessageId_key" } },
      },
    });
    // The map's column is called waMessageId, which must not read as messageId.
    expect(isWaMessageIdConflict(error)).toBe(false);
    expect(isWaMessageIdConflict(p2002({ target: ["id"] }))).toBe(false);
  });

  it("rejects anything that is not a unique violation", () => {
    expect(isWaMessageIdConflict(new Error("timeout"))).toBe(false);
    expect(isWaMessageIdConflict(Object.assign(new Error("fk"), { code: "P2003" }))).toBe(false);
    expect(isWaMessageIdConflict(null)).toBe(false);
    expect(isWaMessageIdConflict("P2002")).toBe(false);
  });
});
