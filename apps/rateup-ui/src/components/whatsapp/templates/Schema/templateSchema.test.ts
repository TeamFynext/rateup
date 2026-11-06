import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, test } from "vite-plus/test";

import { TemplateType, WaTemplateStatus } from "@/types/enums.ts";
import { WHATSAPP_BUTTON_TYPE, WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";

import { firstErrorMessage, friendlyWhatsAppError } from "../Details/template-form.ts";
import { templateSchema } from "./templateSchema.ts";

const { IMAGE, VIDEO, NONE } = WHATSAPP_TEMPLATE_BROADCAST_TYPE;

const file = (type: string, name = "card.png") => new File(["x"], name, { type });

const callButton = {
  type: WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER,
  text: "call us",
  phone_number: "+919666555555",
};

type Card = {
  body: string;
  header: File | string | null;
  format: string;
  example: string[];
  buttons: Record<string, string>[];
};

const card = (header: File | string | null, format = IMAGE, extra: Partial<Card> = {}): Card => ({
  body: "hey",
  header,
  format,
  example: [],
  buttons: [callButton],
  ...extra,
});

const carousel = (cards: Card[]) => ({
  name: "heyyy",
  body: "Would you like to start survey?",
  footer: "",
  language: "en",
  header: null,
  format: NONE,
  category: "MARKETING",
  buttons: [],
  status: WaTemplateStatus.DRAFT,
  example: [],
  templateType: TemplateType.CAROUSEL,
  mediaCarousel: cards,
  productCarousel: [],
});

/** The toast text the editor shows on save: same resolver, same error walk. */
const toastFor = async (values: unknown) => {
  const resolver = zodResolver(templateSchema);
  const result = await resolver(values as never, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
  });
  return firstErrorMessage(result.errors);
};

const png = () => file("image/png");

describe("template editor save message", () => {
  test("freshly uploaded PNG cards save", async () => {
    expect(await toastFor(carousel([card(png()), card(png())]))).toBeUndefined();
  });

  test("uploaded MP4 cards save", async () => {
    const mp4 = () => file("video/mp4", "clip.mp4");
    expect(await toastFor(carousel([card(mp4(), VIDEO), card(mp4(), VIDEO)]))).toBeUndefined();
  });

  test("a card with no button names the card", async () => {
    expect(await toastFor(carousel([card(png()), card(png(), IMAGE, { buttons: [] })]))).toBe(
      "Card 2: Each card needs at least 1 button",
    );
  });

  test("a card with three buttons names the card", async () => {
    const buttons = [callButton, callButton, callButton];
    expect(await toastFor(carousel([card(png(), IMAGE, { buttons }), card(png())]))).toBe(
      "Card 1: Each card can have at most 2 buttons",
    );
  });

  test("an empty card body names the card", async () => {
    expect(await toastFor(carousel([card(png()), card(png(), IMAGE, { body: "" })]))).toBe(
      "Card 2: Card body is required",
    );
  });

  test("a card button with no text names the card", async () => {
    const buttons = [{ ...callButton, text: "  " }];
    expect(await toastFor(carousel([card(png()), card(png(), IMAGE, { buttons })]))).toBe(
      "Card 2: Enter the button text",
    );
  });

  test("a bad phone number names the card", async () => {
    const buttons = [{ ...callButton, phone_number: "+91123" }];
    expect(await toastFor(carousel([card(png(), IMAGE, { buttons }), card(png())]))).toBe(
      "Card 1: Enter a valid phone number with country code",
    );
  });

  test("an unsupported card image says which format", async () => {
    const avif = file("image/avif", "car.avif");
    expect(await toastFor(carousel([card(avif), card(png())]))).toBe(
      "Card 1: AVIF files aren't supported. Use a PNG or JPG image, or an MP4 video.",
    );
  });

  test("an MP4 on an image card asks for an image", async () => {
    expect(await toastFor(carousel([card(png()), card(file("video/mp4"))]))).toBe(
      "Card 2: This card is set to Image, so choose a PNG or JPG file.",
    );
  });

  test("a PNG on a video card asks for a video", async () => {
    const mp4 = file("video/mp4", "clip.mp4");
    expect(await toastFor(carousel([card(png(), VIDEO), card(mp4, VIDEO)]))).toBe(
      "Card 1: This card is set to Video, so choose an MP4 file.",
    );
  });

  test("a single card asks for a second one", async () => {
    expect(await toastFor(carousel([card(png())]))).toBe("Add at least 2 cards to the carousel.");
  });

  test("an unsupported template header image says which format, without a card number", async () => {
    expect(
      await toastFor({
        ...carousel([]),
        templateType: TemplateType.GENERAL_NOTIFICATION,
        format: IMAGE,
        header: file("image/avif", "banner.avif"),
      }),
    ).toBe("AVIF files aren't supported. Use a PNG or JPG image, an MP4 video or a PDF.");
  });
});

describe("WhatsApp rejection messages", () => {
  test("a missing button text is reworded", () => {
    expect(friendlyWhatsAppError("Button at index 0 is missing expected field(s) (text)")).toBe(
      "Button 1 has no text. Fill it in and save again.",
    );
  });

  test("other messages pass through", () => {
    expect(friendlyWhatsAppError("Template name already exists")).toBe(
      "Template name already exists",
    );
  });
});
