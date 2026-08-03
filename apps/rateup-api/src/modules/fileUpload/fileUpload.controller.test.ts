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
    createWriteStream: vi.fn(),
  },
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile: vi.fn(), unlink: vi.fn() },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
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
import fsp from "node:fs/promises";
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
const fspMock = fsp as unknown as Record<string, Mock>;
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
  fspMock.readFile.mockResolvedValue(Buffer.from("converted"));
  fspMock.unlink.mockResolvedValue(undefined);
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
    expect(params.Key).toMatch(/^\d+-[0-9a-f]{8}-photo\.png$/);
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

  // `allowAll` used to be read from a `metadata` FORM FIELD the uploader controls,
  // and validateFile returns `{ valid: true }` as its very first statement when it
  // is set — before the type check and before the size check. On an unauthenticated
  // endpoint that was the uploader switching the allowlist off, so anything up to
  // the 100 MB multipart limit went into the company's bucket. The field is not
  // read at all now.
  test("ignores an uploader's attempt to switch off the checks", async () => {
    const part = upload({
      mimetype: "text/html",
      filename: "payload.html",
      fields: { metadata: { value: '{"allowAll":true}' } },
    });
    const rep = reply();

    await uploadController(request(part), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { message: "Unsupported file type." } });
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  // The parse of that field was unguarded and ran before the handler's try/catch,
  // so a malformed value escaped as an unhandled rejection rather than a 400.
  // There is no parse left to fail.
  test("ignores malformed metadata rather than crashing on it", async () => {
    const part = upload({ fields: { metadata: { value: "{not json" } } });
    const rep = reply();

    await uploadController(request(part), rep);

    expect(answer(rep).code).toBe(200);
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

    expect(s3.uploadFile.mock.calls[0][0].Key).toMatch(/^\d+-[0-9a-f]{8}-myphoto1\.\.etc\.png$/);
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

    expect(fspMock.unlink).toHaveBeenCalledTimes(2);
  });

  // The conversion — the pump to disk and the ffmpeg run — used to sit OUTSIDE the
  // try/catch, so a transcode failure escaped the handler as an unhandled rejection
  // instead of a 500; and because the cleanup keyed off params.ContentType, which is
  // only reassigned after a SUCCESSFUL convert, both temp files were left behind.
  // Every failed audio upload leaked two files on a public endpoint.
  test("answers 500 and removes both temp files when the transcode fails", async () => {
    chain.__shouldFail = true;
    const rep = reply();

    await uploadController(request(audio("audio/mpeg")), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
    expect(fspMock.unlink).toHaveBeenCalledTimes(2);
  });

  test("a temp file that is already gone does not mask the real error", async () => {
    chain.__shouldFail = true;
    fspMock.unlink.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    const rep = reply();

    await uploadController(request(audio("audio/mpeg")), rep);

    expect(answer(rep).code).toBe(500);
  });

  // The converted file was read with readFileSync and the temp files removed with
  // unlinkSync — synchronous calls on a file as large as the multipart limit allows,
  // blocking the event loop for every other request.
  test("reads and removes the converted file asynchronously", async () => {
    await uploadController(request(audio("audio/ogg")), reply());

    expect(fspMock.readFile).toHaveBeenCalled();
    expect(fspMock.unlink).toHaveBeenCalled();
    expect(fsMock.readFileSync).toBeUndefined();
  });
});

// ===========================================================================
// uploadController — the S3 result
// ===========================================================================

describe("uploadController — what it reports", () => {
  // s3Upload.uploadFile used to swallow its own errors — `catch (e) {
  // console.log(e) }` with no rethrow — and resolve to undefined, so the
  // controller's try/catch could never fire for an S3 failure: it answered 200
  // "File uploaded successfully" with `fileUrl: undefined`, and the client saved
  // that key as a broken reference. The helper propagates now.
  test("answers 500 with a message when the S3 upload fails", async () => {
    s3.uploadFile.mockRejectedValue(new Error("network down"));
    const rep = reply();

    await uploadController(request(upload()), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
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
    expect(body.data.thumbKey).toMatch(/^thumb300x200-\d+-[0-9a-f]{8}-photo\.png$/);
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

  // The endpoint used to accept every type validateFile permits — PDFs and videos
  // included — and hand the bytes straight to sharp, which threw "unsupported image
  // format" outside any try/catch. It refuses non-images up front now, which also
  // bounds what the buffering below can hold.
  test("refuses a non-image before sharp ever sees it", async () => {
    const part = upload({ mimetype: "application/pdf", filename: "doc.pdf" });
    const rep = reply();

    await uploadWithThumbnailsController(request(part), rep);

    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "This endpoint accepts images only." },
    });
    expect(sharp).not.toHaveBeenCalled();
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  test("still 500s rather than escaping if sharp fails on an image", async () => {
    (sharp as unknown as Mock).mockImplementation(() => {
      throw new Error("Input buffer contains unsupported image format");
    });
    const rep = reply();

    await uploadWithThumbnailsController(request(upload()), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
  });

  // The thumbnail is webp bytes; it used to be stored with the ORIGINAL file's
  // mimetype, so a JPEG upload produced webp served as image/jpeg.
  test("labels the webp thumbnail as webp", async () => {
    await uploadWithThumbnailsController(
      request(upload({ mimetype: "image/jpeg", filename: "photo.jpg" })),
      reply(),
    );

    const thumbParams = s3.uploadFile.mock.calls[0][0];
    expect(thumbParams.Key).toContain("thumb300x200-");
    expect(thumbParams.ContentType).toBe("image/webp");
    expect(s3.uploadFile.mock.calls[1][0].ContentType).toBe("image/jpeg");
  });

  // NOTE: still buffered. Both the original and the thumbnail need the same bytes,
  // so one of the two has to be materialised; the image-only check above is what
  // bounds it.
  test("buffers the whole upload into memory first", async () => {
    const part = upload();

    await uploadWithThumbnailsController(request(part), reply());

    expect(part.toBuffer).toHaveBeenCalled();
  });

  test("answers 500 with a message when an upload rejects", async () => {
    s3.uploadFile.mockRejectedValue(new Error("network down"));
    const rep = reply();

    await uploadWithThumbnailsController(request(upload()), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
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

  // NOTE: STILL OPEN — the most serious finding in the module. The route is PUT
  // /api/public/upload/file/delete and carries no checkSession, so an anonymous
  // caller can hand it any array of keys and have them deleted from the shared
  // bucket. It is rate limited per IP now, which bounds the bulk of it, but closing
  // it means authenticating the route (and org-scoping the keys, which are
  // `${Date.now()}-${uuid}-${filename}` and carry no owner) — a decision about what
  // the widget is allowed to do.
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

  // s3Upload.deleteFile used to RETURN its caught error rather than throw
  // (`catch (err) { return err }`), so the controller's try/catch never fired and
  // every delete — including one S3 refused — answered 200 "File delete
  // successfully".
  test("answers 500 with a message when the delete fails", async () => {
    s3.deleteFile.mockRejectedValue(new Error("AccessDenied"));
    const rep = reply();

    await deleteUploadedFileController({ body: { fileKeyArray: [{ Key: "k" }] } } as any, rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
  });
});
