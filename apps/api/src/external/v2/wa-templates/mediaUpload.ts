import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Transform, type TransformCallback, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { MultipartFile } from "@fastify/multipart";
import axios from "axios";
import FormData from "form-data";

import { GraphApiError } from "../../../modules/meta/whatsapp/wa_axios.js";
import { graphUrl } from "../../../utils/meta.js";
import { ExternalApiError } from "../../shared/errors.js";
import type { HeaderMediaType } from "./waTemplates.schema.js";

/**
 * Streaming a template's header media from the partner straight into WhatsApp's `/media`.
 *
 * This used to buffer: `@fastify/multipart` ran with `attachFieldsToBody` and an `onFile`
 * that called `toBuffer()`, so every request held its whole file — up to 100 MB — in memory
 * before anything was checked. Now the file part is piped through a byte counter into the
 * Graph upload as it arrives, and the type and size are enforced on the way through.
 *
 * Two choices worth knowing:
 *
 * - **Always a real Content-Length.** A multipart part does not say how big it is and
 *   `form-data` cannot measure an arbitrary stream, so without help axios would send the
 *   upload chunked — which Meta's `/media` has never been verified to accept. So the file is
 *   spooled to a temp file on disk (memory stays flat, the size caps are enforced while
 *   writing) and streamed from there with `knownLength`. A caller that sends a `fileSize`
 *   field (before the file) skips the spool: the part is piped straight through, and the
 *   counter insists on exactly that many bytes.
 * - **axios directly, not `callMetaApi`.** `callMetaApi` retries transport errors by
 *   re-sending the same config, and a consumed stream cannot be re-sent: the retry would
 *   hang or post a truncated body. It also goes through follow-redirects, which buffers the
 *   request body (up to its 10 MB default) in case it has to replay it — `maxRedirects: 0`
 *   makes axios use plain `http(s)` and keeps memory flat.
 */

const MB = 1024 * 1024;

/** WhatsApp's own caps for each header media type. */
const HEADER_MEDIA_RULES: Record<HeaderMediaType, { mimeTypes: string[]; maxBytes: number }> = {
  image: { mimeTypes: ["image/jpeg", "image/png"], maxBytes: 5 * MB },
  video: { mimeTypes: ["video/mp4", "video/3gpp"], maxBytes: 16 * MB },
  document: {
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    maxBytes: 100 * MB,
  },
};

/**
 * The multipart parser's own ceiling: one byte over the largest type's cap, so a file that
 * is too big for its type is always caught by the counter (which knows the type) rather than
 * silently truncated by the parser.
 */
export const MULTIPART_FILE_LIMIT =
  Math.max(...Object.values(HEADER_MEDIA_RULES).map((r) => r.maxBytes)) + 1;

const MEDIA_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/** Passes bytes through, failing the stream once more than `max` have gone by. */
class ByteCounter extends Transform {
  bytes = 0;
  tooLarge = false;
  lengthMismatch = false;

  constructor(
    private readonly max: number,
    private readonly exact?: number,
  ) {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback) {
    this.bytes += chunk.length;
    if (this.bytes > this.max) {
      // With a declared size the cap is that size (already checked against the type's).
      if (this.exact === undefined) this.tooLarge = true;
      else this.lengthMismatch = true;
      done(new Error("file over its limit"));
      return;
    }
    done(null, chunk);
  }

  override _flush(done: TransformCallback) {
    if (this.exact !== undefined && this.bytes !== this.exact) {
      this.lengthMismatch = true;
      done(new Error("file shorter than its declared size"));
      return;
    }
    done();
  }
}

interface UploadHeaderMediaInput {
  file: MultipartFile;
  type: HeaderMediaType;
  phoneId: string;
  accessToken: string;
  /** The `fileSize` field, when the caller sent one. */
  knownLength?: number;
}

function fileInvalid(message: string, details?: Record<string, unknown>) {
  return new ExternalApiError(400, "file_invalid", message, details);
}

/** Checks what can be checked before a byte is read. */
function assertFileAcceptable(file: MultipartFile, type: HeaderMediaType, knownLength?: number) {
  const rule = HEADER_MEDIA_RULES[type];
  if (!rule.mimeTypes.includes(file.mimetype)) {
    throw fileInvalid(`A ${type} header takes ${rule.mimeTypes.join(", ")}`, {
      mimetype: file.mimetype,
      allowed: rule.mimeTypes,
    });
  }
  if (knownLength !== undefined && knownLength > rule.maxBytes) {
    throw fileInvalid(`A ${type} header can be at most ${rule.maxBytes / MB} MB`, {
      maxBytes: rule.maxBytes,
    });
  }
}

/** Streams the file into `/{phoneId}/media` and returns WhatsApp's media id. */
export async function uploadHeaderMedia({
  file,
  type,
  phoneId,
  accessToken,
  knownLength,
}: UploadHeaderMediaInput): Promise<string> {
  assertFileAcceptable(file, type, knownLength);
  const rule = HEADER_MEDIA_RULES[type];
  const counter = new ByteCounter(knownLength ?? rule.maxBytes, knownLength);

  let source: Readable = counter;
  let length = knownLength;
  let spoolDir: string | undefined;
  if (knownLength === undefined) {
    spoolDir = await mkdtemp(join(tmpdir(), "rateup-media-"));
    const path = join(spoolDir, "upload");
    try {
      await pipeline(file.file, counter, createWriteStream(path));
    } catch (err) {
      await rm(spoolDir, { recursive: true, force: true });
      throw (
        counter.tooLarge || file.file.truncated
          ? fileInvalid(`A ${type} header can be at most ${rule.maxBytes / MB} MB`, {
              maxBytes: rule.maxBytes,
            })
          : err
      ) as Error;
    }
    if (file.file.truncated) {
      await rm(spoolDir, { recursive: true, force: true });
      throw fileInvalid(`A ${type} header can be at most ${rule.maxBytes / MB} MB`, {
        maxBytes: rule.maxBytes,
      });
    }
    source = createReadStream(path);
    length = counter.bytes;
  } else {
    // Errors on the part (a client that drops mid-upload) must reach the request too.
    file.file.on("error", (err) => counter.destroy(err));
    file.file.pipe(counter);
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", file.mimetype);
  form.append("file", source, {
    filename: file.filename || `upload.${type}`,
    contentType: file.mimetype,
    knownLength: length,
  });

  try {
    return await postMedia(form, phoneId, accessToken, () =>
      fail(counter, file, type, knownLength),
    );
  } finally {
    if (spoolDir) await rm(spoolDir, { recursive: true, force: true });
  }
}

function fail(
  counter: ByteCounter,
  file: MultipartFile,
  type: HeaderMediaType,
  knownLength: number | undefined,
) {
  const rule = HEADER_MEDIA_RULES[type];
  if (counter.lengthMismatch) {
    return fileInvalid("The file's size did not match `fileSize`", {
      declared: knownLength,
      received: counter.bytes,
    });
  }
  if (counter.tooLarge || file.file.truncated) {
    return fileInvalid(`A ${type} header can be at most ${rule.maxBytes / MB} MB`, {
      maxBytes: rule.maxBytes,
    });
  }
  return null;
}

async function postMedia(
  form: FormData,
  phoneId: string,
  accessToken: string,
  sizeFailure: () => ExternalApiError | null,
): Promise<string> {
  let res;
  try {
    res = await axios.post(graphUrl(`/${phoneId}/media`), form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${accessToken}` },
      maxRedirects: 0,
      maxBodyLength: Infinity,
      maxContentLength: 1 * MB,
      timeout: MEDIA_UPLOAD_TIMEOUT_MS,
      validateStatus: () => true,
    });
  } catch (err) {
    throw sizeFailure() ?? err;
  }
  // A size failure can also surface as Meta answering a truncated body.
  const sizeError = sizeFailure();
  if (sizeError) throw sizeError;

  if (res.status < 200 || res.status >= 300) {
    if (res.data?.error) throw new GraphApiError(res);
    throw new Error(`Meta /media answered ${res.status}`);
  }
  const id = res.data?.id;
  if (typeof id !== "string" || !id) throw new Error("Meta /media returned no id");
  return id;
}
