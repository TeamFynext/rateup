import { describe, expect, test } from "vitest";
import {
  bodySnippet,
  buildBodyParameterData,
  fillPlaceholders,
  getBodyVariables,
  getMissingVariables,
} from "./templateVariables";

const body = (text: string, example?: any) => [{ type: "BODY", text, example }];

describe("getBodyVariables", () => {
  test("finds numbered variables in order, with their examples", () => {
    const vars = getBodyVariables(
      body("Hi {{2}}, order {{1}} and {{2}} again", { body_text: [["#42", "Sam"]] }),
    );
    expect(vars).toEqual([
      { key: "1", example: "#42" },
      { key: "2", example: "Sam" },
    ]);
  });

  test("reads a flat body_text list", () => {
    expect(getBodyVariables(body("Hi {{1}}", { body_text: ["Sam"] }))).toEqual([
      { key: "1", example: "Sam" },
    ]);
  });

  test("reads named variables", () => {
    const vars = getBodyVariables(
      body("Hi {{ first_name }}", {
        body_text_named_params: [{ param_name: "first_name", example: "Sam" }],
      }),
    );
    expect(vars).toEqual([{ key: "first_name", example: "Sam" }]);
  });

  test("no body or no variables gives none", () => {
    expect(getBodyVariables(undefined)).toEqual([]);
    expect(getBodyVariables(body("Plain text"))).toEqual([]);
  });
});

describe("filling and sending", () => {
  const vars = [
    { key: "1", example: "Sam" },
    { key: "2", example: "" },
  ];

  test("only blank variables without an example are missing", () => {
    expect(getMissingVariables(vars, {}).map((v) => v.key)).toEqual(["2"]);
    expect(getMissingVariables(vars, { "2": " x " })).toEqual([]);
  });

  test("preview uses typed value, then example, then the placeholder", () => {
    expect(fillPlaceholders("A {{1}} B {{2}}", vars, {})).toEqual([
      { text: "A " },
      { text: "Sam", variable: "1", filled: false },
      { text: " B " },
      { text: "{{2}}", variable: "2", filled: false },
    ]);
    expect(fillPlaceholders("{{1}}", vars, { "1": "Ann" })[0]).toEqual({
      text: "Ann",
      variable: "1",
      filled: true,
    });
  });

  test("builds the body component the API expects", () => {
    expect(buildBodyParameterData([], {})).toEqual([]);
    expect(buildBodyParameterData(vars, { "2": " #9 " })).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "" },
          { type: "text", text: "#9" },
        ],
      },
    ]);
    expect(buildBodyParameterData([{ key: "name", example: "" }], { name: "Sam" })).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Sam", parameter_name: "name" }] },
    ]);
  });

  test("snippet shows examples on one line", () => {
    expect(bodySnippet(body("Hi {{1}},\n\nthanks", { body_text: [["Sam"]] }))).toBe(
      "Hi Sam, thanks",
    );
  });
});
