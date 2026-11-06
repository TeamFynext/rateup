import { describe, expect, it } from "vite-plus/test";

import { buildUploadFormData } from "./upload.ts";

describe("buildUploadFormData", () => {
  const file = new Blob(["hello"], { type: "text/plain" });

  it("puts surveyTeamMapId before the file part, which the API reads fields up to", () => {
    const keys = [...buildUploadFormData(file, { surveyTeamMapId: "abcd1234" }).keys()];
    expect(keys).toEqual(["metadata", "size", "surveyTeamMapId", "file"]);
  });

  it("omits surveyTeamMapId when there is none and keeps the file last", () => {
    const formData = buildUploadFormData(file, { allowAll: true });
    expect([...formData.keys()]).toEqual(["metadata", "size", "file"]);
    expect(formData.get("metadata")).toBe(JSON.stringify({ allowAll: true }));
    expect(formData.get("size")).toBe("5");
  });
});
