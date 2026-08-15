import { describe, expect, test } from "vitest";

import {
  getFlowIdFromTemplateComponents,
  getFlowIdsFromTemplateComponents,
} from "./waTemplateComponents.js";
import { WaTemplateComponent } from "../types/whatsapp.types.js";

/** Components as a create payload carries them: lowercase type names. */
function buttons(...list: Array<Record<string, unknown>>): WaTemplateComponent {
  return { type: "buttons", buttons: list } as unknown as WaTemplateComponent;
}

const FLOW_BUTTON = { type: "FLOW", text: "Open", flow_id: "flow-1" };

describe("getFlowIdFromTemplateComponents", () => {
  test("reads the flow id off the first FLOW button", () => {
    expect(getFlowIdFromTemplateComponents([buttons(FLOW_BUTTON)])).toBe("flow-1");
  });

  test("reports nothing when no button opens a flow", () => {
    expect(
      getFlowIdFromTemplateComponents([buttons({ type: "URL", url: "https://example.com" })]),
    ).toBeUndefined();
  });
});

describe("getFlowIdsFromTemplateComponents", () => {
  test("collects every FLOW button, not just the first", () => {
    expect(
      getFlowIdsFromTemplateComponents([
        buttons(FLOW_BUTTON, { type: "FLOW", text: "Book", flow_id: "flow-2" }),
      ]),
    ).toEqual(["flow-1", "flow-2"]);
  });

  test("reaches the buttons inside carousel cards", () => {
    const carousel = {
      type: "carousel",
      cards: [{ components: [buttons({ type: "FLOW", text: "Open", flow_id: "flow-3" })] }],
    } as unknown as WaTemplateComponent;

    expect(getFlowIdsFromTemplateComponents([carousel])).toEqual(["flow-3"]);
  });

  test("reports each flow once, however many buttons point at it", () => {
    expect(getFlowIdsFromTemplateComponents([buttons(FLOW_BUTTON), buttons(FLOW_BUTTON)])).toEqual([
      "flow-1",
    ]);
  });

  test("ignores buttons of every other kind", () => {
    expect(
      getFlowIdsFromTemplateComponents([
        { type: "body", text: "Hello" } as unknown as WaTemplateComponent,
        buttons({ type: "QUICK_REPLY", text: "Yes" }, { type: "URL", url: "https://example.com" }),
      ]),
    ).toEqual([]);
  });

  test("holds up against a component list with no buttons at all", () => {
    expect(getFlowIdsFromTemplateComponents([])).toEqual([]);
  });
});
