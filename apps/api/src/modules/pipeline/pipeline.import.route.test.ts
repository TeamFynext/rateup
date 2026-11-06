import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({ default: {} }));
vi.mock("./pipeline.auth.js", () => {
  const pass = vi.fn(async () => {});
  return {
    verifyLabelAccess: pass,
    verifyLostReasonAccess: pass,
    verifyOwnerForDelete: pass,
    verifyOwnerForTeamChange: pass,
    verifyPipelineAccess: pass,
    verifyPipelineAccessFromBody: pass,
    verifyPipelineAccessFromQuery: pass,
  };
});
vi.mock("./pipelineLead/lead.import.js", () => ({
  importLeads: vi.fn(async () => ({ created: 2, skipped: [] })),
  buildImportTemplate: vi.fn(),
  LeadImportFileError: class extends Error {},
}));

import { importLeads } from "./pipelineLead/lead.import.js";
import { pipelineRoutes } from "./pipeline.route.js";

const PIPELINE = "33333333-3333-4333-8333-333333333333";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function app() {
  const server = Fastify();
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);
  server.addHook("onRequest", async (request) => {
    request.userId = "u1";
  });
  await server.register(pipelineRoutes);
  return server;
}

function multipart(filename: string, contentType: string, content: Buffer) {
  const boundary = "----rateup-test";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /:id/import", () => {
  // The upload is a real multipart request, so the route's module must register the parser.
  test("accepts an Excel upload and hands the file to the importer", async () => {
    const upload = multipart("board import.xlsx", XLSX, Buffer.from("xlsx-bytes"));

    const res = await (
      await app()
    ).inject({
      method: "POST",
      url: `/${PIPELINE}/import`,
      headers: { "content-type": upload.contentType },
      payload: upload.body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ created: 2, skipped: [] });
    expect(vi.mocked(importLeads).mock.calls[0][0]).toMatchObject({
      pipelineId: PIPELINE,
      userId: "u1",
      mimetype: XLSX,
    });
  });

  test("refuses a file that is not a spreadsheet", async () => {
    const upload = multipart("photo.png", "image/png", Buffer.from("png"));

    const res = await (
      await app()
    ).inject({
      method: "POST",
      url: `/${PIPELINE}/import`,
      headers: { "content-type": upload.contentType },
      payload: upload.body,
    });

    expect(res.statusCode).toBe(400);
    expect(importLeads).not.toHaveBeenCalled();
  });
});
