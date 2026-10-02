import type { MultipartFile } from "@fastify/multipart";

import { getMultipartFieldValue } from "../../utils/upload/validate.js";

/**
 * The form fields sent beside the file: `tags[n]` (custom field slugs, in order), `update`
 * (only the literal "true" turns it on) and `hasHeaderRow` (on unless it says "false").
 */
export function readImportFormFields(fields: MultipartFile["fields"]): {
  tags: string[];
  updateExisting: boolean;
  hasHeaderRow: boolean;
} {
  const tags: string[] = [];
  let updateExisting = false;
  let hasHeaderRow = true;
  for (const key in fields) {
    const value = getMultipartFieldValue(fields[key]);
    if (key.startsWith("tags[")) {
      if (typeof value === "string") tags.push(value);
    } else if (key === "update") {
      updateExisting = value === "true";
    } else if (key === "hasHeaderRow") {
      hasHeaderRow = value !== "false";
    }
  }
  return { tags, updateExisting, hasHeaderRow };
}
