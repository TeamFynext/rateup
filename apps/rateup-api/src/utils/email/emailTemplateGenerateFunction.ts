import { QuestionType } from "../../types/enums.js";

/**
 * One rendered piece of a survey answer. A single answer can produce several —
 * a testimonial, for instance, becomes one item per field.
 */
export interface EmailAnswerItem {
  /** Sub-field name, when the answer is an object of several fields. */
  label?: string;
  text?: string;
  imageUrl?: string;
}

function imageUrl(path: string, s3Upload = false): string {
  const base = s3Upload
    ? process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL
    : process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL;
  return `${base}/${path}`;
}

/** The first value of an object, which is how single-field answers are stored. */
function firstValue(value: object): unknown {
  return Object.values(value)[0];
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? String(firstValue(value) ?? "") : String(value);
}

/**
 * Turn a stored answer into items the response email can render.
 *
 * This used to build an HTML fragment that was interpolated into the template
 * unescaped; returning data instead lets React escape respondent-supplied text.
 * An empty array means there is nothing worth showing for the question.
 */
export function buildEmailAnswer(answer: unknown, type: QuestionType | string): EmailAnswerItem[] {
  if (answer === null || answer === undefined || answer === "") return [];

  if (Array.isArray(answer)) {
    return answer.map((item) => ({ text: asText(item) })).filter((item) => item.text.length > 0);
  }

  if (type === QuestionType.PCQ && typeof answer === "object") {
    const item = firstValue(answer);
    if (item && typeof item === "object") {
      const { image, value } = item as { image?: string; value?: unknown };
      return [
        {
          text: value === undefined ? undefined : String(value),
          imageUrl: image ? imageUrl(image, true) : undefined,
        },
      ];
    }
    return [];
  }

  if (typeof answer === "object") {
    const entries = Object.entries(answer);
    if (entries.length > 1) {
      return entries.map(([key, value]) =>
        key === "photo" && typeof value === "string"
          ? { label: key, imageUrl: imageUrl(value) }
          : { label: key, text: asText(value) },
      );
    }
    const text = asText(answer);
    return text ? [{ text }] : [];
  }

  if (type === "Photo" && typeof answer === "string") {
    return [{ imageUrl: imageUrl(answer) }];
  }

  return [{ text: String(answer) }];
}
