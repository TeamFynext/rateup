import { beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.AWS_CLOUDFRONT_DOMAIN = "cdn.test.example";
  process.env.AWS_S3_BUCKET = "rateup-survey-uploads";
});

vi.mock("../../utils/prisma.js", () => ({
  default: {
    survey: { findFirst: vi.fn(), update: vi.fn() },
    generateQr: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../../utils/upload/s3Upload.js", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../survey/survey.auth.js", () => ({ verifySurveyAccess: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { uploadFile, deleteFile } from "../../utils/upload/s3Upload.js";
import { checkSession } from "../../utils/checkSession.js";
import { verifySurveyAccess } from "../survey/survey.auth.js";
import { getShareSettings, saveShareSettings } from "./shareSettings.service.js";
import { getSettings, updateSettings } from "./shareSettings.controller.js";
import { preHandlerHook } from "./shareSettings.hooks.js";
import shareSettingsRoutes from "./shareSettings.route.js";
import { bodySchema, paramsSchema, responseSchema } from "./shareSettings.schema.js";
import { deleteFileFromS3, onFile, uploadFileToS3 } from "./utils.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  survey: Record<string, Mock>;
  generateQr: Record<string, Mock>;
};

const ORG = "11111111-1111-1111-1111-111111111111";
const SURVEY = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const QR = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";

const settings = (over: Record<string, unknown> = {}) => ({
  qrBgColor: "#ffffff",
  qrColor: "#000000",
  logoSize: 40,
  logoFillType: "solid",
  logoBorderRadius: 8,
  ...over,
});

function req(over: any = {}) {
  return {
    params: { resourceName: "survey", id: SURVEY },
    body: settings(),
    user: { orgId: ORG },
    userId: "user-1",
    ...over,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.survey.findFirst.mockResolvedValue({ shareSettings: null });
  db.survey.update.mockResolvedValue({ shareSettings: settings() });
  db.generateQr.findFirst.mockResolvedValue({ id: QR, shareSettings: null });
  db.generateQr.update.mockResolvedValue({ id: QR, shareSettings: settings() });
  (uploadFile as unknown as Mock).mockResolvedValue({ Key: "uploaded-key.png" });
  (deleteFile as unknown as Mock).mockResolvedValue({ Deleted: [] });
});

// ===========================================================================
// Where the access check is, and what decides it
// ===========================================================================

describe("the resource switch", () => {
  // NOTE: the survey queries carry no org condition — the whole tenancy of that
  // path is the hook's `resourceName === "survey"` string comparison.
  test("the survey read is keyed on the id alone", async () => {
    await getShareSettings("survey", SURVEY, req());

    expect(db.survey.findFirst.mock.calls[0][0]).toEqual({
      where: { id: SURVEY },
      select: { shareSettings: true },
    });
  });

  test("the survey write is keyed on the id alone", async () => {
    await saveShareSettings("survey", SURVEY, settings(), req());

    expect(db.survey.update.mock.calls[0][0].where).toEqual({ id: SURVEY });
  });

  // NOTE: the QR case is the other way round — no hook check, but the query
  // constrains ownerOrgId itself.
  test("the QR read and write constrain the owning org", async () => {
    const request = req({ params: { resourceName: "generateQr", id: QR } });

    await getShareSettings("generateQr", QR, request);
    await saveShareSettings("generateQr", QR, settings(), request);

    expect(db.generateQr.findFirst.mock.calls[0][0].where).toEqual({
      id: QR,
      ownerOrgId: ORG,
    });
    expect(db.generateQr.update.mock.calls[0][0].where).toEqual({
      id: QR,
      ownerOrgId: ORG,
    });
  });

  // NOTE: the switch has no default, so an unrecognised name returns undefined
  // rather than falling through to a resource. That is what stops a mismatched
  // name reaching the unscoped survey queries — the accident, not the design.
  test("an unrecognised resource touches no table and returns undefined", async () => {
    await expect(getShareSettings("Survey", SURVEY, req())).resolves.toBeUndefined();
    await expect(saveShareSettings("Survey", SURVEY, settings(), req())).resolves.toBeUndefined();

    expect(db.survey.findFirst).not.toHaveBeenCalled();
    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("an absent resource name is treated the same way", async () => {
    await expect(getShareSettings(undefined, SURVEY, req())).resolves.toBeUndefined();
  });

  // NOTE: the params schema accepts any string and marks resourceName optional,
  // so the value the hook branches on is unconstrained.
  test("the params schema puts no constraint on the resource name", () => {
    expect(paramsSchema.safeParse({ id: SURVEY }).success).toBe(true);
    expect(paramsSchema.safeParse({ resourceName: "anything", id: SURVEY }).success).toBe(true);
  });
});

describe("preHandlerHook", () => {
  test("checks the session for every resource", async () => {
    await preHandlerHook(req({ params: { resourceName: "generateQr", id: QR } }), {} as never);

    expect(checkSession).toHaveBeenCalledOnce();
  });

  test("adds the survey access check only for the survey resource", async () => {
    await preHandlerHook(req(), {} as never);
    expect(verifySurveyAccess).toHaveBeenCalledOnce();

    vi.clearAllMocks();

    await preHandlerHook(req({ params: { resourceName: "generateQr", id: QR } }), {} as never);
    expect(verifySurveyAccess).not.toHaveBeenCalled();
  });

  test("the comparison is exact, so a differently cased name skips the check", async () => {
    await preHandlerHook(req({ params: { resourceName: "Survey", id: SURVEY } }), {} as never);

    expect(verifySurveyAccess).not.toHaveBeenCalled();
  });

  // NOTE: checkSession answers 401 by calling reply.send and returning, and the
  // hook carries on to verifySurveyAccess regardless.
  test("runs the survey check even after the session check has answered", async () => {
    (checkSession as unknown as Mock).mockImplementationOnce(async (_r: any, rep: any) => {
      rep.code(401);
      rep.send({ message: "Not authorized" });
    });
    const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };

    await preHandlerHook(req(), rep);

    expect(verifySurveyAccess).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// getSettings
// ===========================================================================

describe("getSettings", () => {
  test("turns a stored key into a CloudFront URL", async () => {
    db.survey.findFirst.mockResolvedValueOnce({
      shareSettings: settings({ logoFile: "abc.png" }),
    });

    const res = await getSettings(req(), {} as never);

    expect(res!.logoFile).toBe("https://cdn.test.example/abc.png");
  });

  test("leaves a null logo alone", async () => {
    db.survey.findFirst.mockResolvedValueOnce({ shareSettings: settings({ logoFile: null }) });

    const res = await getSettings(req(), {} as never);

    expect(res!.logoFile).toBeNull();
  });

  test("returns null when nothing has been configured", async () => {
    const res = await getSettings(req(), {} as never);

    expect(res).toBeNull();
  });

  // NOTE: the destructure has no guard, so a resource the switch does not know
  // throws rather than answering 404.
  test("throws for a resource the switch does not know", async () => {
    await expect(
      getSettings(req({ params: { resourceName: "linktree", id: SURVEY } }), {} as never),
    ).rejects.toThrow(TypeError);
  });

  test("throws when the row itself does not exist", async () => {
    db.survey.findFirst.mockResolvedValueOnce(null);

    await expect(getSettings(req(), {} as never)).rejects.toThrow(TypeError);
  });

  test("the response schema allows a null body", () => {
    expect(responseSchema.safeParse(null).success).toBe(true);
  });
});

// ===========================================================================
// updateSettings — the logo lifecycle
// ===========================================================================

describe("updateSettings", () => {
  const filePart = {
    fileBuffer: Buffer.from("png-bytes"),
    mimetype: "image/png",
    fileExtension: "png",
  };

  test("uploads a new file and stores the returned key", async () => {
    const res = await updateSettings(req({ body: settings({ logoFile: filePart }) }), {} as never);

    expect(uploadFile).toHaveBeenCalledOnce();
    expect(db.survey.update.mock.calls[0][0].data.shareSettings.logoFile).toBe("uploaded-key.png");
    expect(res).toBeDefined();
  });

  test("deletes the previous file when a new one is uploaded", async () => {
    db.survey.findFirst.mockResolvedValueOnce({
      shareSettings: settings({ logoFile: "old-key.png" }),
    });

    await updateSettings(req({ body: settings({ logoFile: filePart }) }), {} as never);

    expect((deleteFile as unknown as Mock).mock.calls[0][0].Delete.Objects).toEqual([
      { Key: "old-key.png" },
    ]);
  });

  test("keeps the existing key when no new file is sent", async () => {
    db.survey.findFirst.mockResolvedValueOnce({
      shareSettings: settings({ logoFile: "old-key.png" }),
    });

    await updateSettings(req({ body: settings({ logoFile: "old-key.png" }) }), {} as never);

    expect(uploadFile).not.toHaveBeenCalled();
    expect(db.survey.update.mock.calls[0][0].data.shareSettings.logoFile).toBe("old-key.png");
  });

  test("the string null clears the logo and deletes the old file", async () => {
    db.survey.findFirst.mockResolvedValueOnce({
      shareSettings: settings({ logoFile: "old-key.png" }),
    });

    await updateSettings(req({ body: settings({ logoFile: "null" }) }), {} as never);

    expect(db.survey.update.mock.calls[0][0].data.shareSettings.logoFile).toBeNull();
    expect(deleteFile).toHaveBeenCalledOnce();
  });

  // NOTE: uploadFile swallows its errors and resolves undefined (issues.txt
  // 24.3), so the key is null — and it is written through a template literal,
  // which stores the four-character string "null".
  test("a failed upload stores the literal string null", async () => {
    (uploadFile as unknown as Mock).mockResolvedValueOnce(undefined);

    await updateSettings(req({ body: settings({ logoFile: filePart }) }), {} as never);

    expect(db.survey.update.mock.calls[0][0].data.shareSettings.logoFile).toBe("null");
  });

  test("and the save still reports success", async () => {
    (uploadFile as unknown as Mock).mockResolvedValueOnce(undefined);
    db.survey.update.mockResolvedValueOnce({ shareSettings: settings({ logoFile: "null" }) });

    const res = await updateSettings(req({ body: settings({ logoFile: filePart }) }), {} as never);

    expect(res!.logoFile).toBe("https://cdn.test.example/null");
  });

  // NOTE: that stored "null" is truthy, so the next update treats it as a real
  // S3 key and asks the bucket to delete an object called "null".
  test("the next update tries to delete an object named null", async () => {
    db.survey.findFirst.mockResolvedValueOnce({ shareSettings: settings({ logoFile: "null" }) });

    await updateSettings(req({ body: settings({ logoFile: filePart }) }), {} as never);

    expect((deleteFile as unknown as Mock).mock.calls[0][0].Delete.Objects).toEqual([
      { Key: "null" },
    ]);
  });

  // NOTE: neither delete call is awaited, and deleteFile returns its error
  // rather than throwing (issues.txt 24.3) — so a failed cleanup is invisible.
  test("a delete failure does not disturb the save", async () => {
    db.survey.findFirst.mockResolvedValueOnce({
      shareSettings: settings({ logoFile: "old-key.png" }),
    });
    (deleteFile as unknown as Mock).mockResolvedValueOnce(new Error("AccessDenied"));

    await expect(
      updateSettings(req({ body: settings({ logoFile: filePart }) }), {} as never),
    ).resolves.toBeDefined();
  });

  test("writes the whole validated body as the settings object", async () => {
    await updateSettings(req({ body: settings({ isLogoEnabled: true }) }), {} as never);

    expect(db.survey.update.mock.calls[0][0].data.shareSettings).toMatchObject({
      qrBgColor: "#ffffff",
      qrColor: "#000000",
      isLogoEnabled: true,
    });
  });

  test("reads the old settings before writing the new ones", async () => {
    await updateSettings(req(), {} as never);

    expect(db.survey.findFirst).toHaveBeenCalledOnce();
    expect(db.survey.update).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// The upload helpers
// ===========================================================================

describe("uploadFileToS3", () => {
  test("names the object with a random uuid and the caller's extension", async () => {
    await uploadFileToS3(Buffer.from("x"), "image/png", "png");

    const params = (uploadFile as unknown as Mock).mock.calls[0][0];
    expect(params.Key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(params.Bucket).toBe("rateup-survey-uploads");
  });

  // NOTE: the extension comes from the uploaded filename and the content type
  // from the part's own header — neither is checked against an allowlist, and
  // both are stored on the object that CloudFront then serves.
  test("stores the caller's content type and extension unchecked", async () => {
    await uploadFileToS3(Buffer.from("x"), "text/html", "html");

    const params = (uploadFile as unknown as Mock).mock.calls[0][0];
    expect(params.ContentType).toBe("text/html");
    expect(params.Key.endsWith(".html")).toBe(true);
  });

  test("returns null when the upload helper swallows a failure", async () => {
    (uploadFile as unknown as Mock).mockResolvedValueOnce(undefined);

    await expect(uploadFileToS3(Buffer.from("x"), "image/png", "png")).resolves.toBeNull();
  });

  test("deleteFileFromS3 targets the named bucket and keys", async () => {
    await deleteFileFromS3([{ Key: "a.png" }, { Key: "b.png" }]);

    expect(deleteFile).toHaveBeenCalledWith({
      Bucket: "rateup-survey-uploads",
      Delete: { Objects: [{ Key: "a.png" }, { Key: "b.png" }] },
    });
  });
});

describe("onFile", () => {
  test("buffers the part and derives the extension from the filename", async () => {
    const part: any = {
      filename: "logo.PNG",
      fieldname: "logoFile",
      mimetype: "image/png",
      toBuffer: vi.fn(async () => Buffer.from("bytes")),
    };

    await onFile(part);

    expect(part.value.fileExtension).toBe("PNG");
    expect(part.value.mimetype).toBe("image/png");
    expect(part.value.fileBuffer).toBeInstanceOf(Buffer);
  });

  // NOTE: the extension is the last dot-segment of a caller-supplied filename,
  // with no allowlist and no fallback.
  test("takes whatever follows the last dot", async () => {
    const part: any = {
      filename: "payload.svg",
      fieldname: "logoFile",
      mimetype: "image/svg+xml",
      toBuffer: vi.fn(async () => Buffer.from("<svg/>")),
    };

    await onFile(part);

    expect(part.value.fileExtension).toBe("svg");
  });

  test("a filename with no dot becomes its own extension", async () => {
    const part: any = {
      filename: "logo",
      fieldname: "logoFile",
      mimetype: "image/png",
      toBuffer: vi.fn(async () => Buffer.from("bytes")),
    };

    await onFile(part);

    expect(part.value.fileExtension).toBe("logo");
  });

  test("nothing inspects the buffer's size or content", async () => {
    const part: any = {
      filename: "big.png",
      fieldname: "logoFile",
      mimetype: "image/png",
      toBuffer: vi.fn(async () => Buffer.alloc(10 * 1024 * 1024)),
    };

    await expect(onFile(part)).resolves.toBeUndefined();
    expect(part.value.fileBuffer).toHaveLength(10 * 1024 * 1024);
  });
});

// ===========================================================================
// The body schema
// ===========================================================================

describe("bodySchema", () => {
  test("requires the five colour and layout fields", () => {
    expect(bodySchema.safeParse({ qrBgColor: "#fff" }).success).toBe(false);
    expect(bodySchema.safeParse(settings()).success).toBe(true);
  });

  test("coerces the numeric fields multipart sends as strings", () => {
    const parsed = bodySchema.safeParse({
      qrBgColor: "#fff",
      qrColor: "#000",
      logoSize: "40",
      logoFillType: "solid",
      logoBorderRadius: "8",
    });

    expect(parsed.success).toBe(true);
    expect((parsed as any).data.logoSize).toBe(40);
  });

  // NOTE: z.coerce.boolean() makes every non-empty string true, so the literal
  // "false" a form sends enables the logo.
  test("coerces the string false to true", () => {
    const parsed = bodySchema.safeParse(settings({ isLogoEnabled: "false" }));

    expect((parsed as any).data.isLogoEnabled).toBe(true);
  });

  test("the colour fields accept any string, not a colour", () => {
    expect(bodySchema.safeParse(settings({ qrColor: "not-a-colour" })).success).toBe(true);
  });

  test("logoFile accepts a loose object or a string", () => {
    expect(bodySchema.safeParse(settings({ logoFile: { anything: 1 } })).success).toBe(true);
    expect(bodySchema.safeParse(settings({ logoFile: "existing-key.png" })).success).toBe(true);
    expect(bodySchema.safeParse(settings({ logoFile: null })).success).toBe(false);
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("shareSettingsRoutes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const registered: any[] = [];
    const srv: any = {
      register: vi.fn((plugin, opts) => registered.push({ plugin, opts })),
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    };
    return { srv, routes, hooks, registered };
  }

  test("guards both routes with the module's own hook", async () => {
    const { srv, hooks } = fakeServer();

    await shareSettingsRoutes(srv);

    expect(hooks).toEqual([{ name: "preHandler", fn: preHandlerHook }]);
  });

  test("registers a read and a write on the same path", async () => {
    const { srv, routes } = fakeServer();

    await shareSettingsRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /:resourceName/:id",
      "PUT /:resourceName/:id",
    ]);
  });

  test("registers multipart with the module's own file handler", async () => {
    const { srv, registered } = fakeServer();

    await shareSettingsRoutes(srv);

    expect(registered[0].opts).toMatchObject({ attachFieldsToBody: "keyValues", onFile });
  });

  // NOTE: no limits are passed to the multipart plugin — no fileSize, no files,
  // no fieldSize.
  test("passes no multipart limits", async () => {
    const { srv, registered } = fakeServer();

    await shareSettingsRoutes(srv);

    expect(registered[0].opts.limits).toBeUndefined();
  });

  test("both routes declare a response schema", async () => {
    const { srv, routes } = fakeServer();

    await shareSettingsRoutes(srv);

    for (const r of routes) {
      expect(r.opts.schema.response["2xx"]).toBe(responseSchema);
    }
  });

  test("no route declares a role requirement", async () => {
    const { srv, routes } = fakeServer();

    await shareSettingsRoutes(srv);

    for (const r of routes) {
      expect(r.opts.preHandler).toBeUndefined();
    }
  });
});
