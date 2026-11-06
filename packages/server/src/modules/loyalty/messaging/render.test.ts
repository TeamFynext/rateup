import { describe, expect, test } from "vitest";

import {
  fillPlaceholders,
  isTextDowngradable,
  renderTemplateAsText,
  renderTemplateBody,
} from "./render.js";

const BODY = { type: "BODY", text: "Hi {{1}}, you earned {{2}} points." };
const FOOTER = { type: "FOOTER", text: "Powered by rateup.app" };
const TEXT_HEADER = { type: "HEADER", format: "TEXT", text: "Kettle & Co" };
const IMAGE_HEADER = { type: "HEADER", format: "IMAGE" };
const BUTTONS = { type: "BUTTONS", buttons: [{ type: "URL", text: "Open" }] };

describe("fillPlaceholders", () => {
  test("fills in order and blanks a missing one", () => {
    expect(fillPlaceholders("{{2}} and {{1}} and {{3}}", ["a", "b"])).toBe("b and a and ");
  });
});

describe("renderTemplateBody", () => {
  test("fills the placeholders in order and blanks a missing one", () => {
    expect(renderTemplateBody([BODY], ["Ann"])).toBe("Hi Ann, you earned  points.");
  });

  test("is null without a body", () => {
    expect(renderTemplateBody([FOOTER], ["Ann"])).toBeNull();
    expect(renderTemplateBody(undefined, ["Ann"])).toBeNull();
  });
});

describe("renderTemplateAsText", () => {
  test("puts a text header on its own bold line and drops the footer", () => {
    expect(renderTemplateAsText([TEXT_HEADER, BODY, FOOTER], ["Ann", "43"])).toBe(
      "*Kettle & Co*\n\nHi Ann, you earned 43 points.",
    );
  });

  test("is just the body when there is no header", () => {
    expect(renderTemplateAsText([BODY, FOOTER], ["Ann", "43"])).toBe(
      "Hi Ann, you earned 43 points.",
    );
  });
});

describe("isTextDowngradable", () => {
  test("a body, a text header and a footer lose nothing as text", () => {
    expect(isTextDowngradable([BODY])).toBe(true);
    expect(isTextDowngradable([TEXT_HEADER, BODY, FOOTER])).toBe(true);
  });

  test("buttons and media headers have no text equivalent", () => {
    expect(isTextDowngradable([BODY, BUTTONS])).toBe(false);
    expect(isTextDowngradable([IMAGE_HEADER, BODY])).toBe(false);
  });

  test("nothing without a body", () => {
    expect(isTextDowngradable([FOOTER])).toBe(false);
    expect(isTextDowngradable(null)).toBe(false);
  });
});
