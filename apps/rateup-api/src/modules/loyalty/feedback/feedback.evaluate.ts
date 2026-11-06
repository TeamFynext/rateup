import { findOverallRatingElement, ratingElements } from "../../whatsapp/flows/flowTemplates.js";

/**
 * Reads star ratings back out of v2 flow answers. Whether a run counts as *happy* is not
 * decided here — that stays with `shouldShowGoogleReviewV2`, so a feedback flow and any
 * other flow use one rule — this only extracts the numbers the results screen shows.
 */

/** A v2 answer: element name and the raw value Meta sent. `SurveyResponse.responses` rows. */
export interface FlowAnswer {
  questionId: string;
  response: unknown;
}

/** A rating choice id ("1".."5") as a number, or null for anything else. */
export function parseRating(value: unknown): number | null {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== "string" && typeof text !== "number") return null;
  const rating = Number.parseInt(String(text), 10);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

export function extractOverallRating(json: WaFlowJson, answers: FlowAnswer[]): number | null {
  const element = findOverallRatingElement(json);
  if (!element?.name) return null;
  const answer = answers.find((a) => a.questionId === element.name);
  return answer ? parseRating(answer.response) : null;
}

export interface RatingAverage {
  elementId: string;
  title: string;
  average: number | null;
  count: number;
}

/**
 * Mean rating per rating element across many responses. Elements nobody has rated are
 * still listed (with `average: null`) so the results screen shows every question.
 */
export function ratingAveragesByElement(
  json: WaFlowJson,
  responseSets: FlowAnswer[][],
): RatingAverage[] {
  return ratingElements(json).map((element) => {
    const name = element.name ?? element.id ?? "";
    let sum = 0;
    let count = 0;
    for (const answers of responseSets) {
      const answer = answers.find((a) => a.questionId === name);
      const rating = answer ? parseRating(answer.response) : null;
      if (rating === null) continue;
      sum += rating;
      count += 1;
    }
    return {
      elementId: name,
      title: element.label ?? name,
      average: count ? Math.round((sum / count) * 100) / 100 : null,
      count,
    };
  });
}
