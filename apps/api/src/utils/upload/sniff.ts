import { Readable } from "node:stream";

/**
 * Minimal magic-byte checks for the upload allow-list (`validate.ts`). The multipart
 * part's MIME type is whatever the client wrote; the stored object is served from the CDN
 * with that type, so a type must be backed by bytes that actually look like it.
 */

/** Bytes needed by every check below. */
export const SNIFF_BYTES = 16;

const ascii = (head: Buffer, offset: number, text: string) =>
  head.length >= offset + text.length &&
  head.subarray(offset, offset + text.length).toString("latin1") === text;

const bytes = (head: Buffer, offset: number, expected: number[]) =>
  head.length >= offset + expected.length && expected.every((b, i) => head[offset + i] === b);

const isJpeg = (h: Buffer) => bytes(h, 0, [0xff, 0xd8, 0xff]);
const isPng = (h: Buffer) => bytes(h, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isGif = (h: Buffer) => ascii(h, 0, "GIF87a") || ascii(h, 0, "GIF89a");
const isWebp = (h: Buffer) => ascii(h, 0, "RIFF") && ascii(h, 8, "WEBP");
const isPdf = (h: Buffer) => ascii(h, 0, "%PDF-");
/** ZIP container: docx, xlsx, pptx. */
const isZip = (h: Buffer) =>
  bytes(h, 0, [0x50, 0x4b, 0x03, 0x04]) ||
  bytes(h, 0, [0x50, 0x4b, 0x05, 0x06]) ||
  bytes(h, 0, [0x50, 0x4b, 0x07, 0x08]);
/** OLE2 compound file: legacy doc, xls, ppt. */
const isOle = (h: Buffer) => bytes(h, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
/** ISO base media (mp4, m4a, mov, 3gp): a box type at offset 4. */
const isIsoMedia = (h: Buffer) =>
  ["ftyp", "moov", "mdat", "wide", "free", "skip", "pnot"].some((box) => ascii(h, 4, box));
const isOgg = (h: Buffer) => ascii(h, 0, "OggS");
const isAmr = (h: Buffer) => ascii(h, 0, "#!AMR");
/** MPEG audio: an ID3 tag or an MPEG frame sync. */
const isMp3 = (h: Buffer) =>
  ascii(h, 0, "ID3") || (h.length >= 2 && h[0] === 0xff && (h[1] & 0xe0) === 0xe0);
/** AAC: ADTS frame sync or an ADIF header. */
const isAac = (h: Buffer) =>
  ascii(h, 0, "ADIF") || (h.length >= 2 && h[0] === 0xff && (h[1] & 0xf6) === 0xf0);
/** Plain text has no signature; refuse anything carrying NUL bytes. */
const isText = (h: Buffer) => !h.includes(0);

const SIGNATURES: Record<string, (head: Buffer) => boolean> = {
  "image/jpeg": isJpeg,
  "image/png": isPng,
  "image/gif": isGif,
  "image/webp": isWebp,
  "application/pdf": isPdf,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": isZip,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": isZip,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": isZip,
  "application/vnd.ms-excel": isOle,
  "application/msword": isOle,
  "application/vnd.ms-powerpoint": isOle,
  "video/mp4": isIsoMedia,
  "video/quicktime": isIsoMedia,
  "video/3gpp": isIsoMedia,
  "audio/mp4": isIsoMedia,
  "audio/ogg": isOgg,
  "audio/amr": isAmr,
  "audio/mpeg": isMp3,
  // Some recorders label an M4A as AAC.
  "audio/aac": (h) => isAac(h) || isIsoMedia(h),
  "text/plain": isText,
};

/** True when the leading bytes match the (normalized) MIME type. Unknown types never match. */
export function matchesSignature(mimetype: string, head: Buffer): boolean {
  const check = SIGNATURES[mimetype];
  return check ? head.length > 0 && check(head) : false;
}

export class UploadTooLargeError extends Error {
  statusCode = 413;
  constructor() {
    super("File size exceeds the limit for this type.");
    this.name = "UploadTooLargeError";
  }
}

/**
 * Reads the first `n` bytes of an upload stream and hands back a stream that replays them
 * followed by the rest, refusing (by erroring) once more than `maxBytes` have passed. The
 * per-type caps used to be checked against a size the client declared in a form field.
 */
export async function peekStream(
  source: AsyncIterable<Buffer | string>,
  n: number,
  maxBytes = Number.POSITIVE_INFINITY,
): Promise<{ head: Buffer; stream: Readable }> {
  const iterator = source[Symbol.asyncIterator]();
  const buffered: Buffer[] = [];
  let length = 0;
  let done = false;
  while (length < n) {
    const next = await iterator.next();
    if (next.done) {
      done = true;
      break;
    }
    const chunk = typeof next.value === "string" ? Buffer.from(next.value) : next.value;
    buffered.push(chunk);
    length += chunk.length;
    if (length > maxBytes) throw new UploadTooLargeError();
  }
  const head = Buffer.concat(buffered).subarray(0, n);

  async function* replay() {
    let total = length;
    for (const chunk of buffered) yield chunk;
    if (done) return;
    while (true) {
      const next = await iterator.next();
      if (next.done) return;
      const chunk = typeof next.value === "string" ? Buffer.from(next.value) : next.value;
      total += chunk.length;
      if (total > maxBytes) throw new UploadTooLargeError();
      yield chunk;
    }
  }

  return { head, stream: Readable.from(replay(), { objectMode: false }) };
}
