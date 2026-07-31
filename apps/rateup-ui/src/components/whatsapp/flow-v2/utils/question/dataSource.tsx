// Extracted verbatim from `util.ts`. Behaviour is unchanged.

import {
  LDResponse2,
  QuestionType2,
  RatingScale,
  SmileyResponse2,
  YNResponse,
} from "@/types/enums.ts";

export const getDataSource = (type: QuestionType2) => {
  const mapEnumToDataSource = (enumObj: object) =>
    Object.values(enumObj).map((value, index) => ({
      id: (index + 1).toString(),
      title: value,
    }));

  switch (type) {
    case QuestionType2.Rating:
      return Object.entries(RatingScale).map(([description, title], index) => ({
        id: (index + 1).toString(),
        title,
        description,
      }));
    case QuestionType2.Smiley:
      return mapEnumToDataSource(SmileyResponse2);
    case QuestionType2.LD:
      return mapEnumToDataSource(LDResponse2);
    case QuestionType2.YN:
      return mapEnumToDataSource(YNResponse);
    case QuestionType2.Opinion:
      return Array.from({ length: 10 }).map((_, index) => ({
        id: (index + 1).toString(),
        title: (index + 1).toString(),
      }));
    case QuestionType2.ChipsSelector:
      return [];
    default:
      return [];
  }
};
