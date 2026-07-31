import type { RankingInfo } from "@tanstack/match-sorter-utils";
import { rankings, rankItem } from "@tanstack/match-sorter-utils";
import type { FilterFn } from "@tanstack/react-table";
import dayjs from "dayjs";

import { QuestionType } from "@/types/enums.ts";

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  if (!value) return false;
  const cellValue = row.getValue(columnId);
  const responseType = columnId.split("_,_")?.[1] as QuestionType;

  let formatedResponse = "";
  /** Answers are stored per question type: a string, a list of choices, or a keyed object. */
  const asChoiceList = (value: unknown) =>
    Array.isArray(value) ? (value as Array<{ value?: string }>) : [];
  const asRecordValues = (value: unknown) =>
    typeof value === "object" && value !== null ? Object.values(value) : [];
  if (columnId === "createdAt")
    formatedResponse = dayjs(row.getValue(columnId)).format("DD-MM-YYYY hh:mm A");
  else if ([QuestionType.EmailPhone, QuestionType.CustomNPS].includes(responseType)) {
    formatedResponse = asRecordValues(cellValue).join(" , ");
  } else if ([QuestionType.Date].includes(responseType)) {
    formatedResponse = dayjs(cellValue as string).format("DD, MMM YYYY");
  } else if ([QuestionType.DDMS, QuestionType.MSQ].includes(responseType)) {
    formatedResponse = asChoiceList(cellValue)
      .map((obj) => obj.value)
      .join(" , ");
  } else if (typeof row.getValue(columnId) === "object") {
    formatedResponse = asRecordValues(cellValue).join(" , ");
  } else formatedResponse = String(cellValue ?? "");

  let itemRank = rankItem(formatedResponse, value);

  if (responseType === QuestionType.Smiley && value?.length > 0) {
    const temp: RankingInfo[] = [];
    value?.map((data: { value?: string }) => {
      temp?.push(rankItem(formatedResponse, data?.value ?? ""));
    });
    temp?.map((data) => {
      if (data.passed) itemRank = data;
    });
  }
  addMeta({
    itemRank,
  });

  if ([QuestionType.LD].includes(responseType))
    return itemRank.rank === rankings.EQUAL ? itemRank.passed : false;
  else return itemRank.passed;
};
