import { describe, expect, it } from "vite-plus/test";
import { cleanTemplateParamText, cleanTemplateTextParams } from "./templateParams.js";

describe("cleanTemplateParamText", () => {
  it("turns new lines, tabs and long space runs into one space", () => {
    expect(cleanTemplateParamText("Line one\nLine two")).toBe("Line one Line two");
    expect(cleanTemplateParamText("a \r\n\t b")).toBe("a b");
    expect(cleanTemplateParamText("a     b")).toBe("a b");
  });

  it("keeps up to four spaces, which Meta allows", () => {
    expect(cleanTemplateParamText("a    b")).toBe("a    b");
  });
});

describe("cleanTemplateTextParams", () => {
  it("cleans body, button and carousel text parameters", () => {
    const message = {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "t",
        components: [
          { type: "body", parameters: [{ type: "text", text: "Hi\nthere" }] },
          { type: "button", sub_type: "url", parameters: [{ type: "text", text: "a\tb" }] },
          {
            type: "carousel",
            cards: [
              {
                card_index: 0,
                components: [{ type: "body", parameters: [{ type: "text", text: "x\ny" }] }],
              },
            ],
          },
        ],
      },
    };
    const cleaned = cleanTemplateTextParams(message);
    expect(cleaned.template.components[0].parameters?.[0].text).toBe("Hi there");
    expect(cleaned.template.components[1].parameters?.[0].text).toBe("a b");
    expect(cleaned.template.components[2].cards?.[0].components[0].parameters[0].text).toBe("x y");
    // The input is left untouched.
    expect(message.template.components[0].parameters?.[0].text).toBe("Hi\nthere");
  });

  it("leaves non-template messages and other parameter types alone", () => {
    const text = { type: "text", text: { body: "a\nb" } };
    expect(cleanTemplateTextParams(text)).toBe(text);
    const image = {
      type: "template",
      template: {
        components: [{ type: "header", parameters: [{ type: "image", image: { link: "u" } }] }],
      },
    };
    expect(cleanTemplateTextParams(image)).toEqual(image);
  });
});
