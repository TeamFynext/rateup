import { describe, expect, test } from "vite-plus/test";

import { limitProblems, sentLength } from "./chatbotLimits.js";

const graph = (...nodes: Array<{ type: string; data: Record<string, unknown> }>) => ({
  nodes: nodes.map((node, i) => ({ id: `n${i}`, ...node })),
});
const text = (length: number) => "a".repeat(length);
const richText = (value: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
});

describe("sentLength", () => {
  test("counts a plain string as typed", () => {
    expect(sentLength("hello")).toBe(5);
  });

  test("counts rich text as the text it sends, objects and JSON strings alike", () => {
    expect(sentLength(richText("hello"))).toBe(5);
    expect(sentLength(JSON.stringify(richText("hello")))).toBe(5);
  });

  test("counts nothing as nothing", () => {
    expect(sentLength(undefined)).toBe(0);
    expect(sentLength(null)).toBe(0);
  });
});

describe("limitProblems", () => {
  test("a text fits WhatsApp's 4096 but not Instagram's 1000 or Messenger's 2000", () => {
    const bot = graph({ type: "textNode", data: { label: "Hello", body: text(1500) } });
    expect(limitProblems(bot, "WHATSAPP")).toEqual([]);
    expect(limitProblems(bot, "INSTAGRAM")).toEqual([
      { nodeId: "n0", label: "Hello", message: "Message text is over 1000 characters" },
    ]);
    expect(limitProblems(bot, "FACEBOOK")).toEqual([]);
    expect(
      limitProblems(graph({ type: "textNode", data: { body: text(2001) } }), "FACEBOOK"),
    ).toHaveLength(1);
  });

  test("rich text is measured as sent", () => {
    const bot = graph({ type: "textNode", data: { label: "Hi", body: richText(text(1001)) } });
    expect(limitProblems(bot, "INSTAGRAM")).toHaveLength(1);
  });

  test("captions and questions follow the channel too", () => {
    expect(
      limitProblems(graph({ type: "imageNode", data: { caption: text(1025) } }), "WHATSAPP"),
    ).toMatchObject([{ message: "Caption is over 1024 characters" }]);
    expect(
      limitProblems(graph({ type: "textInputNode", data: { question: text(1001) } }), "INSTAGRAM"),
    ).toMatchObject([{ message: "Question is over 1000 characters" }]);
  });

  test("quick replies: at most 13, each up to 20 characters", () => {
    const replies = (n: number, title = "Yes") => Array.from({ length: n }, () => ({ title }));
    const qr = (quick_replies: unknown) =>
      graph({ type: "instagramQuickReplyNode", data: { text: "Pick", quick_replies } });
    expect(limitProblems(qr(replies(13)), "INSTAGRAM")).toEqual([]);
    expect(limitProblems(qr(replies(14)), "INSTAGRAM")).toMatchObject([
      { message: "More than 13 quick replies" },
    ]);
    expect(limitProblems(qr(replies(1, text(21))), "FACEBOOK")).toMatchObject([
      { message: "A quick reply is over 20 characters" },
    ]);
  });

  test("cards: at most 10, 3 buttons each, with title limits", () => {
    const cards = (elements: unknown) =>
      graph({ type: "instagramGenericTemplateNode", data: { elements } });
    const card = { title: "Tee", buttons: [{ title: "Buy" }] };
    expect(limitProblems(cards([card]), "INSTAGRAM")).toEqual([]);
    expect(limitProblems(cards(Array(11).fill(card)), "INSTAGRAM")).toMatchObject([
      { message: "More than 10 cards" },
    ]);
    expect(limitProblems(cards([{ ...card, title: text(81) }]), "FACEBOOK")).toMatchObject([
      { message: "A card title is over 80 characters" },
    ]);
    expect(
      limitProblems(
        cards([{ title: "Tee", buttons: Array(4).fill({ title: "Buy" }) }]),
        "FACEBOOK",
      ),
    ).toMatchObject([{ message: "More than 3 buttons on a card" }]);
  });

  test("names the block by its label, or its type", () => {
    expect(
      limitProblems(graph({ type: "textNode", data: { body: text(1001) } }), "INSTAGRAM"),
    ).toMatchObject([{ label: "textNode" }]);
  });

  test("leaves other blocks and missing graphs alone", () => {
    expect(limitProblems(graph({ type: "assignNode", data: {} }), "INSTAGRAM")).toEqual([]);
    expect(limitProblems(undefined, "INSTAGRAM")).toEqual([]);
  });
});
