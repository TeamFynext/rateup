import { LDResponse2, RatingScale, SmileyResponse2, YNResponse } from "@/types/enums.ts";

export const LDResponseMap = { 1: LDResponse2.Like, 2: LDResponse2.Dislike };
export const YNResponseMap = { 1: YNResponse.Yes, 2: YNResponse.No };

export const SmileyResponseMap: Record<number, SmileyResponse2> = {
  1: SmileyResponse2.VerySad,
  2: SmileyResponse2.Sad,
  3: SmileyResponse2.Neutral,
  4: SmileyResponse2.Happy,
  5: SmileyResponse2.VeryHappy,
};
export const RatingScaleMap: Record<number, RatingScale> = {
  1: RatingScale.VeryPoor,
  2: RatingScale.Poor,
  3: RatingScale.Average,
  4: RatingScale.Good,
  5: RatingScale.Excellent,
};
