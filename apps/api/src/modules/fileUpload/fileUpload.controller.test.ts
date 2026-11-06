import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

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

vi.mock("./fileUpload.owner.js", () => {
  class UploadOwnerError extends Error {
    constructor(
      readonly statusCode: number,
      message: string,
    ) {
      super(message);
    }
  }
  return { UploadOwnerError, resolveUploadOwner: vi.fn() };
});

vi.mock("@ffmpeg-installer/ffmpeg", () => ({ default: { path: "/usr/bin/ffmpeg" } }));

vi.mock("fluent-ffmpeg", () => {
  const chain: any = {
    videoCodec: vi.fn(() => chain),
    audioChannels: vi.fn(() => chain),
    audioFrequency: vi.fn(() => chain),
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
import { Readable, Writable } from "node:stream";
import { deleteFile, uploadFile } from "../../utils/upload/s3Upload.js";
import { resolveUploadOwner, UploadOwnerError } from "./fileUpload.owner.js";
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

/** Leading bytes that pass the magic-byte check for each type the tests upload. */
const SIGNATURE: Record<string, Buffer> = {
  "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]),
  "application/pdf": Buffer.from("%PDF-1.7\n"),
  "audio/mpeg": Buffer.from("ID3\u0004\u0000\u0000\u0000\u0000"),
  "audio/ogg": Buffer.from("OggS\u0000\u0002\u0000\u0000"),
  "audio/mp4": Buffer.from("\u0000\u0000\u0000\u0018ftypM4A \u0000\u0000"),
  "video/mp4": Buffer.from("\u0000\u0000\u0000\u0018ftypisom\u0000\u0000"),
  "video/quicktime": Buffer.from("\u0000\u0000\u0000\u0014ftypqt  \u0000\u0000"),
};

function fileStream(content: Buffer, truncated = false) {
  const stream: any = Readable.from([content]);
  stream.truncated = truncated;
  vi.spyOn(stream, "resume");
  return stream;
}

/// A @fastify/multipart file part, in the shape req.file() resolves to.
function upload(over: Record<string, unknown> = {}) {
  const fields: Record<string, unknown> = (over.fields as any) ?? {};
  const mimetype = (over.mimetype as string) ?? "image/png";
  const content = (over.content as Buffer) ?? SIGNATURE[mimetype] ?? Buffer.from("raw");
  return {
    type: "file",
    filename: "photo.png",
    mimetype,
    file: fileStream(content),
    fields,
    toBuffer: vi.fn(async () => content),
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
  fsMock.createWriteStream.mockImplementation(
    () =>
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
  );
  (resolveUploadOwner as unknown as Mock).mockResolvedValue({ orgId: "org-1", anonymous: false });
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
    expect(params.Key).toMatch(/^org-1\/\d+-[0-9a-f]{8}-photo\.png$/);
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
    const part = upload({ file: fileStream(SIGNATURE["image/png"], true) });
    const rep = reply();

    await uploadController(request(part), rep);

    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "File size exceeds server limit." },
    });
  });

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

    expect(s3.uploadFile.mock.calls[0][0].Key).toMatch(
      /^org-1\/\d+-[0-9a-f]{8}-myphoto1\.\.etc\.png$/,
    );
  });
});

// ===========================================================================
// uploadController — the audio conversion branch
// ===========================================================================

describe("uploadController — audio conversion", () => {
  function audio(mimetype: string) {
    return upload({ mimetype, filename: "note.ogg" });
  }

  test("temp files are named by a uuid alone, never by the client's filename (INJ-5)", async () => {
    await uploadController(
      request(upload({ mimetype: "audio/mpeg", filename: "../../etc/passwd.mp3" })),
      reply(),
    );

    const paths = fsMock.createWriteStream.mock.calls.map((c: any[]) => String(c[0]));
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/tmp\/[0-9a-f-]{36}\.upload$/);
    expect(paths[0]).not.toContain("passwd");
  });

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

  test("reads and removes the converted file asynchronously", async () => {
    await uploadController(request(audio("audio/ogg")), reply());

    expect(fspMock.readFile).toHaveBeenCalled();
    expect(fspMock.unlink).toHaveBeenCalled();
    expect(fsMock.readFileSync).toBeUndefined();
  });
});

describe("uploadController — voice notes", () => {
  function voice(mimetype = "audio/mp4", query: Record<string, string> = { voice: "1" }) {
    const req = request(upload({ mimetype, filename: "voice-1.m4a" }));
    req.query = query;
    return req;
  }

  test("converts a recording to mono OGG/Opus and stores it as .ogg", async () => {
    const rep = reply();

    await uploadController(voice(), rep);

    expect(chain.audioCodec).toHaveBeenCalledWith("libopus");
    expect(chain.audioChannels).toHaveBeenCalledWith(1);
    expect(chain.format).toHaveBeenCalledWith("ogg");
    const params = s3.uploadFile.mock.calls[0][0];
    expect(params.ContentType).toBe("audio/ogg");
    expect(params.Key).toMatch(/-voice-1\.ogg$/);
    expect(answer(rep).body.data.key).toBe(params.Key);
  });

  test("without ?voice=1 the recording stays an M4A, as before", async () => {
    await uploadController(voice("audio/mp4", {}), reply());

    expect(chain.audioChannels).not.toHaveBeenCalled();
    expect(s3.uploadFile.mock.calls[0][0].ContentType).toBe("audio/mp4");
  });

  test("ignores ?voice=1 on a file that is not audio", async () => {
    const req = request(upload());
    req.query = { voice: "1" };

    await uploadController(req, reply());

    expect(ffmpeg).not.toHaveBeenCalled();
    expect(s3.uploadFile.mock.calls[0][0].ContentType).toBe("image/png");
  });

  test("answers 500 and removes both temp files when the conversion fails", async () => {
    chain.__shouldFail = true;
    const rep = reply();

    await uploadController(voice(), rep);

    expect(answer(rep).code).toBe(500);
    expect(s3.uploadFile).not.toHaveBeenCalled();
    expect(fspMock.unlink).toHaveBeenCalledTimes(2);
  });
});

describe("uploadController — video conversion", () => {
  function video(mimetype: string, filename = "IMG_0001.MOV") {
    return upload({ mimetype, filename });
  }

  test("re-encodes an iPhone .mov to H.264/AAC MP4 and stores it as one", async () => {
    const rep = reply();

    await uploadController(request(video("video/quicktime")), rep);

    expect(chain.videoCodec).toHaveBeenCalledWith("libx264");
    expect(chain.audioCodec).toHaveBeenCalledWith("aac");
    expect(chain.format).toHaveBeenCalledWith("mp4");
    const params = s3.uploadFile.mock.calls[0][0];
    expect(params.ContentType).toBe("video/mp4");
    // The key drops the underscore, as it does every character but letters, digits, dots and dashes.
    expect(params.Key).toMatch(/-IMG0001\.mp4$/);
    expect(params.Body).toEqual(Buffer.from("converted"));
    expect(answer(rep).body.data.key).toBe(params.Key);
  });

  test("re-encodes an MP4 too, since it may hold HEVC that WhatsApp refuses", async () => {
    await uploadController(request(video("video/mp4", "clip.mp4")), reply());

    expect(chain.videoCodec).toHaveBeenCalledWith("libx264");
    expect(s3.uploadFile.mock.calls[0][0].Key).toMatch(/-clip\.mp4$/);
  });

  test("answers 500 and removes both temp files when the transcode fails", async () => {
    chain.__shouldFail = true;
    const rep = reply();

    await uploadController(request(video("video/quicktime")), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
    expect(s3.uploadFile).not.toHaveBeenCalled();
    expect(fspMock.unlink).toHaveBeenCalledTimes(2);
  });

  test("leaves images untouched", async () => {
    await uploadController(request(upload()), reply());

    expect(ffmpeg).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// uploadController — the S3 result
// ===========================================================================

describe("uploadController — what it reports", () => {
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
    expect(body.data.thumbKey).toMatch(/^org-1\/thumb300x200-\d+-[0-9a-f]{8}-photo\.png$/);
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
  const session = (keys: string[]) =>
    ({
      body: { fileKeyArray: keys.map((Key) => ({ Key })) },
      actor: { orgId: "org-1" },
      user: { orgId: "org-1" },
    }) as any;

  test("deletes keys under the caller's org prefix", async () => {
    const rep = reply();

    await deleteUploadedFileController(session(["org-1/1700000000-photo.png"]), rep);

    expect(s3.deleteFile).toHaveBeenCalledWith({
      Bucket: expect.any(String),
      Delete: { Objects: [{ Key: "org-1/1700000000-photo.png" }] },
    });
    expect(answer(rep)).toEqual({ code: 200, body: { message: "File delete successfully" } });
  });

  test("refuses the whole batch when any key is outside the caller's org (SURV-1)", async () => {
    const rep = reply();

    await deleteUploadedFileController(
      session(["org-1/mine.png", "org-2/1700000001-another-orgs-contract.pdf", "legacy.png"]),
      rep,
    );

    expect(answer(rep).code).toBe(403);
    expect(answer(rep).body.keys).toEqual([
      "org-2/1700000001-another-orgs-contract.pdf",
      "legacy.png",
    ]);
    expect(s3.deleteFile).not.toHaveBeenCalled();
  });

  test("a prefix look-alike or traversal is not the caller's", async () => {
    const rep = reply();

    await deleteUploadedFileController(session(["org-1-evil/x.png", "org-1/../org-2/x"]), rep);

    expect(answer(rep).code).toBe(403);
    expect(s3.deleteFile).not.toHaveBeenCalled();
  });

  test("answers 401 without a session org", async () => {
    const rep = reply();

    await deleteUploadedFileController({ body: { fileKeyArray: [{ Key: "k" }] } } as any, rep);

    expect(answer(rep).code).toBe(401);
    expect(s3.deleteFile).not.toHaveBeenCalled();
  });

  test("answers 500 with a message when the delete fails", async () => {
    s3.deleteFile.mockRejectedValue(new Error("AccessDenied"));
    const rep = reply();

    await deleteUploadedFileController(session(["org-1/k"]), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Something went wrong" } });
  });
});

describe("upload ownership and content checks (SURV-11)", () => {
  test("refuses an upload whose bytes are not the type it claims", async () => {
    const rep = reply();

    await uploadController(
      request(upload({ mimetype: "image/png", content: Buffer.from("<html><script>") })),
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "File content does not match its type." },
    });
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  test("enforces the per-type cap on the bytes actually sent, not the declared size", async () => {
    const big = Buffer.concat([SIGNATURE["image/png"], Buffer.alloc(6 * 1024 * 1024)]);
    const rep = reply();

    await uploadController(request(upload({ content: big })), rep);

    expect(answer(rep).code).toBe(413);
  });

  test("an anonymous upload that names no live form is refused with the owner's status", async () => {
    (resolveUploadOwner as unknown as Mock).mockRejectedValueOnce(
      new UploadOwnerError(401, "Sign in, or upload from a survey form."),
    );
    const rep = reply();

    await uploadController(request(upload()), rep);

    expect(answer(rep).code).toBe(401);
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  test("an anonymous respondent's upload is keyed under the form's org", async () => {
    (resolveUploadOwner as unknown as Mock).mockResolvedValueOnce({
      orgId: "form-org",
      anonymous: true,
    });

    await uploadController(request(upload()), reply());

    expect(s3.uploadFile.mock.calls[0][0].Key).toMatch(/^form-org\//);
  });
});
