import { QuestionType2, SmileyResponse2, WaQuestions } from "@/components/flow/enum";
import { type Sentiment, scale10, scale5 } from "@/constants/sentimentScale";

const SMILEY_STEP: Record<string, number> = {
  "very sad": 1,
  sad: 2,
  neutral: 3,
  happy: 4,
  "very happy": 5,
  [SmileyResponse2.VerySad]: 1,
  [SmileyResponse2.Sad]: 2,
  [SmileyResponse2.Neutral]: 3,
  [SmileyResponse2.Happy]: 4,
  [SmileyResponse2.VeryHappy]: 5,
};

const POSITIVE = new Set(["yes", "like", "👍"]);

/**
 * The answer's colour on the sentiment scale, as rateup-ui's `getResponseArrayByQuestionType`
 * picks it; null for a question with no scale (choices, text), which then wears the brand.
 * A v2 flow reports a choice by its title, so `scaleValue` is its data-source id when known.
 */
export function scaleColor(
  type: string | undefined,
  scaleValue: string,
  s: Sentiment,
): string | null {
  const key = scaleValue.trim().toLowerCase();
  switch (type) {
    case QuestionType2.Rating:
    case WaQuestions.Rating: {
      const step = Number.parseInt(key, 10) || (scaleValue.match(/⭐/g)?.length ?? 0);
      return scale5(s)[step - 1] ?? null;
    }
    case QuestionType2.Opinion:
    case WaQuestions.Opinion:
      return scale10(s)[Number.parseInt(key, 10) - 1] ?? null;
    case QuestionType2.Smiley:
    case WaQuestions.Smiley: {
      const step = SMILEY_STEP[key] ?? Number.parseInt(key, 10);
      return scale5(s)[step - 1] ?? null;
    }
    case QuestionType2.YN:
    case WaQuestions.YN:
    case QuestionType2.LD:
    case WaQuestions.LD:
      return POSITIVE.has(key) ? s.best : s.worst;
    default:
      return null;
  }
}
