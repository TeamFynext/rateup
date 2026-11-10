import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../merge/suggestions.service.js", () => ({ suggestMerge: vi.fn() }));

import { contactFields } from "./contactFields.js";

describe("contactFields", () => {
  test("reads each field from the primary identity of its kind", () => {
    expect(
      contactFields([
        { kind: "PHONE", value: "919000000001" },
        { kind: "EMAIL", value: "a@x.com" },
        { kind: "IG_SCOPED", value: "1784" },
      ]),
    ).toEqual({ phone: "919000000001", email: "a@x.com", bsuid: null, igsId: "1784", psid: null });
  });

  test("never takes a non-primary identity, even when it comes first", () => {
    expect(
      contactFields([
        { kind: "PHONE", value: "919000000002", isPrimary: false },
        { kind: "PHONE", value: "919000000001", isPrimary: true },
        { kind: "EMAIL", value: "old@x.com", isPrimary: false },
      ]),
    ).toEqual({ phone: "919000000001", email: null, bsuid: null, igsId: null, psid: null });
  });
});
