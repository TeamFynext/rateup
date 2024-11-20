import {
  LDResponse,
  RatingScale,
  SmileyResponse,
  YNResponse,
} from "../types/enums";

export const LDResponseMap = { 1: LDResponse.Like, 2: LDResponse.Dislike };
export const YNResponseMap = { 1: YNResponse.Yes, 2: YNResponse.No };

export const SmileyResponseMap = {
  1: SmileyResponse.VerySad,
  2: SmileyResponse.Sad,
  3: SmileyResponse.Neutral,
  4: SmileyResponse.Happy,
  5: SmileyResponse.VeryHappy,
};
export const RatingScaleMap = {
  1: RatingScale.VeryPoor,
  2: RatingScale.Poor,
  3: RatingScale.Average,
  4: RatingScale.Good,
  5: RatingScale.Excellent,
};
