import { describe, expect, test } from "vitest";

import { sanitizeSurveyQuestions, sanitizeSurveyThemeJson } from "./richText.js";

const XSS = '<p>Hi<img src=x onerror="alert(1)"></p>';
const CLEAN = '<p>Hi<img src="x"></p>';

describe("sanitizeSurveyQuestions", () => {
  test("web: every language of a question title is sanitised", () => {
    const [q] = sanitizeSurveyQuestions(
      [{ id: "1", type: "Text", title: { English: XSS, Arabic: "<b>مرحبا</b>" } }],
      "web",
    );
    expect(q.title).toEqual({ English: CLEAN, Arabic: "<b>مرحبا</b>" });
  });

  test("web: page titleText / subtitleText are sanitised", () => {
    const [q] = sanitizeSurveyQuestions(
      [
        {
          id: "w",
          type: "ThankYou",
          title: { English: "ThankYou Page" },
          titleText: "<h3>Thanks</h3><script>x()</script>",
          subtitleText: '<p onclick="x()">bye</p>',
          startButtonText: "Start <b>",
        },
      ],
      "web",
    );
    expect(q.titleText).toBe("<h3>Thanks</h3>");
    expect(q.subtitleText).toBe("<p>bye</p>");
    // Button text is plain text and not a rich-text field.
    expect(q.startButtonText).toBe("Start <b>");
  });

  test("plain-text fields are not touched", () => {
    const question = {
      id: "1",
      type: "Multiple Choice",
      title: { English: "Pick one" },
      description: { English: "Tom & <Jerry>" },
      label: { English: "<i>label</i>" },
      choices: { English: [{ value: "<b>A</b>" }] },
    };
    const [q] = sanitizeSurveyQuestions([question], "web");
    expect(q).toEqual(question);
  });

  test("a Custom HTML page keeps its title (rendered through DOMPurify's wider profile)", () => {
    const custom = {
      id: "c",
      type: "Custom",
      title: { English: "<table><tr><td>x</td></tr></table>" },
    };
    expect(sanitizeSurveyQuestions([custom], "web")[0]).toBe(custom);
  });

  test("whatsapp / waFlow: titles are plain text and only tag openers are neutralised", () => {
    for (const type of ["whatsapp", "waFlow"]) {
      const [a, b] = sanitizeSurveyQuestions(
        [
          { id: "a", type: "Rating", title: { en: "Rate us <3 & more" } },
          { id: "b", type: "Rating", title: { en: XSS } },
        ],
        type,
      );
      expect(a.title.en).toBe("Rate us <3 & more");
      expect(b.title.en).toBe('&lt;p>Hi&lt;img src=x onerror="alert(1)">&lt;/p>');
    }
  });

  test("an unknown or missing survey type gets the strict web rule", () => {
    expect(sanitizeSurveyQuestions([{ title: { en: XSS } }], undefined)[0].title.en).toBe(CLEAN);
    expect(sanitizeSurveyQuestions([{ title: { en: XSS } }], "other")[0].title.en).toBe(CLEAN);
  });

  test("does not mutate its input, tolerates junk entries, and is idempotent", () => {
    const input = [{ id: "1", type: "Text", title: { en: XSS } }, null, "x", 3];
    const snapshot = structuredClone(input);
    const once = sanitizeSurveyQuestions(input, "web");
    expect(input).toEqual(snapshot);
    expect(once.slice(1)).toEqual([null, "x", 3]);
    expect(sanitizeSurveyQuestions(once, "web")).toEqual(once);
  });

  test("a clean survey round-trips unchanged", () => {
    const questions = [
      {
        id: "w",
        type: "Welcome",
        title: { English: "Welcome Page" },
        titleText:
          '<h3 style="text-align: center">Welcome</h3><p style="text-align: center">Welcome to the survey</p>',
        startButtonText: "Start Survey",
      },
      { id: "1", type: "Text", title: { English: "<p>How was it?</p>" }, description: {} },
    ];
    expect(sanitizeSurveyQuestions(questions, "web")).toEqual(questions);
  });
});

describe("sanitizeSurveyThemeJson", () => {
  test("page title / subtitle HTML is sanitised; styles are untouched", () => {
    const theme = {
      welcomeTheme: {
        title: { title: XSS, styles: { color: "#fff" } },
        subtitle: { subtitle: "<script>x()</script>sub", styles: {} },
        button: { label: "<b>Go</b>" },
        useSurveyTheme: true,
      },
      surveyTheme: { title: { title: "", styles: { fontSize: 20 } } },
      extra: "keep",
    };
    expect(sanitizeSurveyThemeJson(theme)).toEqual({
      ...theme,
      welcomeTheme: {
        ...theme.welcomeTheme,
        title: { title: CLEAN, styles: { color: "#fff" } },
        subtitle: { subtitle: "sub", styles: {} },
      },
    });
  });

  test("non-object themes pass through", () => {
    expect(sanitizeSurveyThemeJson(null)).toBeNull();
    expect(sanitizeSurveyThemeJson("x")).toBe("x");
  });
});
