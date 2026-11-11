import type { TFunction } from "i18next";
import { describe, expect, test } from "vite-plus/test";

import { contactHandles, contactHandleText } from "./ContactHandleCell";

const t = ((key: string) => key) as unknown as TFunction;

describe("the contacts table's phone / handle column", () => {
  test("a merged contact leads with its phone and lists the rest", () => {
    const row = {
      phone: "919188346187",
      source: "WHATSAPP",
      identities: [
        { kind: "PHONE" as const, value: "919188346187", isPrimary: true },
        { kind: "EMAIL" as const, value: "alen@example.com", isPrimary: true },
        { kind: "WA_BSUID" as const, value: "IN.16845", username: "Alen Joy", isPrimary: true },
        { kind: "IG_SCOPED" as const, value: "1784", username: "al_enjoy7z", isPrimary: true },
        { kind: "WEBCHAT" as const, value: "919188346187", isPrimary: true },
      ],
    };
    expect(contactHandleText(row, t)).toBe("+919188346187");
    expect(contactHandles(row).others.map((identity) => identity.kind)).toEqual([
      "EMAIL",
      "WA_BSUID",
      "IG_SCOPED",
      "WEBCHAT",
    ]);
  });

  test("an Instagram contact shows its @handle, never the raw id", () => {
    const row = {
      phone: "",
      source: "INSTAGRAM",
      identities: [{ kind: "IG_SCOPED" as const, value: "2244447109628860", username: "rinu.k" }],
    };
    expect(contactHandleText(row, t)).toBe("@rinu.k");
  });

  test("an Instagram contact with no username yet shows its id", () => {
    const row = {
      phone: "",
      source: "INSTAGRAM",
      identities: [{ kind: "IG_SCOPED" as const, value: "2244447109628860" }],
    };
    expect(contactHandleText(row, t)).toBe("2244447109628860");
  });

  test("a webchat visitor shows the number they typed", () => {
    const row = {
      phone: "",
      source: "WEBCHAT",
      identities: [{ kind: "WEBCHAT" as const, value: "919098765432" }],
    };
    expect(contactHandleText(row, t)).toBe("+919098765432");
  });

  test("a row without identities falls back to its phone", () => {
    expect(contactHandleText({ phone: "919000000001", source: "IMPORT" }, t)).toBe("919000000001");
  });
});
