import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { waFlow: { count: vi.fn() } },
  excludeFields: vi.fn(),
}));
vi.mock("../../survey/survey.service.js", () => ({ createSurvey: vi.fn() }));
vi.mock("../../question/question.service.js", () => ({ createQuestion: vi.fn() }));
vi.mock("../../../utils/upload/s3Upload.js", () => ({ getFileUrlFromKey: vi.fn() }));
vi.mock("../../../utils/misc/random.utils.js", () => ({ getUniqueRandomAlphaId: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { getUniqueRandomAlphaId } from "../../../utils/misc/random.utils.js";
import {
  LogicCondition,
  QuestionType,
  WaFlowFormElementType,
  WaFlowLayoutType,
  WaFlowStatus,
  WaQuestions,
} from "../../../types/enums.js";
import {
  convertHeaderToNewQuestion,
  findElementNameFromPayloadName,
  generateDataSourceFromQuestion,
  generateFlowMessageData,
  getFlowFormElementNameFromQuestionId,
  getQuestionIdFromFlowFormElementName,
  injectIdToFlowJson,
  parseFlowResponse,
  parseFlowResponseV2,
  questionTypeToFlowFormElementType,
  removeEmptyStrings,
  removeIdFromFlowJson,
  sanitizeScreenData,
  validateFlowLogic,
  verifyFlowSubscriptionLimit,
  waFlowFormElementIterator,
} from "./flow.utils.js";

type Mock = ReturnType<typeof vi.fn>;

const flowCountMock = (prisma as unknown as { waFlow: { count: Mock } }).waFlow.count;
const getFileUrlFromKeyMock = getFileUrlFromKey as unknown as Mock;
const randomIdMock = getUniqueRandomAlphaId as unknown as Mock;

/** A minimal flow row of the shape generateFlowMessageData reads. */
function dbFlow(overrides: Record<string, unknown> = {}): any {
  return {
    flowId: "wa-flow-1",
    status: WaFlowStatus.PUBLISHED,
    templateMessage: { body: "Rate us", cta: "Start" },
    json: { screens: [{ id: "SCREEN_ONE" }, { id: "SCREEN_TWO" }] },
    ...overrides,
  };
}

/** The parameters block of the interactive flow message. */
function params(message: any) {
  return message.interactive.action.parameters;
}

beforeEach(() => {
  vi.clearAllMocks();
  getFileUrlFromKeyMock.mockReturnValue("https://cdn/header.png");
  randomIdMock.mockReturnValue("abc123");
  flowCountMock.mockResolvedValue(0);
});

describe("generateFlowMessageData", () => {
  test("addresses the recipient and opens the flow on its first screen", () => {
    const message = generateFlowMessageData({ to: "15550001", dbFlow: dbFlow() });

    expect(message.to).toBe("15550001");
    expect(params(message).flow_id).toBe("wa-flow-1");
    expect(params(message).flow_action_payload).toEqual({ screen: "SCREEN_ONE" });
  });

  test("sends the flow in the mode matching its status, lowercased", () => {
    expect(params(generateFlowMessageData({ to: "1", dbFlow: dbFlow() })).mode).toBe("published");
    expect(
      params(generateFlowMessageData({ to: "1", dbFlow: dbFlow({ status: WaFlowStatus.DRAFT }) }))
        .mode,
    ).toBe("draft");
  });

  test("carries the body and call-to-action from the flow's template message", () => {
    const message = generateFlowMessageData({ to: "1", dbFlow: dbFlow() });

    expect(message.interactive!.body).toEqual({ text: "Rate us" });
    expect(params(message).flow_cta).toBe("Start");
  });

  test("falls back to a default body and call-to-action when the template has neither", () => {
    const message = generateFlowMessageData({ to: "1", dbFlow: dbFlow({ templateMessage: {} }) });

    expect(message.interactive!.body).toEqual({ text: "Would you like to start survey?" });
    expect(params(message).flow_cta).toBe("Open");
  });

  test("adds a RateUp footer when the template supplies none", () => {
    const message = generateFlowMessageData({ to: "1", dbFlow: dbFlow() });

    expect(message.interactive!.footer).toEqual({ text: "Powered by RateUp" });
  });

  test("keeps the template's own footer when it has one", () => {
    const message = generateFlowMessageData({
      to: "1",
      dbFlow: dbFlow({ templateMessage: { body: "b", cta: "c", footer: "Ask us anything" } }),
    });

    expect(message.interactive!.footer).toEqual({ text: "Ask us anything" });
  });

  test("resolves a header image key to a public url", () => {
    const message = generateFlowMessageData({
      to: "1",
      dbFlow: dbFlow({ templateMessage: { body: "b", cta: "c", headerImage: "key/header.png" } }),
    });

    expect(getFileUrlFromKeyMock).toHaveBeenCalledWith("key/header.png");
    expect(message.interactive!.header).toEqual({
      type: "image",
      image: { link: "https://cdn/header.png" },
    });
  });

  test("prefers an image header over a text header when the template has both", () => {
    const message = generateFlowMessageData({
      to: "1",
      dbFlow: dbFlow({
        templateMessage: { body: "b", cta: "c", header: "Hello", headerImage: "key.png" },
      }),
    });

    expect(message.interactive!.header!.type).toBe("image");
  });

  test("refuses to send a flow that is neither draft nor published", () => {
    expect(() =>
      generateFlowMessageData({ to: "1", dbFlow: dbFlow({ status: WaFlowStatus.DEPRECATED }) }),
    ).toThrow("Cant send a flow in 'DEPRECATED' state");
  });

  test("refuses to send a flow with no screens", () => {
    expect(() =>
      generateFlowMessageData({ to: "1", dbFlow: dbFlow({ json: { screens: [] } }) }),
    ).toThrow("Flow has no screens");
  });

  // NOTE: pins current behaviour. Meta treats flow_token as an opaque identifier it
  // echoes back on every endpoint request and on the final reply, and the session
  // lookup keys off it (handleDecryptedFlowRequest -> getSession(orgId, flow_token)).
  // Using the raw phone number makes it both guessable and a piece of PII that
  // travels through Meta. See issues.txt 11.9.
  test("uses the recipient's phone number as the flow token", () => {
    const message = generateFlowMessageData({ to: "15550001", dbFlow: dbFlow() });

    expect(params(message).flow_token).toBe("15550001");
  });

  // NOTE: pins current behaviour. The source comment "setting defaults for old
  // waFlow" says rows predating templateMessage exist, but the destructure on
  // line 44 happens before any guard, so such a row raises a TypeError rather
  // than picking up those defaults. See issues.txt 11.8.
  test("throws rather than defaulting when the flow has no template message at all", () => {
    expect(() =>
      generateFlowMessageData({ to: "1", dbFlow: dbFlow({ templateMessage: null }) }),
    ).toThrow(TypeError);
  });
});

describe("removeEmptyStrings", () => {
  test("drops empty strings", () => {
    const obj: any = { label: "Name", hint: "" };

    removeEmptyStrings(obj);

    expect(obj).toEqual({ label: "Name" });
  });

  test("reaches into nested objects", () => {
    const obj: any = { screen: { layout: { title: "", type: "SingleColumnLayout" } } };

    removeEmptyStrings(obj);

    expect(obj).toEqual({ screen: { layout: { type: "SingleColumnLayout" } } });
  });

  test("keeps a false `visible`, which is exempted by name", () => {
    const obj: any = { visible: false };

    removeEmptyStrings(obj);

    expect(obj).toEqual({ visible: false });
  });

  // NOTE: pins current behaviour. The guard is `obj[key] === "" || !obj[key]`, so
  // every falsy value goes — `required: false`, `markdown: false`, `min-chars: 0`.
  // Only `visible` is spared. This runs on the v2 flow json immediately before it
  // is uploaded to Meta, so those settings never reach WhatsApp. See issues.txt 11.5.
  test("drops false and zero along with the empty strings", () => {
    const obj: any = { required: false, markdown: false, "min-chars": 0, label: "Name" };

    removeEmptyStrings(obj);

    expect(obj).toEqual({ label: "Name" });
  });

  // NOTE: pins current behaviour. `delete` on an array index leaves a hole rather
  // than shortening the array, and JSON.stringify — which is exactly what
  // updateFlowJsonInWa does next — renders a hole as null. So Meta receives
  // ["a", null, "b"] for a list that had one blank entry. See issues.txt 11.5.
  test("punches a hole in an array rather than shortening it", () => {
    const obj: any = { list: ["a", "", "b"] };

    removeEmptyStrings(obj);

    expect(obj.list).toHaveLength(3);
    expect(JSON.parse(JSON.stringify(obj))).toEqual({ list: ["a", null, "b"] });
  });
});

describe("injectIdToFlowJson / removeIdFromFlowJson", () => {
  function json(): any {
    return {
      screens: [
        {
          id: "S1",
          layout: {
            children: [
              {
                type: "Form",
                children: [
                  { type: "TextInput", name: "q1" },
                  { type: "TextInput", name: "q2", id: "kept" },
                ],
              },
            ],
          },
        },
      ],
    };
  }

  function elements(j: any) {
    return j.screens[0].layout.children[0].children;
  }

  test("gives an id to every element that has none", () => {
    const result = injectIdToFlowJson(json());

    expect(elements(result)[0].id).toBe("abc123");
  });

  test("leaves an element that already has an id alone", () => {
    const result = injectIdToFlowJson(json());

    expect(elements(result)[1].id).toBe("kept");
    expect(randomIdMock).toHaveBeenCalledTimes(1);
  });

  test("strips every id again on the way back out", () => {
    const result = removeIdFromFlowJson(injectIdToFlowJson(json()));

    expect(elements(result)[0]).not.toHaveProperty("id");
    expect(elements(result)[1]).not.toHaveProperty("id");
  });

  // NOTE: pins current behaviour. Both work on the object they are handed rather
  // than a copy, so removeIdFromFlowJson inside updateFlowJsonInWa strips the ids
  // off whatever the caller still holds a reference to. See issues.txt 11.10.
  test("both rewrite the json they were handed, in place", () => {
    const original = json();

    const injected = injectIdToFlowJson(original);
    expect(injected).toBe(original);
    expect(elements(original)[0].id).toBe("abc123");

    removeIdFromFlowJson(original);
    expect(elements(original)[0]).not.toHaveProperty("id");
  });
});

describe("validateFlowLogic", () => {
  test("matches an exact equality", () => {
    expect(validateFlowLogic("yes", LogicCondition.Equals, "yes")).toBe(true);
    expect(validateFlowLogic("no", LogicCondition.Equals, "yes")).toBe(false);
  });

  test("matches an inequality", () => {
    expect(validateFlowLogic("no", LogicCondition.NotEquals, "yes")).toBe(true);
    expect(validateFlowLogic("yes", LogicCondition.NotEquals, "yes")).toBe(false);
  });

  test("compares by strict identity, so a number never equals its own text", () => {
    expect(validateFlowLogic(5, LogicCondition.Equals, "5")).toBe(false);
  });

  // NOTE: pins current behaviour. `case LogicCondition.IncludesAnyOf:` has an empty
  // body and falls straight through to `default: return false`, and there is no
  // case at all for IncludesNoneOf, IncludesAllOf or Submitted. Four of the six
  // conditions the UI offers therefore always evaluate false. Impact today is zero
  // because nothing calls this function — it is a trap for the next caller, the
  // same shape as issues.txt 4.1. See issues.txt 11.6.
  test.each([
    LogicCondition.IncludesAnyOf,
    LogicCondition.IncludesNoneOf,
    LogicCondition.IncludesAllOf,
    LogicCondition.Submitted,
  ])("always answers false for the %s condition", (condition) => {
    expect(validateFlowLogic("a", condition, "a")).toBe(false);
  });
});

describe("generateDataSourceFromQuestion", () => {
  test("offers five stars, most first, and maps each back to its score", () => {
    const { dataSource, mapData } = generateDataSourceFromQuestion({
      type: QuestionType.Rating,
    } as any);

    expect(dataSource[0]).toEqual({ id: "0", title: "⭐️⭐️⭐️⭐️⭐️" });
    expect(dataSource[4]).toEqual({ id: "4", title: "⭐️" });
    expect(mapData).toEqual({ 0: "5", 1: "4", 2: "3", 3: "2", 4: "1" });
  });

  test("offers the ten points of an opinion scale", () => {
    const { dataSource } = generateDataSourceFromQuestion({
      type: QuestionType.Opinion,
    } as any);

    expect(dataSource).toHaveLength(10);
    expect(dataSource[0]).toEqual({ id: "0", title: "1" });
  });

  test("takes a multiple-choice question's own options", () => {
    const { dataSource, mapData } = generateDataSourceFromQuestion({
      type: QuestionType.MCQ,
      choices: { en: [{ value: "Pizza" }, { value: "Pasta" }] },
    } as any);

    expect(dataSource).toEqual([
      { id: "0", title: "Pizza" },
      { id: "1", title: "Pasta" },
    ]);
    expect(mapData).toEqual({ 0: "Pizza", 1: "Pasta" });
  });

  test("offers nothing for a choice question that has no options yet", () => {
    const { dataSource } = generateDataSourceFromQuestion({
      type: QuestionType.MCQ,
      choices: {},
    } as any);

    expect(dataSource).toEqual([]);
  });

  test("offers nothing for a question type that has no options at all", () => {
    const { dataSource } = generateDataSourceFromQuestion({ type: QuestionType.Text } as any);

    expect(dataSource).toEqual([]);
  });
});

describe("questionTypeToFlowFormElementType", () => {
  test.each([
    [QuestionType.Text, WaFlowFormElementType.textInput],
    [QuestionType.Email, WaFlowFormElementType.textInput],
    [QuestionType.TextArea, WaFlowFormElementType.textArea],
    [QuestionType.Date, WaFlowFormElementType.datePicker],
    [QuestionType.DDSS, WaFlowFormElementType.dropDown],
    [QuestionType.MCQ, WaFlowFormElementType.radioButtonsGroup],
    [QuestionType.Rating, WaFlowFormElementType.radioButtonsGroup],
    [QuestionType.MSQ, WaFlowFormElementType.checkboxGroup],
    [QuestionType.PhotoPicker, WaFlowFormElementType.photoPicker],
  ])("renders a %s question as a %s", (questionType, elementType) => {
    expect(questionTypeToFlowFormElementType(questionType)).toBe(elementType);
  });

  test("refuses a question type that has no flow equivalent", () => {
    expect(() => questionTypeToFlowFormElementType(QuestionType.Testimonial)).toThrow(
      "Not implemented",
    );
  });
});

describe("parseFlowResponse", () => {
  const flowJson: any = {
    screens: [
      {
        layout: {
          children: [
            {
              type: "Form",
              children: [
                {
                  type: "RadioButtonsGroup",
                  name: "choice",
                  "data-source": [
                    { id: "0", title: "Pizza" },
                    { id: "1", title: "Pasta" },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  };

  function parse(
    type: QuestionType,
    response: WaFlowRawResponse,
    mapExtras: Record<string, string> = {},
  ) {
    return parseFlowResponse({
      elementName: "choice",
      flowMap: { choice: { questionId: "q1", type, ...mapExtras } },
      flowJson,
      response,
    });
  }

  test("wraps an email address", () => {
    expect(parse(QuestionType.Email, "ada@example.com")).toEqual({ email: "ada@example.com" });
  });

  test("wraps a phone number", () => {
    expect(parse(QuestionType.Phone, "15550001")).toEqual({ phone: "15550001" });
  });

  test("returns free text as it stands", () => {
    expect(parse(QuestionType.Text, "hello")).toBe("hello");
  });

  test("reads a date back from the epoch milliseconds Meta sends", () => {
    expect(parse(QuestionType.Date, "1700000000000")).toEqual(new Date(1_700_000_000_000));
  });

  test("looks a rating answer up in the flow map", () => {
    expect(parse(QuestionType.Rating, 0, { 0: "5" })).toBe("5");
  });

  test("resolves a single choice to its title", () => {
    expect(parse(QuestionType.MCQ, "1")).toEqual({ value: "Pasta" });
  });

  test("resolves every selected choice for a multi-select", () => {
    expect(parse(QuestionType.MSQ, ["0", "1"])).toEqual([{ value: "Pizza" }, { value: "Pasta" }]);
  });

  test("reports nothing for a choice id the flow does not offer", () => {
    expect(parse(QuestionType.MCQ, "99")).toBeUndefined();
  });

  // NOTE: pins current behaviour. An unmapped question type falls through to the
  // default branch, which logs an error and hands the raw Meta payload straight
  // into the stored response. See issues.txt 11.11.
  test("stores the raw payload for a question type it does not know", () => {
    expect(parse(QuestionType.Contact, ["some", "shape"])).toEqual(["some", "shape"]);
  });
});

describe("parseFlowResponseV2", () => {
  const dataSource = [
    { id: "0", title: "Pizza" },
    { id: "1", title: "Pasta" },
  ];

  test("returns free text as it stands", () => {
    // Text/date types never touch dataSource — undefined is a valid real input here.
    expect(
      parseFlowResponseV2(
        WaQuestions.TextInput,
        "hello",
        undefined as unknown as typeof dataSource,
      ),
    ).toBe("hello");
  });

  test("reads a date back from epoch milliseconds", () => {
    expect(
      parseFlowResponseV2(
        WaQuestions.DatePicker,
        "1700000000000",
        undefined as unknown as typeof dataSource,
      ),
    ).toEqual(new Date(1_700_000_000_000));
  });

  test("resolves a radio answer to its title", () => {
    expect(parseFlowResponseV2(WaQuestions.RadioButtonsGroup, "1", dataSource)).toBe("Pasta");
  });

  test("resolves every ticked box for a checkbox group", () => {
    expect(parseFlowResponseV2(WaQuestions.CheckboxGroup, ["0", "1"], dataSource)).toEqual([
      "Pizza",
      "Pasta",
    ]);
  });

  test("reports nothing for a choice id the flow does not offer", () => {
    expect(parseFlowResponseV2(WaQuestions.Dropdown, "99", dataSource)).toBeUndefined();
  });

  // NOTE: pins current behaviour. A choice question whose element carries no
  // data-source — which is what removeEmptyStrings can leave behind, and what an
  // element built without options looks like — throws instead of reporting the
  // answer it could not resolve. See issues.txt 11.11.
  test("throws when the element it is resolving against has no options", () => {
    expect(() =>
      parseFlowResponseV2(WaQuestions.Dropdown, "0", undefined as unknown as typeof dataSource),
    ).toThrow(TypeError);
  });
});

describe("findElementNameFromPayloadName", () => {
  const flowJson: any = {
    screens: [
      {
        layout: {
          children: [
            {
              type: "Form",
              children: [
                { type: "TextInput", name: "element_a" },
                {
                  type: "Footer",
                  name: "footer",
                  "on-click-action": {
                    payload: { payload_a: "${form.element_a}", flow_token: "abc" },
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

  test("resolves the payload name back to the form element it came from", () => {
    expect(findElementNameFromPayloadName("payload_a", flowJson)).toBe("element_a");
  });

  test("reports nothing for a payload name the footer does not carry", () => {
    expect(findElementNameFromPayloadName("payload_z", flowJson)).toBeUndefined();
  });

  test("reports nothing for a payload value that is not a form reference", () => {
    expect(findElementNameFromPayloadName("flow_token", flowJson)).toBeUndefined();
  });
});

describe("waFlowFormElementIterator", () => {
  const flowJson: any = {
    screens: [
      {
        layout: {
          children: [
            { type: "TextHeading", text: "Not in a form" },
            {
              type: "Form",
              children: [
                { type: "TextBody", text: "no name" },
                { type: "TextInput", name: "q1" },
                { type: "Footer", name: "footer" },
              ],
            },
          ],
        },
      },
    ],
  };

  test("yields only the named elements by default", () => {
    const names = [...waFlowFormElementIterator({ flowJson })].map((e) => e.name);

    expect(names).toEqual(["q1", "footer"]);
  });

  test("yields the unnamed decoration too when asked for everything", () => {
    const types = [...waFlowFormElementIterator({ flowJson, onlyInteractive: false })].map(
      (e) => e.type,
    );

    expect(types).toEqual(["TextBody", "TextInput", "Footer"]);
  });

  test("leaves the footer out when told to", () => {
    const names = [...waFlowFormElementIterator({ flowJson, includeFooter: false })].map(
      (e) => e.name,
    );

    expect(names).toEqual(["q1"]);
  });

  test("never yields anything sitting outside a form", () => {
    const types = [...waFlowFormElementIterator({ flowJson, onlyInteractive: false })].map(
      (e) => e.type,
    );

    expect(types).not.toContain("TextHeading");
  });
});

describe("the flow map, read in both directions", () => {
  // Real flow-map entries always carry the question type alongside its id.
  const map: WaFlowMap = {
    element_a: { questionId: "q-1", type: QuestionType.Text },
    element_b: { questionId: "q-2", type: QuestionType.Text },
  };

  test("finds the question behind an element", () => {
    expect(getQuestionIdFromFlowFormElementName("element_b", map)).toBe("q-2");
  });

  test("finds the element in front of a question", () => {
    expect(getFlowFormElementNameFromQuestionId("q-2", map)).toBe("element_b");
  });

  test("reports nothing for an element the map does not know", () => {
    expect(getQuestionIdFromFlowFormElementName("element_z", map)).toBeUndefined();
  });

  test("reports nothing for a question the map does not know", () => {
    expect(getFlowFormElementNameFromQuestionId("q-99", map)).toBeUndefined();
  });
});

describe("sanitizeScreenData", () => {
  function screens(): any {
    return {
      screens: [
        {
          layout: {
            children: [
              { type: "TextInput", id: "internal-1", metaType: "TextInput", name: "q1" },
              { type: "TextBody", enableNpsAnalytics: true, googleReview: true, text: "hi" },
              { type: "EmbeddedLink", text: "Visit", url: "https://example.com" },
            ],
          },
        },
      ],
    };
  }

  test("strips the bookkeeping fields Meta has no use for", () => {
    const result = sanitizeScreenData(screens());
    const [input, body] = result.screens[0].layout.children;

    expect(input).toEqual({ type: "TextInput", name: "q1" });
    expect(body).toEqual({ type: "TextBody", text: "hi" });
  });

  test("turns a plain url into the click action Meta expects", () => {
    const result = sanitizeScreenData(screens());
    const link = result.screens[0].layout.children[2];

    expect(link).toEqual({
      type: "EmbeddedLink",
      text: "Visit",
      "on-click-action": { name: "open_url", url: "https://example.com" },
    });
  });

  // NOTE: pins current behaviour. It walks only screen.layout.children, so anything
  // nested inside a Form keeps its internal ids and metaType when uploaded to Meta.
  // v2 flows put elements directly under layout.children so this is fine today, but
  // it is silently wrong for the v1 shape. See issues.txt 11.12.
  test("does not reach elements nested inside a form", () => {
    const data: any = {
      screens: [
        {
          layout: {
            children: [
              { type: "Form", children: [{ type: "TextInput", id: "internal-1", name: "q1" }] },
            ],
          },
        },
      ],
    };

    sanitizeScreenData(data);

    expect(data.screens[0].layout.children[0].children[0].id).toBe("internal-1");
  });
});

/** A minimal v2 flow json with one screen holding the given layout children. */
function flowJsonWith(children: WaFlowForm[]): WaFlowJson {
  return {
    version: "7.2",
    screens: [
      {
        id: "SCREEN_ONE",
        title: "Screen one",
        data: {},
        layout: { type: WaFlowLayoutType.scl, children },
      },
    ],
  };
}

describe("convertHeaderToNewQuestion", () => {
  test("lifts an element's header out into a text block above it", () => {
    const result = convertHeaderToNewQuestion(
      flowJsonWith([{ type: "TextInput", name: "q1", header: "Your name" }]),
    );

    expect(result.screens[0].layout.children).toEqual([
      { text: "Your name", type: "TextBody", markdown: true },
      { type: "TextInput", name: "q1" },
    ]);
  });

  test("leaves an element with no header untouched", () => {
    const result = convertHeaderToNewQuestion(flowJsonWith([{ type: "TextInput", name: "q1" }]));

    expect(result.screens[0].layout.children).toEqual([{ type: "TextInput", name: "q1" }]);
  });

  test("works on a copy, leaving the stored flow as it was", () => {
    const original: any = {
      screens: [{ layout: { children: [{ type: "TextInput", name: "q1", header: "Your name" }] } }],
    };

    convertHeaderToNewQuestion(original);

    expect(original.screens[0].layout.children[0].header).toBe("Your name");
  });
});

describe("verifyFlowSubscriptionLimit", () => {
  function request(features: unknown = { whatsapp: { count: { max: 3 } } }): any {
    return { user: { orgId: "org-1" }, subscription: { features } };
  }

  function reply() {
    const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
    return rep;
  }

  test("lets an org under its flow limit through", async () => {
    flowCountMock.mockResolvedValue(2);
    const rep = reply();

    await verifyFlowSubscriptionLimit(request(), rep);

    expect(rep.code).not.toHaveBeenCalled();
  });

  test("counts only the caller's own flows", async () => {
    await verifyFlowSubscriptionLimit(request(), reply());

    expect(flowCountMock.mock.calls[0][0]).toEqual({ where: { orgId: "org-1" } });
  });

  test("refuses an org that has reached its limit, naming the limit", async () => {
    flowCountMock.mockResolvedValue(3);
    const rep = reply();

    await verifyFlowSubscriptionLimit(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send.mock.calls[0][0].message).toBe(
      "You have reached the maximum limit of 3 Flows.",
    );
  });

  test("refuses an org with no subscription at all", async () => {
    const rep = reply();

    await verifyFlowSubscriptionLimit({ user: { orgId: "org-1" }, subscription: null } as any, rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send.mock.calls[0][0].message).toBe("Subscription not found");
  });

  // NOTE: pins current behaviour. `flowCount >= whatsappFlowFeatures?.count?.max`
  // compares against undefined when the plan states no maximum, which is always
  // false. Same shape as issues.txt 2.2. See issues.txt 11.7.
  test("enforces no limit when the plan does not state one", async () => {
    flowCountMock.mockResolvedValue(9999);
    const rep = reply();

    await verifyFlowSubscriptionLimit(request({ whatsapp: { active: true } }), rep);

    expect(rep.code).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. The try wraps the count query too, so a database
  // failure is reported to the user as a 403 carrying the raw error text, with
  // displayMessageInClient set. See issues.txt 11.7.
  test("reports a database failure to the user as a refusal", async () => {
    flowCountMock.mockRejectedValue(new Error("connection terminated unexpectedly"));
    const rep = reply();

    await verifyFlowSubscriptionLimit(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send.mock.calls[0][0]).toEqual({
      message: "connection terminated unexpectedly",
      displayMessageInClient: true,
    });
  });
});
