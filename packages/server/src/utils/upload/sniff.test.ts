import { describe, expect, test } from "vitest";
import { Readable } from "node:stream";
import { matchesSignature, peekStream, UploadTooLargeError } from "./sniff.js";

describe("matchesSignature", () => {
  test.each([
    ["image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xdb])],
    ["image/webp", Buffer.from("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ")],
    ["application/pdf", Buffer.from("%PDF-1.4")],
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    ],
    ["application/msword", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
    ["video/quicktime", Buffer.from("\u0000\u0000\u0000\u0014ftypqt  ")],
    ["audio/mp4", Buffer.from("\u0000\u0000\u0000\u0018ftypM4A ")],
    ["audio/ogg", Buffer.from("OggS")],
    ["audio/mpeg", Buffer.from("ID3\u0004")],
    ["audio/aac", Buffer.from([0xff, 0xf1, 0x50, 0x80])],
    ["audio/amr", Buffer.from("#!AMR\n")],
    ["text/plain", Buffer.from("hello")],
  ])("%s matches its own signature", (type, head) => {
    expect(matchesSignature(type, head)).toBe(true);
  });

  test("an HTML page labelled as an image does not match", () => {
    expect(matchesSignature("image/png", Buffer.from("<html><script>"))).toBe(false);
    expect(matchesSignature("application/pdf", Buffer.from("<svg onload=alert(1)>"))).toBe(false);
  });

  test("binary content labelled text/plain does not match", () => {
    expect(matchesSignature("text/plain", Buffer.from([0x4d, 0x5a, 0x00, 0x90]))).toBe(false);
  });

  test("an unknown type or an empty file never matches", () => {
    expect(matchesSignature("text/html", Buffer.from("<html>"))).toBe(false);
    expect(matchesSignature("image/png", Buffer.alloc(0))).toBe(false);
  });
});

describe("peekStream", () => {
  async function collect(stream: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  }

  test("returns the head and replays the whole content", async () => {
    const source = Readable.from([Buffer.from("abc"), Buffer.from("defgh"), Buffer.from("ij")]);
    const { head, stream } = await peekStream(source, 4);

    expect(head.toString()).toBe("abcd");
    expect((await collect(stream)).toString()).toBe("abcdefghij");
  });

  test("errors once the content passes the byte cap", async () => {
    const source = Readable.from([Buffer.alloc(4), Buffer.alloc(4), Buffer.alloc(4)]);
    const { stream } = await peekStream(source, 2, 10);

    await expect(collect(stream)).rejects.toBeInstanceOf(UploadTooLargeError);
  });
});
