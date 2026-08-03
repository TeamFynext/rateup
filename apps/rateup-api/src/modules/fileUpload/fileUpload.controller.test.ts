import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/upload/s3Upload.js", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("sharp", () => ({ default: vi.fn() }));

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(() => Buffer.from("converted")),
    unlinkSync: vi.fn(),
    createWriteStream: vi.fn(),
  },
}));

vi.mock("@ffmpeg-installer/ffmpeg", () => ({ default: { path: "/usr/bin/ffmpeg" } }));

vi.mock("fluent-ffmpeg", () => {
  const chain: any = {
    audioCodec: vi.fn(() => chain),
    audioBitrate: vi.fn(() => chain),
    outputOptions: vi.fn(() => chain),
    format: vi.fn(() => chain),
    on: vi.fn((event: string, cb: any) => {
      if (event === "end") chain.__end = cb;
      if (event === "error") chain.__error = cb;
      return chain;
    }),
    save: vi.fn(() => {
      if (chain.__shouldFail) chain.__error?.(new Error("ffmpeg failed"));
      else chain.__end?.();
      return chain;
    }),
  };
  const ffmpeg: any = vi.fn(() => chain);
  ffmpeg.setFfmpegPath = vi.fn();
  ffmpeg.__chain = chain;
  return { default: ffmpeg };
});

import fs from "node:fs";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { deleteFile, uploadFile } from "../../utils/upload/s3Upload.js";
import {
  deleteUploadedFileController,
  uploadController,
  uploadWithThumbnailsController,
} from "./fileUpload.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const s3 = { uploadFile: uploadFile as unknown as Mock, deleteFile: deleteFile as unknown as Mock };
const fsMock = fs as unknown as Record<string, Mock>;
const chain = (ffmpeg as any).__chain;

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

/// A @fastify/multipart file part, in the shape req.file() resolves to.
function upload(over: Record<string, unknown> = {}) {
  const fields: Record<string, unknown> = (over.fields as any) ?? {};
  return {
    type: "file",
    filename: "photo.png",
    mimetype: "image/png",
    file: { resume: vi.fn(), truncated: false, pipe: vi.fn() },
    fields,
    toBuffer: vi.fn(async () => Buffer.from("raw")),
    ...over,
  };
}

function request(part: unknown) {
  return { file: vi.fn(async () => part) } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  s3.uploadFile.mockResolvedValue("https://cdn.test/photo.png");
  s3.deleteFile.mockResolvedValue({ Deleted: [] });
  fsMock.existsSync.mockReturnValue(true);
  fsMock.readFileSync.mockReturnValue(Buffer.from("converted"));
  fsMock.createWriteStream.mockImplementation(() => {
    const handlers: Record<string, any> = {};
    return {
      on: (event: string, cb: any) => {
        handlers[event] = cb;
        // The pipe below resolves the pump as soon as "finish" is registered.
        if (event === "finish") setImmediate(cb);
      },
    };
  });
  (sharp as unknown as Mock).mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(async () => Buffer.from("thumb")),
  });
  chain.__shouldFail = false;
  chain.__end = undefined;
  chain.__error = undefined;
});

// ===========================================================================
// uploadController — validation
// ===========================================================================

describe("uploadController — what it accepts", () => {
  test("uploads an allowed image and reports its key", async () => {
    const rep = reply();

    await uploadController(request(upload()), rep);

    expect(s3.uploadFile).toHaveBeenCalledTimes(1);
    const params = s3.uploadFile.mock.calls[0][0];
    expect(params.ContentType).toBe("image/png");
    expect(params.Key).toMatch(/^\d+-photo\.png$/);
    expect(answer(rep)).toEqual({
      code: 200,
      body: {
        message: "File uploaded successfully",
        data: { fileUrl: "https://cdn.test/photo.png", key: params.Key },
      },
    });
  });

  test("refuses a type that is not on the allow list, and drains the stream", async () => {
    const part = upload({ mimetype: "application/x-msdownload", filename: "setup.exe" });
    const rep = reply();

    await uploadController(request(part), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "Unsupported file type." } });
    expect(part.file.resume).toHaveBeenCalled();
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  test("refuses a file the multipart limit already truncated", async () => {
    const part = upload({ file: { resume: vi.fn(), truncated: true, pipe: vi.fn() } });
    const rep = reply();

    await uploadController(request(part), rep);

    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "File size exceeds server limit." },
    });
  });

  // NOTE: pins current behaviour, and it is the sharpest defect in the module.
  // `allowAll` is read from a `metadata` FORM FIELD the uploader controls, and
  // validateFile returns `{ valid: true }` as its very first statement when it is
  // set — before the type check, before the size check, before the truncation
  // check. The route is unauthenticated (registerRoutes.ts:71,
  // /api/public/upload), so anyone on the internet can post
  // `metadata={"allowAll":true}` and put a file of ANY type into the company's S3
  // bucket, bounded only by the 100 MB multipart limit.
  // See issues.txt 24.1.
  test("lets the uploader switch off every check with a metadata field", async () => {
    const part = upload({
      mimetype: "text/html",
      filename: "payload.html",
      fields: { metadata: { value: '{"allowAll":true}' } },
    });
    const rep = reply();

    await uploadController(request(part), rep);

    expect(rep.code).not.toHaveBeenCalledWith(400);
    expect(s3.uploadFile).toHaveBeenCalled();
    expect(s3.uploadFile.mock.calls[0][0].ContentType).toBe("text/html");
  });

  test("a metadata field without the flag still validates normally", async () => {
    const part = upload({
      mimetype: "application/x-msdownload",
      fields: { metadata: { value: '{"allowAll":false}' } },
    });
    const rep = reply();

    await uploadController(request(part), rep);

    expect(answer(rep).code).toBe(400);
  });

  // NOTE: the parse is not guarded, and it runs before the try/catch, so a
  // malformed metadata field escapes the handler entirely rather than becoming a
  // 400. See issues.txt 24.5.
  test("lets malformed metadata escape as an unhandled rejection", async () => {
    const part = upload({ fields: { metadata: { value: "{not json" } } });

    await expect(uploadController(request(part), reply())).rejects.toThrow(SyntaxError);
  });

  // NOTE: req.file() resolves to undefined when the request carries no file part.
  // The handler previously read `data.mimetype`/`data.file` off that undefined
  // value with no guard and crashed with an unhandled TypeError. It now checks
  // for a missing file up front and answers a clean 400 instead.
  test("answers 400 rather than crashing when the request carries no file at all", async () => {
    const rep = reply();

    await uploadController(request(undefined), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "No file uploaded." } });
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  test("strips everything but letters, digits, dots and dashes from the key", async () => {
    const part = upload({ filename: "my photo (1)/../etc.png" });
    const rep = reply();

    await uploadController(request(part), rep);

    expect(s3.uploadFile.mock.calls[0][0].Key).toMatch(/^\d+-myphoto1\.\.etc\.png$/);
  });
});

// ===========================================================================
// uploadController — the audio conversion branch
// ===========================================================================

describe("uploadController — audio conversion", () => {
  function audio(mimetype: string) {
    return upload({ mimetype, filename: "note.ogg" });
  }

  test("transcodes mpeg to m4a and uploads the converted bytes", async () => {
    const rep = reply();

    await uploadController(request(audio("audio/mpeg")), rep);

    expect(chain.audioCodec).toHaveBeenCalledWith("aac");
    const params = s3.uploadFile.mock.calls[0][0];
    expect(params.ContentType).toBe("audio/mp4");
    expect(params.Body).toEqual(Buffer.from("converted"));
    expect(answer(rep).code).toBe(200);
  });

  test("transcodes ogg with opus and keeps the ogg content type", async () => {
    const rep = reply();

    await uploadController(request(audio("audio/ogg")), rep);

    expect(chain.audioCodec).toHaveBeenCalledWith("libopus");
    expect(chain.format).toHaveBeenCalledWith("ogg");
    expect(s3.uploadFile.mock.calls[0][0].ContentType).toBe("audio/ogg");
  });

  test("creates the temp directory when it is missing", async () => {
    fsMock.existsSync.mockReturnValue(false);

    await uploadController(request(audio("audio/mp4")), reply());

    expect(fsMock.mkdirSync).toHaveBeenCalledWith(expect.stringContaining("tmp"), {
      recursive: true,
    });
  });

  test("removes both temp files once the upload finishes", async () => {
    await uploadController(request(audio("audio/ogg")), reply());

    expect(fsMock.unlinkSync).toHaveBeenCalledTimes(2);
  });

  // NOTE: the whole conversion — the pump to disk and the ffmpeg run — sits
  // OUTSIDE the try/catch. A transcode failure therefore escapes the handler as
  // an unhandled rejection instead of becoming a 500, and because `params` is
  // only reassigned after a successful convert, the finally block's
  // ContentType check does not match and BOTH temp files are left on disk.
  // See issues.txt 24.4.
  test("leaks both temp files when the transcode fails", async () => {
    chain.__shouldFail = true;

    await expect(uploadController(request(audio("audio/mpeg")), reply())).rejects.toThrow(
      "ffmpeg failed",
    );
    expect(fsMock.unlinkSync).not.toHaveBeenCalled();
  });

  // NOTE: the converted file is read with readFileSync and the temp files are
  // removed with unlinkSync — synchronous calls on a file that may be up to the
  // 100 MB multipart limit, blocking the event loop for every other request.
  // See issues.txt 24.6.
  test("reads the converted file synchronously", async () => {
    await uploadController(request(audio("audio/ogg")), reply());

    expect(fsMock.readFileSync).toHaveBeenCalled();
    expect(fsMock.unlinkSync).toHaveBeenCalled();
  });
});

// ===========================================================================
// uploadController — the S3 result
// ===========================================================================

describe("uploadController — what it reports", () => {
  // NOTE: pins current behaviour. s3Upload.uploadFile swallows its own errors —
  // `catch (e) { console.log(e) }` with no rethrow — so it resolves to undefined
  // on failure. The controller's try/catch can therefore never fire for an S3
  // error: it answers 200 "File uploaded successfully" with `fileUrl: undefined`.
  // The client is told the upload worked and is handed nothing to fetch.
  // See issues.txt 24.3.
  test("reports success with an empty url when the S3 upload failed", async () => {
    s3.uploadFile.mockResolvedValue(undefined);
    const rep = reply();

    await uploadController(request(upload()), rep);

    expect(answer(rep)).toMatchObject({
      code: 200,
      body: { message: "File uploaded successfully", data: { fileUrl: undefined } },
    });
  });

  test("answers 500 with the bare error when the upload call itself throws", async () => {
    const boom = new Error("network down");
    s3.uploadFile.mockRejectedValue(boom);
    const rep = reply();

    await uploadController(request(upload()), rep);

    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body).toBe(boom);
    expect(JSON.stringify(answer(rep).body)).toBe("{}");
  });

  test("falls back to a hard-coded bucket name when none is configured", async () => {
    const original = process.env.AWS_S3_BUCKET;
    delete process.env.AWS_S3_BUCKET;

    await uploadController(request(upload()), reply());

    expect(s3.uploadFile.mock.calls[0][0].Bucket).toBe("rateup-survey-uploads");

    process.env.AWS_S3_BUCKET = original;
  });
});

// ===========================================================================
// uploadWithThumbnailsController
// ===========================================================================

describe("uploadWithThumbnailsController", () => {
  test("uploads the original and a 300x200 thumbnail together", async () => {
    s3.uploadFile
      .mockResolvedValueOnce("https://cdn.test/thumb.webp")
      .mockResolvedValueOnce("https://cdn.test/photo.png");
    const rep = reply();

    await uploadWithThumbnailsController(request(upload()), rep);

    expect(s3.uploadFile).toHaveBeenCalledTimes(2);
    const body = answer(rep).body;
    expect(body.data.fileUrl).toBe("https://cdn.test/photo.png");
    expect(body.data.fileThumbUrl).toBe("https://cdn.test/thumb.webp");
    expect(body.data.thumbKey).toMatch(/^thumb300x200-\d+-photo\.png$/);
  });

  test("resizes to fit inside the box rather than cropping", async () => {
    const instance = {
      resize: vi.fn().mockReturnThis(),
      webp: vi.fn().mockReturnThis(),
      toBuffer: vi.fn(async () => Buffer.from("thumb")),
    };
    (sharp as unknown as Mock).mockReturnValue(instance);

    await uploadWithThumbnailsController(request(upload()), reply());

    expect(instance.resize).toHaveBeenCalledWith({ fit: "inside", width: 300, height: 200 });
    expect(instance.webp).toHaveBeenCalled();
  });

  test("refuses a disallowed type before doing any work", async () => {
    const part = upload({ mimetype: "application/x-msdownload" });
    const rep = reply();

    await uploadWithThumbnailsController(request(part), rep);

    expect(answer(rep).code).toBe(400);
    expect(sharp).not.toHaveBeenCalled();
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  // NOTE: this endpoint takes no metadata, so it cannot be told allowAll — but it
  // accepts every type validateFile permits, including PDFs and videos, and then
  // hands the bytes straight to sharp. See issues.txt 24.7.
  test("hands a non-image to sharp and lets the failure escape", async () => {
    (sharp as unknown as Mock).mockImplementation(() => {
      throw new Error("Input buffer contains unsupported image format");
    });
    const part = upload({ mimetype: "application/pdf", filename: "doc.pdf" });

    await expect(uploadWithThumbnailsController(request(part), reply())).rejects.toThrow(
      /unsupported image format/,
    );
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  // NOTE: the thumbnail is encoded as webp but stored with the ORIGINAL file's
  // mimetype, so a JPEG upload produces webp bytes served as image/jpeg. Browsers
  // sniff and usually cope; anything that trusts the header does not.
  // See issues.txt 24.7.
  test("labels the webp thumbnail with the original file's content type", async () => {
    await uploadWithThumbnailsController(
      request(upload({ mimetype: "image/jpeg", filename: "photo.jpg" })),
      reply(),
    );

    const thumbParams = s3.uploadFile.mock.calls[0][0];
    expect(thumbParams.Key).toContain("thumb300x200-");
    expect(thumbParams.ContentType).toBe("image/jpeg");
  });

  // NOTE: toBuffer() pulls the entire upload into memory before anything else
  // happens — up to the 100 MB multipart limit, per concurrent request, on an
  // unauthenticated endpoint. See issues.txt 24.6.
  test("buffers the whole upload into memory first", async () => {
    const part = upload();

    await uploadWithThumbnailsController(request(part), reply());

    expect(part.toBuffer).toHaveBeenCalled();
  });

  test("answers 500 with the bare error when an upload rejects", async () => {
    s3.uploadFile.mockRejectedValue(new Error("network down"));
    const rep = reply();

    await uploadWithThumbnailsController(request(upload()), rep);

    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body).toBeInstanceOf(Error);
  });
});

// ===========================================================================
// deleteUploadedFileController
// ===========================================================================

describe("deleteUploadedFileController", () => {
  test("deletes the keys it was given from the bucket", async () => {
    const rep = reply();

    await deleteUploadedFileController(
      { body: { fileKeyArray: [{ Key: "1700000000-photo.png" }] } } as any,
      rep,
    );

    expect(s3.deleteFile).toHaveBeenCalledWith({
      Bucket: expect.any(String),
      Delete: { Objects: [{ Key: "1700000000-photo.png" }] },
    });
    expect(answer(rep)).toEqual({ code: 200, body: { message: "File delete successfully" } });
  });

  // NOTE: pins current behaviour, and this is the most serious finding in the
  // module. The route is PUT /api/public/upload/file/delete, registered with no
  // checkSession (fileUpload.public.route.ts, registerRoutes.ts:71). The handler
  // takes an arbitrary array of S3 keys from the request body and passes it
  // straight to DeleteObjectsCommand. There is no ownership check, no key-prefix
  // restriction and no org anywhere in the module — keys are
  // `${Date.now()}-${filename}`, so they are not org-scoped either.
  // Anyone on the internet who knows or guesses a key can delete it, and the
  // request accepts a batch. See issues.txt 24.2.
  test("deletes any key it is handed, in bulk, with no ownership check", async () => {
    const rep = reply();

    await deleteUploadedFileController(
      {
        body: {
          fileKeyArray: [
            { Key: "1700000000-someone-elses-logo.png" },
            { Key: "1700000001-another-orgs-contract.pdf" },
          ],
        },
      } as any,
      rep,
    );

    expect(s3.deleteFile.mock.calls[0][0].Delete.Objects).toHaveLength(2);
    expect(answer(rep).code).toBe(200);
  });

  // NOTE: s3Upload.deleteFile RETURNS its caught error rather than throwing
  // (`catch (err) { return err }`), so the controller's try/catch never fires and
  // every delete — including one S3 refused — answers 200 "File delete
  // successfully". See issues.txt 24.3.
  test("reports success even when the delete failed", async () => {
    s3.deleteFile.mockResolvedValue(new Error("AccessDenied"));
    const rep = reply();

    await deleteUploadedFileController({ body: { fileKeyArray: [{ Key: "k" }] } } as any, rep);

    expect(answer(rep)).toEqual({ code: 200, body: { message: "File delete successfully" } });
  });

  test("answers 500 with the bare error when the call itself throws", async () => {
    s3.deleteFile.mockRejectedValue(new Error("network down"));
    const rep = reply();

    await deleteUploadedFileController({ body: { fileKeyArray: [{ Key: "k" }] } } as any, rep);

    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body).toBeInstanceOf(Error);
  });
});
