import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { waTemplate: { count: vi.fn() } },
  excludeFields: vi.fn(),
}));
vi.mock("./wa_templates.service.js", () => ({ getTemplateByIdAndOrgId: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { getTemplateByIdAndOrgId } from "./wa_templates.service.js";
import {
  WaTemplateCategory,
  WaTemplateComponentType,
  WaTemplateSupportedFormats,
} from "../../../types/enums.js";
import {
  generateTemplate,
  getFlowIdFromTemplateComponents,
  getTemplateInMessageFormat,
  getTemplateQuery,
  verifyTemplateSubscriptionLimit,
  waAllowedMimeTypes,
} from "./wa_templates.utils.js";

type Mock = ReturnType<typeof vi.fn>;

const templateCountMock = (prisma as unknown as { waTemplate: { count: Mock } }).waTemplate.count;
const getTemplateByIdMock = getTemplateByIdAndOrgId as unknown as Mock;

/** The minimum a create-template request has to carry. */
function input(overrides: Record<string, unknown> = {}): any {
  return { name: "order_update", body: "Your order is ready", language: "en", ...overrides };
}

/** The component of a given type from a generated template. */
function componentOfType(result: any, type: string) {
  return result.components.find((c: any) => c.type === type);
}

beforeEach(() => {
  vi.clearAllMocks();
  templateCountMock.mockResolvedValue(0);
});

describe("generateTemplate - the body", () => {
  test("carries the plain body text through", () => {
    const result = generateTemplate(input());

    expect(componentOfType(result, WaTemplateComponentType.BODY)).toEqual({
      type: WaTemplateComponentType.BODY,
      text: "Your order is ready",
    });
  });

  test("attaches an example for a body that uses variables", () => {
    const result = generateTemplate(
      input({ body: "Hi {{1}}, your order is ready", example: ["Ada"] }),
    );

    expect(componentOfType(result, WaTemplateComponentType.BODY)).toEqual({
      type: WaTemplateComponentType.BODY,
      text: "Hi {{1}}, your order is ready",
      example: { body_text: [["Ada"]] },
    });
  });

  test("names the template, its language and a default category", () => {
    const result = generateTemplate(input());

    expect(result).toMatchObject({
      name: "order_update",
      language: "en",
      category: WaTemplateCategory.MARKETING,
      allow_category_change: true,
    });
  });

  test("keeps an explicit category", () => {
    const result = generateTemplate(input({ category: WaTemplateCategory.UTILITY }));

    expect(result.category).toBe(WaTemplateCategory.UTILITY);
  });

  // NOTE: pins current behaviour. An authentication template asks Meta to generate
  // the body itself, so the text the user typed is dropped on the floor rather than
  // refused. Both branches of the outer if produce the same component, which is why
  // the body text never survives. See issues.txt 14.8.
  test("silently drops the body text of an authentication template", () => {
    const result = generateTemplate(
      input({ category: WaTemplateCategory.AUTHENTICATION, body: "Your code is {{1}}" }),
    );

    expect(componentOfType(result, WaTemplateComponentType.BODY)).toEqual({
      type: WaTemplateComponentType.BODY,
      add_security_recommendation: true,
    });
  });
});

describe("generateTemplate - headers, footers and buttons", () => {
  test("renders a text header inline", () => {
    const result = generateTemplate(
      input({ header: "Order update", format: WaTemplateSupportedFormats.TEXT }),
    );

    expect(componentOfType(result, WaTemplateComponentType.HEADER)).toEqual({
      type: WaTemplateComponentType.HEADER,
      format: WaTemplateSupportedFormats.TEXT,
      text: "Order update",
    });
  });

  test("renders a media header as an uploaded handle", () => {
    const result = generateTemplate(
      input({ header: "file-handle-1", format: WaTemplateSupportedFormats.IMAGE }),
    );

    expect(componentOfType(result, WaTemplateComponentType.HEADER)).toEqual({
      type: WaTemplateComponentType.HEADER,
      format: WaTemplateSupportedFormats.IMAGE,
      example: { header_handle: ["file-handle-1"] },
    });
  });

  test("renders a location header with no payload of its own", () => {
    const result = generateTemplate(
      input({ header: "anything", format: WaTemplateSupportedFormats.LOCATION }),
    );

    expect(componentOfType(result, WaTemplateComponentType.HEADER)).toEqual({
      type: WaTemplateComponentType.HEADER,
      format: WaTemplateSupportedFormats.LOCATION,
    });
  });

  test("adds a product header even when no header text was given", () => {
    const result = generateTemplate(input({ format: WaTemplateSupportedFormats.PRODUCT }));

    expect(componentOfType(result, WaTemplateComponentType.HEADER)).toEqual({
      type: WaTemplateComponentType.HEADER,
      format: WaTemplateSupportedFormats.PRODUCT,
    });
  });

  test("carries the buttons through", () => {
    const buttons = [{ type: "URL", text: "Track", url: "https://x/{{1}}" }];
    const result = generateTemplate(input({ buttons }));

    expect(componentOfType(result, WaTemplateComponentType.BUTTONS)).toEqual({
      type: WaTemplateComponentType.BUTTONS,
      buttons,
    });
  });

  test("carries a plain footer through", () => {
    const result = generateTemplate(input({ footer: "Reply STOP to opt out" }));

    expect(componentOfType(result, WaTemplateComponentType.FOOTER)).toEqual({
      type: WaTemplateComponentType.FOOTER,
      text: "Reply STOP to opt out",
    });
  });

  test("turns an authentication footer into a code expiry", () => {
    const result = generateTemplate(
      input({
        category: WaTemplateCategory.AUTHENTICATION,
        footer: "anything",
        code_expiration_minutes: "10",
      }),
    );

    expect(componentOfType(result, WaTemplateComponentType.FOOTER)).toEqual({
      type: WaTemplateComponentType.FOOTER,
      code_expiration_minutes: 10,
    });
  });

  test("omits the expiry from an authentication footer that states none", () => {
    const result = generateTemplate(
      input({ category: WaTemplateCategory.AUTHENTICATION, footer: "anything" }),
    );

    expect(componentOfType(result, WaTemplateComponentType.FOOTER)).toEqual({
      type: WaTemplateComponentType.FOOTER,
    });
  });

  // NOTE: pins current behaviour. Buttons are pushed before the header, so the
  // component array is body, buttons, header, footer — not the order Meta documents
  // its templates in. Meta accepts it today; noted because the next person reading
  // a stored template will not expect it. See issues.txt 14.8.
  test("puts the buttons ahead of the header in the component list", () => {
    const result = generateTemplate(
      input({
        buttons: [{ type: "QUICK_REPLY", text: "Yes" }],
        header: "Order update",
        format: WaTemplateSupportedFormats.TEXT,
        footer: "Thanks",
      }),
    );

    expect(result.components.map((c: any) => c.type)).toEqual([
      WaTemplateComponentType.BODY,
      WaTemplateComponentType.BUTTONS,
      WaTemplateComponentType.HEADER,
      WaTemplateComponentType.FOOTER,
    ]);
  });
});

describe("generateTemplate - carousels", () => {
  const card = {
    header: "handle-1",
    format: WaTemplateSupportedFormats.IMAGE,
    body: "Card one",
    buttons: [{ type: "QUICK_REPLY", text: "More" }],
  };

  test("builds a media carousel card from its header, body and buttons", () => {
    const result = generateTemplate(input({ mediaCarousel: [card] }));

    const carousel = componentOfType(result, WaTemplateComponentType.CAROUSEL);
    expect(carousel.cards).toHaveLength(1);
    expect(carousel.cards[0].components.map((c: any) => c.type)).toEqual([
      WaTemplateComponentType.HEADER,
      WaTemplateComponentType.BODY,
      WaTemplateComponentType.BUTTONS,
    ]);
  });

  test("attaches an example to a carousel body that uses variables", () => {
    const result = generateTemplate(
      input({ mediaCarousel: [{ ...card, body: "Hi {{1}}", example: ["Ada"] }] }),
    );

    const body = componentOfType(result, WaTemplateComponentType.CAROUSEL).cards[0].components.find(
      (c: any) => c.type === WaTemplateComponentType.BODY,
    );
    expect(body.example).toEqual({ body_text: [["Ada"]] });
  });

  test("builds a product carousel card from its button alone", () => {
    const result = generateTemplate(
      input({ productCarousel: [{ button: { type: "SPM", text: "Buy" } }] }),
    );

    const carousel = componentOfType(result, WaTemplateComponentType.CAROUSEL);
    expect(carousel.cards[0].components).toEqual([
      { type: WaTemplateComponentType.HEADER, format: WaTemplateSupportedFormats.PRODUCT },
      { type: WaTemplateComponentType.BUTTONS, buttons: [{ type: "SPM", text: "Buy" }] },
    ]);
  });

  test("leaves the top-level header and buttons out once a carousel is present", () => {
    const result = generateTemplate(
      input({ mediaCarousel: [card], header: "Ignored", buttons: [{ type: "URL" }] }),
    );

    expect(result.components.map((c: any) => c.type)).toEqual([
      WaTemplateComponentType.BODY,
      WaTemplateComponentType.CAROUSEL,
    ]);
  });

  // NOTE: pins current behaviour. `card.buttons.length` is read with no optional
  // chaining, unlike every other card field, so a carousel card saved without a
  // buttons array throws instead of producing a button-less card.
  // See issues.txt 14.8.
  test("throws on a carousel card that has no buttons array", () => {
    expect(() => generateTemplate(input({ mediaCarousel: [{ header: "h", body: "b" }] }))).toThrow(
      TypeError,
    );
  });
});

describe("getFlowIdFromTemplateComponents", () => {
  test("finds the flow behind a flow button", () => {
    const components: any = [
      { type: "BODY", text: "hi" },
      { type: "BUTTONS", buttons: [{ type: "FLOW", flow_id: 12345 }] },
    ];

    expect(getFlowIdFromTemplateComponents(components)).toBe("12345");
  });

  test("reports nothing for a template with no buttons at all", () => {
    expect(getFlowIdFromTemplateComponents([{ type: "BODY", text: "hi" }] as any)).toBeUndefined();
  });

  test("reports nothing when none of the buttons opens a flow", () => {
    const components: any = [{ type: "BUTTONS", buttons: [{ type: "URL", url: "https://x" }] }];

    expect(getFlowIdFromTemplateComponents(components)).toBeUndefined();
  });

  test("finds the flow button whatever its position", () => {
    const components: any = [
      { type: "BUTTONS", buttons: [{ type: "URL" }, { type: "FLOW", flow_id: 99 }] },
    ];

    expect(getFlowIdFromTemplateComponents(components)).toBe("99");
  });
});

describe("getTemplateInMessageFormat", () => {
  function messageBody(components: any[]): any {
    return { template: { name: "order_update", language: "en", components } };
  }

  test("nests the language code the way the send API expects", () => {
    const result = getTemplateInMessageFormat(messageBody([]), null);

    expect(result.template.language).toEqual({ code: "en" });
  });

  test("renders a media header as a link parameter", () => {
    const result = getTemplateInMessageFormat(messageBody([{ type: "HEADER", format: "IMAGE" }]), {
      header: "https://cdn/i.jpg",
    });

    expect(result.template.components![0]).toEqual({
      type: "header",
      format: "image",
      parameters: [{ type: "image", image: { link: "https://cdn/i.jpg" } }],
    });
  });

  test("renders a text header inline", () => {
    const result = getTemplateInMessageFormat(
      messageBody([{ type: "HEADER", format: "TEXT", text: "Order update" }]),
      null,
    );

    expect(result.template.components![0]).toEqual({
      type: "header",
      format: "text",
      text: "Order update",
    });
  });

  test("flattens each button into its own component", () => {
    const result = getTemplateInMessageFormat(
      messageBody([{ type: "BUTTONS", buttons: [{ text: "Yes" }, { text: "No" }] }]),
      null,
    );

    expect(result.template.components).toEqual([
      { type: "button", sub_type: "quick_reply", index: "0", text: "Yes" },
      { type: "button", sub_type: "quick_reply", index: "1", text: "No" },
    ]);
  });

  // NOTE: pins current behaviour. getHeaderObject's switch has no default, so a
  // PRODUCT header — a format this codebase does create — yields undefined, and
  // that undefined is left in the components array sent to Meta.
  // See issues.txt 14.9.
  test("leaves an undefined hole for a header format it cannot render", () => {
    const result = getTemplateInMessageFormat(
      messageBody([{ type: "HEADER", format: "PRODUCT" }]),
      null,
    );

    expect(result.template.components).toEqual([undefined]);
  });

  // NOTE: same shape — an unrecognised component type falls off the end of the
  // outer switch and contributes undefined. See issues.txt 14.9.
  test("leaves an undefined hole for a component type it does not know", () => {
    const result = getTemplateInMessageFormat(messageBody([{ type: "CAROUSEL" }]), null);

    expect(result.template.components).toEqual([undefined]);
  });
});

describe("getTemplateQuery", () => {
  const template = {
    data: {
      name: "order_update",
      language: "en",
      components: [{ type: "HEADER", format: "IMAGE" }],
    },
  };

  beforeEach(() => {
    getTemplateByIdMock.mockResolvedValue(template);
  });

  test("returns just the name and language when there is nothing to fill in", async () => {
    await expect(getTemplateQuery("tpl-1", "org-1", null)).resolves.toEqual({
      name: "order_update",
      language: { code: "en" },
    });
  });

  test("scopes the template lookup to the caller's org", async () => {
    await getTemplateQuery("tpl-1", "org-1", null);

    expect(getTemplateByIdMock).toHaveBeenCalledWith("tpl-1", "org-1");
  });

  test("refuses when a media header has no link to fill in", async () => {
    await expect(getTemplateQuery("tpl-1", "org-1", {})).rejects.toThrow(
      "Header parameter is missing",
    );
  });

  // NOTE: pins current behaviour, and this one means the function has never worked.
  // The parameter list is spelled `paramteters`, so what Meta receives is a header
  // component carrying no parameters at all. Nothing in the repo calls
  // getTemplateQuery today — sendTemplateToUserCore builds its own components — so
  // this is latent. See issues.txt 14.9.
  test("misspells the parameter list, so the link it resolved is not sent", async () => {
    const result: any = await getTemplateQuery("tpl-1", "org-1", { header: "https://cdn/i.jpg" });

    expect(result.components[0]).toHaveProperty("paramteters");
    expect(result.components[0]).not.toHaveProperty("parameters");
  });

  // NOTE: the HEADER case has no break after its inner switch, so a text header
  // falls through to `default: return null` and leaves a null in the array.
  // See issues.txt 14.9.
  test("leaves a null for a header format the inner switch does not match", async () => {
    getTemplateByIdMock.mockResolvedValue({
      data: { name: "n", language: "en", components: [{ type: "HEADER", format: "TEXT" }] },
    });

    const result: any = await getTemplateQuery("tpl-1", "org-1", { header: "x" });

    expect(result.components).toEqual([null]);
  });
});

describe("waAllowedMimeTypes", () => {
  test("allows exactly the four formats WhatsApp headers support", () => {
    expect(waAllowedMimeTypes).toEqual(["image/jpeg", "image/png", "video/mp4", "application/pdf"]);
  });
});

describe("verifyTemplateSubscriptionLimit", () => {
  function request(features: unknown = { whatsapp: { count: { max: 3 } } }): any {
    return { user: { orgId: "org-1" }, subscription: { features } };
  }

  function reply() {
    const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
    return rep;
  }

  test("lets an org under its template limit through", async () => {
    templateCountMock.mockResolvedValue(2);
    const rep = reply();

    await verifyTemplateSubscriptionLimit(request(), rep);

    expect(rep.code).not.toHaveBeenCalled();
  });

  test("counts only the caller's own templates", async () => {
    await verifyTemplateSubscriptionLimit(request(), reply());

    expect(templateCountMock.mock.calls[0][0]).toEqual({ where: { orgId: "org-1" } });
  });

  test("refuses an org that has reached its limit, naming the limit", async () => {
    templateCountMock.mockResolvedValue(3);
    const rep = reply();

    await verifyTemplateSubscriptionLimit(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send.mock.calls[0][0].message).toBe(
      "You have reached the maximum limit of 3 templates.",
    );
  });

  test("refuses an org with no subscription at all", async () => {
    const rep = reply();

    await verifyTemplateSubscriptionLimit(
      { user: { orgId: "org-1" }, subscription: null } as any,
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(403);
  });

  // NOTE: pins current behaviour, identical to issues.txt 11.7 and the same shape
  // as 2.2 — comparing against an undefined max is always false, so a plan that
  // states no template count grants unlimited templates. See issues.txt 14.7.
  test("enforces no limit when the plan does not state one", async () => {
    templateCountMock.mockResolvedValue(9999);
    const rep = reply();

    await verifyTemplateSubscriptionLimit(request({ whatsapp: { active: true } }), rep);

    expect(rep.code).not.toHaveBeenCalled();
  });

  // NOTE: the count query is inside the try, so a database failure is reported to
  // the user as a 403 carrying the raw error text. See issues.txt 14.7.
  test("reports a database failure to the user as a refusal", async () => {
    templateCountMock.mockRejectedValue(new Error("connection terminated unexpectedly"));
    const rep = reply();

    await verifyTemplateSubscriptionLimit(request(), rep);

    expect(rep.send.mock.calls[0][0]).toEqual({
      message: "connection terminated unexpectedly",
      displayMessageInClient: true,
    });
  });
});
