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
import {
  bodySchema,
  paramsSchema,
  responseSchema,
  SHARE_SETTINGS_RESOURCES,
} from "./shareSettings.schema.js";
import {
  ALLOWED_LOGO_TYPES,
  deleteFileFromS3,
  LogoUploadError,
  MAX_LOGO_BYTES,
  onFile,
  uploadFileToS3,
} from "./utils.js";

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
  const scopedToOrg = {
    id: SURVEY,
    OR: [{ orgId: ORG }, { teams: { some: { team: { orgId: ORG } } } }],
  };

  // The survey queries carried no org condition, and the whole tenancy of that
  // path was the hook's `resourceName === "survey"` string comparison — a
  // coincidence of two files agreeing rather than a check. The generateQr branch
  // beside it already scoped itself.
  test("the survey read is scoped to the caller's org", async () => {
    await getShareSettings("survey", SURVEY, req());

    expect(db.survey.findFirst.mock.calls[0][0]).toEqual({
      where: scopedToOrg,
      select: { shareSettings: true },
    });
  });

  test("the survey write is scoped to the caller's org", async () => {
    await saveShareSettings("survey", SURVEY, settings(), req());

    expect(db.survey.update.mock.calls[0][0].where).toEqual(scopedToOrg);
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

  // The params schema accepted any string and marked resourceName optional, so
  // the value the hook branched on was unconstrained — a differently cased name
  // or a missing one reached the service, where only the absence of a `default:`
  // case stopped it touching a table. The enum is now the gate.
  test("the params schema constrains the resource name to the two the switch knows", () => {
    expect(paramsSchema.safeParse({ id: SURVEY }).success).toBe(false);
    expect(paramsSchema.safeParse({ resourceName: "anything", id: SURVEY }).success).toBe(false);
    expect(paramsSchema.safeParse({ resourceName: "Survey", id: SURVEY }).success).toBe(false);
    expect(paramsSchema.safeParse({ resourceName: "survey", id: SURVEY }).success).toBe(true);
    expect(paramsSchema.safeParse({ resourceName: "generateQr", id: QR }).success).toBe(true);
  });

  test("the enum names exactly the cases the service handles", () => {
    expect([...SHARE_SETTINGS_RESOURCES]).toEqual(["survey", "generateQr"]);
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

  // The comparison is still exact, but a differently cased name no longer
  // reaches the hook at all — the params enum rejects it first. This pins that
  // the hook alone is not the defence.
  test("the comparison is exact, so a differently cased name skips the check", async () => {
    await preHandlerHook(req({ params: { resourceName: "Survey", id: SURVEY } }), {} as never);

    expect(verifySurveyAccess).not.toHaveBeenCalled();
  });

  // checkSession answers 401 by calling reply.send and returning rather than
  // throwing, and the hook used to carry on to verifySurveyAccess regardless —
  // producing a duplicate-send warning on every rejected request.
  test("stops once the session check has answered", async () => {
    (checkSession as unknown as Mock).mockImplementationOnce(async (_r: any, rep: any) => {
      rep.code(401);
      rep.send({ message: "Not authorized" });
      rep.sent = true;
    });
    const rep: any = { sent: false, code: vi.fn(() => rep), send: vi.fn(() => rep) };

    await preHandlerHook(req(), rep);

    expect(verifySurveyAccess).not.toHaveBeenCalled();
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

  // NOTE: the destructure has no guard, so a row the caller cannot reach throws
  // rather than answering 404. A resource the switch does not know can no longer
  // get this far — the params enum rejects it at the route.
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

  // uploadFileToS3 used to yield null when the upload returned no key, and the
  // controller wrote it through a template literal — storing the four-character
  // string "null", a truthy value the read turned into `https://cdn/null` and the
  // NEXT update handed to S3 as a key to delete. Nothing distinguished it from a
  // real key, so the state was sticky.
  test("a failed upload fails the save rather than storing the string null", async () => {
    (uploadFile as unknown as Mock).mockResolvedValueOnce(undefined);

    await expect(
      updateSettings(req({ body: settings({ logoFile: filePart }) }), {} as never),
    ).rejects.toBeInstanceOf(LogoUploadError);
    expect(db.survey.update).not.toHaveBeenCalled();
  });

  test("an upload that returns no key throws from the helper", async () => {
    (uploadFile as unknown as Mock).mockResolvedValueOnce({});

    await expect(uploadFileToS3(Buffer.from("x"), "image/png", "png")).rejects.toBeInstanceOf(
      LogoUploadError,
    );
  });

  // The delete calls used to float, so a rejection inside deleteFileFromS3 would
  // surface as an unhandled rejection rather than a failed request. They are
  // awaited now, and the helper still swallows the failure so cleanup cannot
  // fail the save.
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
  test("names the object with a random uuid and the allowlisted extension", async () => {
    await uploadFileToS3(Buffer.from("x"), "image/png", "png");

    const params = (uploadFile as unknown as Mock).mock.calls[0][0];
    expect(params.Key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(params.Bucket).toBe("rateup-survey-uploads");
  });

  test("returns the key the upload reported", async () => {
    await expect(uploadFileToS3(Buffer.from("x"), "image/png", "png")).resolves.toBe(
      "uploaded-key.png",
    );
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
  const part = (over: Record<string, unknown> = {}) =>
    ({
      filename: "logo.PNG",
      fieldname: "logoFile",
      mimetype: "image/png",
      toBuffer: vi.fn(async () => Buffer.from("bytes")),
      ...over,
    }) as any;

  // The content type came from the part's own header and the extension from the
  // last dot-segment of a caller-supplied filename — neither checked against an
  // allowlist, both written onto an object served from CloudFront, so text/html
  // with a .html extension was accepted as readily as image/png. And a filename
  // with no dot became its own extension.
  test("derives the extension from the allowlisted type, not the filename", async () => {
    const p = part();

    await onFile(p);

    expect(p.value.fileExtension).toBe("png");
    expect(p.value.mimetype).toBe("image/png");
    expect(p.value.fileBuffer).toBeInstanceOf(Buffer);
  });

  test("a filename with no dot no longer becomes its own extension", async () => {
    const p = part({ filename: "logo" });

    await onFile(p);

    expect(p.value.fileExtension).toBe("png");
  });

  test("refuses a type that is not an image", async () => {
    for (const mimetype of ["text/html", "application/pdf", "application/octet-stream"]) {
      await expect(onFile(part({ mimetype }))).rejects.toBeInstanceOf(LogoUploadError);
    }
  });

  test("the allowlist is the image types the widget renders", () => {
    expect(Object.keys(ALLOWED_LOGO_TYPES)).toEqual([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ]);
  });

  // The part was fully buffered in memory before anything looked at it, and the
  // multipart plugin was registered with no limits — a large upload was an
  // allocation of that size per request.
  test("refuses a buffer larger than the limit", async () => {
    const p = part({ toBuffer: vi.fn(async () => Buffer.alloc(MAX_LOGO_BYTES + 1)) });

    await expect(onFile(p)).rejects.toBeInstanceOf(LogoUploadError);
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

  // z.coerce.boolean() makes every non-empty string true, and multipart sends
  // booleans as strings — so a form posting `isLogoEnabled=false` stored true
  // and turning the logo off did not turn it off.
  test("reads the literal strings multipart sends", () => {
    expect(
      (bodySchema.safeParse(settings({ isLogoEnabled: "false" })) as any).data.isLogoEnabled,
    ).toBe(false);
    expect(
      (bodySchema.safeParse(settings({ isLogoEnabled: "true" })) as any).data.isLogoEnabled,
    ).toBe(true);
    expect(
      (bodySchema.safeParse(settings({ isLogoEnabled: false })) as any).data.isLogoEnabled,
    ).toBe(false);
    expect(bodySchema.safeParse(settings({ isLogoEnabled: "yes" })).success).toBe(false);
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

  // No limits were passed to the multipart plugin — no fileSize, no files, no
  // fieldSize.
  test("bounds the multipart request", async () => {
    const { srv, registered } = fakeServer();

    await shareSettingsRoutes(srv);

    expect(registered[0].opts.limits).toMatchObject({ fileSize: MAX_LOGO_BYTES, files: 1 });
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
