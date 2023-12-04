import { SentimentClass } from "../../types/enums";

function isSentimentPositive(sentiment: number) {
  return sentiment > 0.3;
}
function isSentimentNegative(sentiment: number) {
  return sentiment < -0.3;
}

export function getSentimentClass(setiment: number): SentimentClass {
  if (isSentimentPositive(setiment)) {
    return SentimentClass.POSITIVE;
  }
  if (isSentimentNegative(setiment)) {
    return SentimentClass.NEGATIVE;
  }
  return SentimentClass.NEUTRAL;
}
