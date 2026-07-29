import { describe, expect, test } from "vitest";
import { validateFile } from "./validate.js";

const MB = 1024 * 1024;

/** The shape @fastify/multipart hands the validator. */
function upload({
  mimetype = "image/png",
  size,
  truncated = false,
  type = "file",
}: {
  mimetype?: string;
  size?: number;
  truncated?: boolean;
  type?: string;
} = {}) {
  return {
    mimetype,
    type,
    file: { truncated },
    fields: size === undefined ? {} : { size: { value: size } },
  } as any;
}

describe("validateFile - accepted uploads", () => {
  test.each([
    ["a JPEG within 5MB", "image/jpeg", 4 * MB],
    ["a PNG within 5MB", "image/png", 4 * MB],
    ["a PDF within 100MB", "application/pdf", 50 * MB],
    ["an MP4 within 16MB", "video/mp4", 10 * MB],
    ["an MP3 within 16MB", "audio/mpeg", 10 * MB],
    ["a webp sticker within 500KB", "image/webp", 400 * 1024],
  ])("accepts %s", (_name, mimetype, size) => {
    expect(validateFile({ data: upload({ mimetype, size }) })).toMatchObject({ valid: true });
  });

  test("reports the limit that applied", () => {
    const result = validateFile({ data: upload({ mimetype: "image/png", size: 1 }) });

    expect(result.maxSize).toBe(5 * MB);
  });

  test("accepts a file whose size field is missing", () => {
    expect(validateFile({ data: upload({ mimetype: "image/png" }) })).toMatchObject({
      valid: true,
    });
  });

  test("accepts a file exactly at its limit", () => {
    expect(validateFile({ data: upload({ mimetype: "image/png", size: 5 * MB }) })).toMatchObject({
      valid: true,
    });
  });
});

describe("validateFile - rejected uploads", () => {
  test("rejects a file type it has no limit for", () => {
    const result = validateFile({ data: upload({ mimetype: "application/x-msdownload" }) });

    expect(result).toEqual({ valid: false, message: "Unsupported file type." });
  });

  test("rejects an upload with no mime type at all", () => {
    // Built directly rather than via the helper, whose default would supply one.
    const data = { type: "file", file: { truncated: false }, fields: {} } as any;

    expect(validateFile({ data })).toEqual({
      valid: false,
      message: "Unsupported file type.",
    });
  });

  test("rejects an upload the server already cut short", () => {
    const result = validateFile({
      data: upload({ mimetype: "image/png", size: 1, truncated: true }),
    });

    expect(result).toEqual({ valid: false, message: "File size exceeds server limit." });
  });

  test.each([
    ["a JPEG over 5MB", "image/jpeg", 6 * MB, 5 * MB],
    ["a sticker over 500KB", "image/webp", 600 * 1024, 500 * 1024],
    ["a video over 16MB", "video/mp4", 20 * MB, 16 * MB],
    ["a PDF over 100MB", "application/pdf", 101 * MB, 100 * MB],
  ])("rejects %s and reports the limit", (_name, mimetype, size, expectedMax) => {
    const result = validateFile({ data: upload({ mimetype, size }) });

    expect(result).toEqual({
      valid: false,
      message: "File size exceeds for this type.",
      maxSize: expectedMax,
    });
  });

  test("rejects a part that is a field rather than a file", () => {
    const result = validateFile({
      data: upload({ mimetype: "image/png", size: 1, type: "field" }),
    });

    expect(result).toEqual({ valid: false, message: "This file type is not permitted." });
  });

  test("checks the size limit before the truncation flag matters for an unknown type", () => {
    const result = validateFile({
      data: upload({ mimetype: "application/zip", truncated: true }),
    });

    expect(result.message).toBe("Unsupported file type.");
  });
});

describe("validateFile - the allowAll bypass", () => {
  test("waves through anything when the caller opts out of checking", () => {
    expect(
      validateFile({ data: upload({ mimetype: "application/x-msdownload" }), allowAll: true }),
    ).toEqual({ valid: true });
  });

  test("waves through an oversized file too", () => {
    expect(
      validateFile({ data: upload({ mimetype: "image/png", size: 500 * MB }), allowAll: true }),
    ).toEqual({ valid: true });
  });

  // NOTE: allowAll returns before the truncation check, so a file the server already
  // cut short is reported valid and the caller stores a partial upload.
  test("waves through a file the server truncated", () => {
    expect(
      validateFile({ data: upload({ mimetype: "image/png", truncated: true }), allowAll: true }),
    ).toEqual({ valid: true });
  });

  test("checks normally when allowAll is not set", () => {
    expect(validateFile({ data: upload({ mimetype: "application/zip" }) })).toMatchObject({
      valid: false,
    });
  });
});
