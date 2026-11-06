import { describe, expect, test } from "vitest";

import { documentStorageName, parseDocumentContent, splitMediaContent } from "./mediaContent";

describe("splitMediaContent", () => {
  test("keeps separators inside the last part", () => {
    expect(splitMediaContent("id_caption_a _caption_ b", 2)).toEqual(["id", "a _caption_ b"]);
  });

  test("returns fewer parts when the separator is missing", () => {
    expect(splitMediaContent("id", 2)).toEqual(["id"]);
    expect(splitMediaContent(undefined, 2)).toEqual([""]);
  });
});

describe("documentStorageName", () => {
  test("never uses the customer's filename as a path", () => {
    expect(documentStorageName("123", "../SQLite/chat_contacts_db")).toBe("123.bin");
    expect(documentStorageName("123", "../../x.pdf")).toBe("123.pdf");
  });

  test("makes URL ids file-safe", () => {
    expect(documentStorageName("https://cdn.example/a/b.pdf", "b.PDF")).toBe(
      "https___cdn_example_a_b_pdf.pdf",
    );
  });

  test("falls back to .bin for unknown extensions", () => {
    expect(documentStorageName("1", "evil.sh")).toBe("1.bin");
    expect(documentStorageName("1", undefined)).toBe("1.bin");
  });
});

describe("parseDocumentContent", () => {
  test("splits id, filename and a caption that contains the separator", () => {
    expect(parseDocumentContent("9_caption_report.xlsx_caption_see _caption_ here")).toEqual({
      id: "9",
      filename: "report.xlsx",
      caption: "see _caption_ here",
      storageName: "9.xlsx",
    });
  });

  test("treats a missing filename as the default", () => {
    expect(parseDocumentContent("9_caption_undefined_caption_").filename).toBe("document.pdf");
  });
});
