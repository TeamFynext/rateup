import { describe, expect, test } from "vitest";

import { TemplateType, WaTemplateStatus } from "@/types/enums.ts";
import { WHATSAPP_BUTTON_TYPE, WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";

import { templateSchema } from "./templateSchema.ts";

const file = (type: string, name = "card.png") => new File(["x"], name, { type });

const card = (header: File | string | null, format = WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE) => ({
  body: "hey",
  header,
  format,
  example: [],
  buttons: [
    {
      type: WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER,
      text: "call us",
      phone_number: "+919666555555",
    },
  ],
});

const carousel = (cards: ReturnType<typeof card>[]) => ({
  name: "heyyy",
  body: "Would you like to start survey?",
  footer: "",
  language: "en",
  header: null,
  format: WHATSAPP_TEMPLATE_BROADCAST_TYPE.NONE,
  category: "MARKETING",
  buttons: [],
  status: WaTemplateStatus.DRAFT,
  example: [],
  templateType: TemplateType.CAROUSEL,
  mediaCarousel: cards,
  productCarousel: [],
});

const issuesOf = (input: unknown) => {
  const result = templateSchema.safeParse(input);
  return result.success ? [] : result.error.issues;
};

const messages = (input: unknown) => issuesOf(input).map((i) => i.message);

describe("templateSchema media carousel", () => {
  test("accepts freshly uploaded PNG cards", () => {
    expect(messages(carousel([card(file("image/png")), card(file("image/png"))]))).toEqual([]);
  });

  test("accepts uploaded MP4 cards", () => {
    const video = WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO;
    expect(
      messages(carousel([card(file("video/mp4"), video), card(file("video/mp4"), video)])),
    ).toEqual([]);
  });

  test("rejects an image card whose file is not an image", () => {
    expect(messages(carousel([card(file("video/mp4")), card(file("image/png"))]))).toEqual([
      "Incorrect Type use only image/png,image/jpg,image/jpeg",
    ]);
  });

  test("names the file type when a card image is not an accepted format", () => {
    const issues = issuesOf(carousel([card(file("image/avif")), card(file("image/png"))]));
    expect(issues[0]).toMatchObject({
      path: ["mediaCarousel", 0, "header"],
      message:
        "File must be one of [image/png, image/jpg, image/jpeg, video/mp4] but was image/avif",
    });
  });

  test("names the file type when the template header is not an accepted format", () => {
    const issues = issuesOf({
      ...carousel([]),
      templateType: TemplateType.GENERAL_NOTIFICATION,
      format: WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE,
      header: file("image/avif"),
    });
    expect(issues[0]?.path).toEqual(["header"]);
    expect(issues[0]?.message).toMatch(/^File must be one of \[.*\] but was image\/avif$/);
  });

  test("rejects a video card whose file is not a video", () => {
    const video = WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO;
    expect(
      messages(carousel([card(file("image/png"), video), card(file("video/mp4"), video)])),
    ).toEqual(["Incorrect Type use only video/mp4"]);
  });
});
