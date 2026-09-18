import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyEventTrigger: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    loyaltyWaCommand: { findFirst: vi.fn() },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../../generated/prisma/client.js", () => ({
  TemplateType: { LOYALTY: "LOYALTY" },
}));
vi.mock("../../whatsapp/messageTemplates/wa_templates.service.js", () => ({
  createTemplate: vi.fn(),
  editTemplate: vi.fn(),
  fetchTemplate: vi.fn(),
  getTemplateByNameAndOrgId: vi.fn(),
  saveTemplate: vi.fn(),
  updateTemplateInDb: vi.fn(),
}));
// The tiers step's re-placement pulls in the WhatsApp dispatcher; nothing here needs it.
vi.mock("../tiers/tierReevaluation.service.js", () => ({ reevaluateProgramTiers: vi.fn() }));
// The wizard's helpers are real; only the trigger upsert is watched.
vi.mock("../onboarding/onboarding.service.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../onboarding/onboarding.service.js")>()),
  upsertTrigger: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  createTemplate,
  editTemplate,
  fetchTemplate,
  getTemplateByNameAndOrgId,
  saveTemplate,
  updateTemplateInDb,
} from "../../whatsapp/messageTemplates/wa_templates.service.js";
import { upsertTrigger } from "../onboarding/onboarding.service.js";
import { saveEventMessage } from "./eventMessage.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  loyaltyEventTrigger: Record<string, Mock>;
  loyaltyWaCommand: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";
const EVENT = LoyaltyEventType.POINTS_ISSUED;
const OLD = "Hi {{1}}, you earned {{2}} points.";
const NEW = "Hey {{1}} — {{2}} points just landed. Balance {{3}}.";

function waTemplate(over: Record<string, unknown> = {}, data: Record<string, unknown> = {}) {
  return {
    id: "tmpl-1",
    whatsappSettingsPhoneId: "phone-1",
    data: {
      id: "meta-1",
      name: "loyalty_points_issued",
      status: "APPROVED",
      category: "UTILITY",
      components: [{ type: "BODY", text: OLD }],
      ...data,
    },
    ...over,
  };
}

const save = (body: string, enabled?: boolean) =>
  saveEventMessage({ orgId: ORG, programId: PROGRAM, eventType: EVENT, body, enabled });

beforeEach(() => {
  vi.clearAllMocks();
  db.loyaltyEventTrigger.findFirst.mockResolvedValue(null);
  db.loyaltyEventTrigger.updateMany.mockResolvedValue({ count: 1 });
  (getTemplateByNameAndOrgId as Mock).mockResolvedValue(null);
  (createTemplate as Mock).mockImplementation(async (_org: string, template: WaMetaTemplate) => ({
    ...template,
    id: "meta-new",
    status: "PENDING",
  }));
  (saveTemplate as Mock).mockResolvedValue({ id: "tmpl-new" });
  (updateTemplateInDb as Mock).mockResolvedValue({});
  (editTemplate as Mock).mockResolvedValue(true);
  (fetchTemplate as Mock).mockResolvedValue(undefined);
});

describe("saveEventMessage — nothing to change", () => {
  test("the same words only re-point the event at its template", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplate: waTemplate() });

    const result = await save(`  ${OLD}  `);

    expect(createTemplate).not.toHaveBeenCalled();
    expect(editTemplate).not.toHaveBeenCalled();
    expect(upsertTrigger).toHaveBeenCalledWith(PROGRAM, EVENT, "tmpl-1");
    expect(result).toMatchObject({ status: "approved", templateId: "tmpl-1", reused: true });
  });

  test("an event with no template adopts a same-text template of the base name", async () => {
    (getTemplateByNameAndOrgId as Mock).mockResolvedValue(waTemplate({}, { status: "PENDING" }));

    const result = await save(OLD);

    expect(createTemplate).not.toHaveBeenCalled();
    expect(upsertTrigger).toHaveBeenCalledWith(PROGRAM, EVENT, "tmpl-1");
    expect(result).toMatchObject({ status: "pending", reused: true });
  });

  test("the enabled flag is applied when given", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplate: waTemplate() });

    await save(OLD, false);

    expect(db.loyaltyEventTrigger.updateMany).toHaveBeenCalledWith({
      where: { programId: PROGRAM, eventType: EVENT },
      data: { enabled: false },
    });
  });
});

describe("saveEventMessage — a first template", () => {
  test("submits a body-only UTILITY template under the event's name and wires it", async () => {
    const result = await save(NEW);

    const [org, template] = (createTemplate as Mock).mock.calls[0];
    expect(org).toBe(ORG);
    expect(template).toMatchObject({
      name: "loyalty_points_issued",
      category: "UTILITY",
      language: "en",
      components: [expect.objectContaining({ type: "BODY", text: NEW })],
    });
    expect(template.components[0].example.body_text[0]).toHaveLength(3);
    expect(saveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "meta-new" }),
      ORG,
      {},
      "LOYALTY",
      undefined,
      undefined,
    );
    expect(upsertTrigger).toHaveBeenCalledWith(PROGRAM, EVENT, "tmpl-new");
    expect(result).toEqual({
      eventType: EVENT,
      templateName: "loyalty_points_issued",
      status: "pending",
      templateId: "tmpl-new",
      versioned: false,
    });
  });

  test("skips names other templates already hold", async () => {
    (getTemplateByNameAndOrgId as Mock).mockImplementation(async (name: string) =>
      name === "loyalty_points_issued" || name === "loyalty_points_issued_v2"
        ? waTemplate({ id: `other-${name}` })
        : null,
    );

    const result = await save(NEW);

    expect((createTemplate as Mock).mock.calls[0][1].name).toBe("loyalty_points_issued_v3");
    expect(result.templateName).toBe("loyalty_points_issued_v3");
  });
});

describe("saveEventMessage — changing an existing template", () => {
  test("a draft is submitted on its own row", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({
      waTemplate: waTemplate({}, { status: "DRAFT", id: undefined }),
    });
    (getTemplateByNameAndOrgId as Mock).mockResolvedValue(waTemplate());

    const result = await save(NEW);

    expect(createTemplate).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ name: "loyalty_points_issued" }),
      "phone-1",
    );
    expect(updateTemplateInDb).toHaveBeenCalledWith(
      "tmpl-1",
      ORG,
      expect.objectContaining({ id: "meta-new", status: "PENDING" }),
      undefined,
      "LOYALTY",
      undefined,
      "phone-1",
    );
    expect(saveTemplate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "pending", templateId: "tmpl-1" });
  });

  test("an approved template is edited in place and goes back into review", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplate: waTemplate() });
    (fetchTemplate as Mock).mockResolvedValue({
      id: "meta-1",
      name: "loyalty_points_issued",
      status: "PENDING",
      components: [{ type: "BODY", text: NEW }],
    });

    const result = await save(NEW);

    expect(editTemplate).toHaveBeenCalledWith(
      ORG,
      "meta-1",
      [expect.objectContaining({ type: "BODY", text: NEW })],
      "UTILITY",
      "phone-1",
    );
    expect(updateTemplateInDb).toHaveBeenCalledWith(
      "tmpl-1",
      ORG,
      expect.objectContaining({ status: "PENDING" }),
      undefined,
      "LOYALTY",
      undefined,
      "phone-1",
    );
    expect(createTemplate).not.toHaveBeenCalled();
    expect(result).toEqual({
      eventType: EVENT,
      templateName: "loyalty_points_issued",
      status: "pending",
      templateId: "tmpl-1",
      edited: true,
    });
  });

  test("when Meta's read-back fails the new words are still stored locally", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplate: waTemplate() });

    await save(NEW);

    const stored = (updateTemplateInDb as Mock).mock.calls[0][2];
    expect(stored.components[0].text).toBe(NEW);
    expect(stored.status).toBe("PENDING");
    expect(stored.id).toBe("meta-1");
  });

  test("a template still in review becomes the next version", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({
      waTemplate: waTemplate({}, { status: "PENDING" }),
    });
    (getTemplateByNameAndOrgId as Mock).mockImplementation(async (name: string) =>
      name === "loyalty_points_issued" ? waTemplate() : null,
    );

    const result = await save(NEW);

    expect(editTemplate).not.toHaveBeenCalled();
    expect((createTemplate as Mock).mock.calls[0][1].name).toBe("loyalty_points_issued_v2");
    expect(upsertTrigger).toHaveBeenCalledWith(PROGRAM, EVENT, "tmpl-new");
    expect(result).toEqual({
      eventType: EVENT,
      templateName: "loyalty_points_issued_v2",
      status: "pending",
      templateId: "tmpl-new",
      versioned: true,
    });
  });

  test("an edit Meta refuses falls back to a new version", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplate: waTemplate() });
    (editTemplate as Mock).mockResolvedValue(false);
    (getTemplateByNameAndOrgId as Mock).mockImplementation(async (name: string) =>
      name === "loyalty_points_issued" ? waTemplate() : null,
    );

    const result = await save(NEW);

    expect(createTemplate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ templateName: "loyalty_points_issued_v2", versioned: true });
  });
});

describe("saveEventMessage — the new-customer welcome", () => {
  const welcome = (body: string) =>
    saveEventMessage({
      orgId: ORG,
      programId: PROGRAM,
      eventType: LoyaltyEventType.NEW_CUSTOMER_WELCOME,
      body,
    });

  test("carries a Join quick reply labelled with the org's join keyword", async () => {
    db.loyaltyWaCommand.findFirst.mockResolvedValue({ requestMessage: "member" });

    await welcome("Hi {{1}}, tap below to join our loyalty program.");

    const [, template] = (createTemplate as Mock).mock.calls[0];
    expect(template.name).toBe("loyalty_new_customer_welcome");
    expect(template.components).toContainEqual({
      type: "BUTTONS",
      buttons: [{ type: "QUICK_REPLY", text: "Member" }],
    });
  });

  test("falls back to Join when the org has no join keyword", async () => {
    db.loyaltyWaCommand.findFirst.mockResolvedValue(null);

    await welcome("Hi {{1}}, tap below to join our loyalty program.");

    const [, template] = (createTemplate as Mock).mock.calls[0];
    expect(template.components.at(-1)).toEqual({
      type: "BUTTONS",
      buttons: [{ type: "QUICK_REPLY", text: "Join" }],
    });
  });

  test("an in-place edit keeps the button", async () => {
    db.loyaltyEventTrigger.findFirst.mockResolvedValue({ waTemplate: waTemplate() });
    db.loyaltyWaCommand.findFirst.mockResolvedValue({ requestMessage: "join" });

    await welcome("Hello {{1}}, want points on every visit? Tap Join.");

    const [, , components] = (editTemplate as Mock).mock.calls[0];
    expect(components).toContainEqual({
      type: "BUTTONS",
      buttons: [{ type: "QUICK_REPLY", text: "Join" }],
    });
  });
});
