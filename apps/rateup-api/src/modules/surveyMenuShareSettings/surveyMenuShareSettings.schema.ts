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
  "2xx": {
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
  },
};

const getSettingsSchema = {
  params: paramsSchema,
  response: responseSchema,
};

const saveAndUpdateSettingsSchema = {
  consumes: ["multipart/form-data"],
  ...getSettingsSchema,
  body: bodySchema,
};

export { getSettingsSchema, saveAndUpdateSettingsSchema };
