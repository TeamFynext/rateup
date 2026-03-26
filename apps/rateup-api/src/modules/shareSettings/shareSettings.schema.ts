import z from "zod";

const paramsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    resourceName: { type: "string" },
    id: { type: "string" },
  },
};

const bodySchema = {
  type: "object",
  required: [
    "logoSize",
    "logoFillType",
    "logoBorderRadius",
    "qrBgColor",
    "qrColor",
  ],
  properties: {
    qrBgColor: { type: "string" },
    qrColor: { type: "string" },
    logoSize: { type: "number" },
    logoFillType: { type: "string" },
    logoBorderRadius: { type: "number" },
    logoFile: {
      anyOf: [{ type: "object" }, { type: "string" }],
    },
    isLogoEnabled: { type: "boolean" },
  },
};

const responseSchema = {
  "2xx": z.fromJSONSchema({
    type: "object",
    properties: {
      qrBgColor: { type: "string" },
      qrColor: { type: "string" },
      logoSize: { type: "number" },
      logoFillType: { type: "string" },
      logoBorderRadius: { type: "number" },
      logoFile: {
        type: "string",
        nullable: true,
      },
      isLogoEnabled: { type: "boolean" },
    },
    nullable: true,
  }),
};

const getSettingsSchema = {
  params: z.fromJSONSchema(paramsSchema as any),
  response: responseSchema,
};

const saveAndUpdateSettingsSchema = {
  consumes: ["multipart/form-data"],
  ...getSettingsSchema,
  body: z.fromJSONSchema(bodySchema as any),
};

export { getSettingsSchema, saveAndUpdateSettingsSchema };
