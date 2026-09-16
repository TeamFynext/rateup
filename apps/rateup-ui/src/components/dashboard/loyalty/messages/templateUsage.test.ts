import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { EventTrigger } from "@/backend/loyalty/eventTriggers.api";
import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import type { LoyaltyWaCommand } from "@/backend/loyalty/settings/settings.api";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";

import { loyaltyMessageCatalog } from "./loyaltyMessageCatalog";
import {
  findStarterTemplate,
  starterTemplateVersion,
  templateBodyOf,
  templateHasRichParts,
  usageOf,
  usedTemplateIds,
} from "./templateUsage";

const t = ((key: string) => key) as unknown as TFunction;
const catalog = loyaltyMessageCatalog(t);

function entry(components: unknown[]): Pick<WaTemplateListEntry, "data"> {
  return { data: { components } } as unknown as Pick<WaTemplateListEntry, "data">;
}

function named(
  id: string,
  name: string,
  createdAt = "2026-01-01T00:00:00.000Z",
): WaTemplateListEntry {
  return { id, createdAt, data: { name } } as unknown as WaTemplateListEntry;
}

function trigger(eventType: LoyaltyEventType, waTemplateId: string | undefined): EventTrigger {
  return {
    id: `trg-${eventType}`,
    programId: "p",
    eventType,
    enabled: true,
    waTemplateId,
  } as EventTrigger;
}

function command(requestMessage: string, waTemplateId: string | null): LoyaltyWaCommand {
  return {
    id: `cmd-${requestMessage}`,
    orgId: "o",
    type: "PointInformation",
    requestMessage,
    content: null,
    responseType: waTemplateId ? "Template" : "Text",
    waTemplateId,
  };
}

describe("templateBodyOf", () => {
  test("reads the BODY component whatever the casing", () => {
    expect(
      templateBodyOf(
        entry([
          { type: "HEADER", text: "x" },
          { type: "body", text: "Hi {{1}}" },
        ]),
      ),
    ).toBe("Hi {{1}}");
  });

  test("is undefined without a body or a template", () => {
    expect(templateBodyOf(entry([{ type: "FOOTER", text: "x" }]))).toBeUndefined();
    expect(templateBodyOf(undefined)).toBeUndefined();
  });
});

describe("templateHasRichParts", () => {
  test("a body, a text header and a footer are plain", () => {
    expect(
      templateHasRichParts(
        entry([
          { type: "HEADER", format: "TEXT", text: "x" },
          { type: "BODY", text: "y" },
          { type: "FOOTER", text: "z" },
        ]),
      ),
    ).toBe(false);
  });

  test("buttons and a media header are not", () => {
    expect(templateHasRichParts(entry([{ type: "BODY", text: "y" }, { type: "BUTTONS" }]))).toBe(
      true,
    );
    expect(
      templateHasRichParts(
        entry([
          { type: "HEADER", format: "IMAGE" },
          { type: "BODY", text: "y" },
        ]),
      ),
    ).toBe(true);
  });
});

describe("usageOf", () => {
  const triggers = [
    trigger(LoyaltyEventType.POINTS_ISSUED, "tmpl-1"),
    trigger(LoyaltyEventType.BIRTHDAY, "tmpl-2"),
    trigger(LoyaltyEventType.TIER_UPGRADED, undefined),
  ];
  const commands = [command("points", "tmpl-1"), command("stop", null)];

  test("names the events and keywords that point at a template", () => {
    expect(usageOf("tmpl-1", triggers, commands, catalog)).toEqual([
      { kind: "event", label: "When points are earned" },
      { kind: "keyword", label: "points" },
    ]);
  });

  test("an unused template has no usage", () => {
    expect(usageOf("tmpl-9", triggers, commands, catalog)).toEqual([]);
  });

  test("falls back to the raw event type for an event the catalog does not know", () => {
    const odd = [{ ...triggers[0], eventType: "SOMETHING_NEW" as LoyaltyEventType }];
    expect(usageOf("tmpl-1", odd, [], catalog)).toEqual([
      { kind: "event", label: "SOMETHING_NEW" },
    ]);
  });

  test("usedTemplateIds collects every referenced id once", () => {
    expect([...usedTemplateIds(triggers, commands)].sort()).toEqual(["tmpl-1", "tmpl-2"]);
  });
});

describe("starterTemplateVersion", () => {
  test("reads the base name as version 1 and the _vN suffixes after it", () => {
    expect(starterTemplateVersion("loyalty_birthday", "loyalty_birthday")).toBe(1);
    expect(starterTemplateVersion("loyalty_birthday", "loyalty_birthday_v2")).toBe(2);
    expect(starterTemplateVersion("loyalty_birthday", "loyalty_birthday_v13")).toBe(13);
  });

  test("does not claim another message's template", () => {
    // `loyalty_points_issued` is a prefix of neither, but a bare startsWith would take
    // both `_adjusted` and a merchant's own `_mine` as versions of it.
    expect(starterTemplateVersion("loyalty_points", "loyalty_points_issued")).toBeNull();
    expect(starterTemplateVersion("loyalty_birthday", "loyalty_birthday_mine")).toBeNull();
    expect(starterTemplateVersion("loyalty_birthday", "loyalty_tier_upgraded")).toBeNull();
    expect(starterTemplateVersion("loyalty_birthday", undefined)).toBeNull();
  });
});

describe("findStarterTemplate", () => {
  test("finds the template a starter already produced, draft or not", () => {
    const draft = named("t1", "loyalty_birthday");
    expect(
      findStarterTemplate([named("t0", "loyalty_tier_upgraded"), draft], "loyalty_birthday"),
    ).toBe(draft);
  });

  test("prefers the newest version over the base name", () => {
    const base = named("t1", "loyalty_birthday");
    const v3 = named("t3", "loyalty_birthday_v3");
    const v2 = named("t2", "loyalty_birthday_v2");
    expect(findStarterTemplate([base, v3, v2], "loyalty_birthday")).toBe(v3);
  });

  test("breaks a tie on the same version by taking the newest row", () => {
    const older = named("t1", "loyalty_birthday", "2026-01-01T00:00:00.000Z");
    const newer = named("t2", "loyalty_birthday", "2026-02-01T00:00:00.000Z");
    expect(findStarterTemplate([older, newer], "loyalty_birthday")).toBe(newer);
  });

  test("is undefined when the message has no template of its own", () => {
    expect(
      findStarterTemplate([named("t0", "loyalty_tier_upgraded")], "loyalty_birthday"),
    ).toBeUndefined();
  });
});
