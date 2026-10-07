import { describe, expect, test, vi } from "vitest";

import {
  attachmentSizeError,
  attachmentTypeError,
  galleryAssetKind,
  galleryAssetName,
  resolveMimeType,
  sharedFileKind,
  toFileUri,
} from "./attachments";

// Hoisted above the imports by vitest; the real module pulls in React Native.
vi.mock("@/constants/enums", () => ({
  MessagePlatform: { WHATSAPP: "WHATSAPP", INSTAGRAM: "INSTAGRAM" },
}));

const MB = 1024 * 1024;

describe("attachmentSizeError", () => {
  test("WhatsApp caps images at 5 MB and videos at 16 MB", () => {
    expect(attachmentSizeError({ name: "a.jpg", size: 5 * MB }, "image", "WHATSAPP")).toBeNull();
    expect(attachmentSizeError({ name: "a.jpg", size: 6 * MB }, "image", "WHATSAPP")).toBe(
      '"a.jpg" is 6 MB. Images can be up to 5 MB.',
    );
    expect(attachmentSizeError({ name: "v.mp4", size: 20 * MB }, "video", "WHATSAPP")).toBe(
      '"v.mp4" is 20 MB. Videos can be up to 16 MB.',
    );
  });

  test("other platforms have their own limits", () => {
    expect(attachmentSizeError({ name: "a.jpg", size: 6 * MB }, "image", "INSTAGRAM")).toBeNull();
  });

  test("an unknown size is let through", () => {
    expect(attachmentSizeError({ name: "a.jpg" }, "image", "WHATSAPP")).toBeNull();
  });
});

describe("resolveMimeType", () => {
  test("prefers the picker's type, then the extension", () => {
    expect(resolveMimeType("a.jpg", "image/png")).toBe("image/png");
    expect(resolveMimeType("clip.MOV")).toBe("video/quicktime");
    expect(resolveMimeType("report.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(resolveMimeType("noext")).toBe("application/octet-stream");
  });

  test("respells phone-specific types the way the API knows them", () => {
    // An iPhone Voice Memo, and `.m4a` on older Android.
    expect(resolveMimeType("New Recording.m4a", "audio/x-m4a")).toBe("audio/mp4");
    expect(resolveMimeType("rec.m4a", "audio/mp4a-latm")).toBe("audio/mp4");
    expect(resolveMimeType("song.mp3", "audio/mp3")).toBe("audio/mpeg");
    expect(resolveMimeType("a.jpg", "IMAGE/JPG")).toBe("image/jpeg");
  });
});

describe("galleryAssetKind", () => {
  test("Live Photos are sent as images", () => {
    expect(galleryAssetKind({ type: "livePhoto" })).toBe("image");
    expect(galleryAssetKind({ type: "video" })).toBe("video");
    expect(galleryAssetKind({ mimeType: "video/mp4" })).toBe("video");
  });
});

describe("galleryAssetName", () => {
  test("keeps the name but takes the extension of the file actually uploaded", () => {
    expect(galleryAssetName({ fileName: "IMG_1.HEIC", uri: "file:///x/ABC.jpg" }, "image")).toBe(
      "IMG_1.jpg",
    );
  });

  test("generates a name when the picker gives none", () => {
    expect(galleryAssetName({ uri: "file:///cache/ABC.jpg" }, "image")).toMatch(/^image-\d+\.jpg$/);
    expect(galleryAssetName({ uri: "content://media/42" }, "video")).toMatch(/^video-\d+\.mp4$/);
  });
});

describe("sharedFileKind", () => {
  test("sorts a shared file by its MIME type", () => {
    expect(sharedFileKind("image/heic")).toBe("image");
    expect(sharedFileKind("video/quicktime")).toBe("video");
    expect(sharedFileKind("audio/mpeg")).toBe("audio");
    expect(sharedFileKind("application/pdf")).toBe("document");
  });
});

describe("toFileUri", () => {
  test("prefixes a bare path and leaves a uri alone", () => {
    expect(toFileUri("/data/user/0/cache/a.jpg")).toBe("file:///data/user/0/cache/a.jpg");
    expect(toFileUri("file:///var/a.jpg")).toBe("file:///var/a.jpg");
  });
});

describe("attachmentTypeError", () => {
  test("accepts the audio and document types WhatsApp takes", () => {
    expect(attachmentTypeError({ name: "a.m4a", mimeType: "audio/mp4", kind: "audio" })).toBeNull();
    expect(
      attachmentTypeError({ name: "a.pdf", mimeType: "application/pdf", kind: "document" }),
    ).toBeNull();
  });

  test("refuses the rest before they are uploaded", () => {
    expect(attachmentTypeError({ name: "a.wav", mimeType: "audio/wav", kind: "audio" })).toBe(
      `"a.wav" can't be sent. Audio files must be MP3, M4A, AAC, AMR or OGG.`,
    );
    expect(
      attachmentTypeError({ name: "a.zip", mimeType: "application/zip", kind: "document" }),
    ).toMatch(/PDF, Word, Excel, PowerPoint or TXT/);
  });

  test("leaves photos and videos to the picker and the API", () => {
    expect(
      attachmentTypeError({ name: "a.heic", mimeType: "image/heic", kind: "image" }),
    ).toBeNull();
  });
});
