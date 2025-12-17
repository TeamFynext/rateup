import {
  LDResponse,
  QuestionType,
  RatingScale,
  SmileyResponse,
  WaQuestions,
  YNResponse,
} from "../types/enums.js";

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

export const npsQuestionTypes = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
  QuestionType.CustomNPS,
];
export const npsQuestionTypes2 = [
  WaQuestions.Rating,
  WaQuestions.Smiley,
  WaQuestions.LD,
  WaQuestions.YN,
  WaQuestions.Opinion,
];
export const barGraphQuestions = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
  QuestionType.CustomNPS,
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.MCQGrid,
  QuestionType.DDMS,
  QuestionType.DDSS,
];

export const barGraphQuestions2 = [
  WaQuestions.Rating,
  WaQuestions.Smiley,
  WaQuestions.LD,
  WaQuestions.YN,
  WaQuestions.Opinion,
  WaQuestions.RadioButtonsGroup,
  WaQuestions.CheckboxGroup,
  WaQuestions.ChipsSelector,
];
