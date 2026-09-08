import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { EventTrigger } from "@/backend/loyalty/eventTriggers.api";
import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import type { LoyaltyWaCommand } from "@/backend/loyalty/settings/settings.api";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";

import { loyaltyMessageCatalog } from "./loyaltyMessageCatalog";
import { templateBodyOf, templateHasRichParts, usageOf, usedTemplateIds } from "./templateUsage";

const t = ((key: string) => key) as unknown as TFunction;
const catalog = loyaltyMessageCatalog(t);

function entry(components: unknown[]): Pick<WaTemplateListEntry, "data"> {
  return { data: { components } } as unknown as Pick<WaTemplateListEntry, "data">;
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
