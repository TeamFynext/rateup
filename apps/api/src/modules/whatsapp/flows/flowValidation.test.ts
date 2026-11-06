import { describe, expect, test } from "vite-plus/test";
import { describeFlowValidationErrors, FlowValidationError } from "./flowValidation.js";

const json = {
  version: "7.2",
  screens: [
    {
      id: "QUESTION_ONE",
      title: "Feedback",
      layout: {
        type: "SingleColumnLayout",
        children: [
          { type: "TextInput", name: "q1", label: "Your name" },
          { type: "RadioButtonsGroup", name: "q2" },
        ],
      },
    },
  ],
};

describe("describeFlowValidationErrors", () => {
  // Element names are generated ids, so an element is named by its type.
  test("names the screen and the element's kind, never the element's id", () => {
    expect(
      describeFlowValidationErrors(json, [
        {
          message: "Required property 'label' is missing.",
          pointers: [{ path: "screens[0].layout.children[1].label" }],
        },
        { message: "b", pointers: [{ path: "screens[0].title" }] },
        { message: "c", pointers: [{ path: "screens[4].layout" }] },
      ]),
    ).toEqual([
      `Screen 1 "Feedback": A single choice question has no label.`,
      `Screen 1 "Feedback": b`,
      "Screen 5: c",
    ]);
  });

  test("rewrites Meta's common messages in the builder's words", () => {
    const withFooter = {
      screens: [
        {
          title: "End",
          layout: {
            children: [
              { type: "Dropdown", name: "x" },
              { type: "Footer", label: "" },
            ],
          },
        },
      ],
    };
    expect(
      describeFlowValidationErrors(withFooter, [
        {
          message: "Expected property 'data-source' to have at least 1 item(s).",
          pointers: [{ path: "screens[0].layout.children[0].data-source" }],
        },
        {
          message: "Property 'label' should have at least 1 character(s).",
          pointers: [{ path: "screens[0].layout.children[1].label" }],
        },
        {
          message: "Property 'label' should have at most 30 characters.",
          pointers: [{ path: "screens[0].layout.children[0].label" }],
        },
        {
          message: "Required property 'title' is missing.",
          pointers: [{ path: "screens[0]" }],
        },
      ]),
    ).toEqual([
      `Screen 1 "End": A dropdown has no options.`,
      `Screen 1 "End": The button has no text.`,
      `Screen 1 "End": A dropdown's label is too long.`,
      `Screen 1 "End": This screen has no title.`,
    ]);
  });

  test("keeps Meta's message when there is no pointer, and drops duplicates", () => {
    expect(
      describeFlowValidationErrors(json, [
        { error: "INVALID_PROPERTY", message: "Bad routing model." },
        { error: "INVALID_PROPERTY", message: "Bad routing model." },
        { error: "MISSING_THING" },
      ]),
    ).toEqual(["Bad routing model.", "MISSING_THING"]);
  });
});

describe("FlowValidationError", () => {
  test("quotes a single error and counts several", () => {
    expect(new FlowValidationError(["x"]).message).toBe("Fix this before saving to WhatsApp: x");
    expect(new FlowValidationError(["x", "y"]).message).toBe(
      "Fix 2 issues before saving to WhatsApp",
    );
  });
});
