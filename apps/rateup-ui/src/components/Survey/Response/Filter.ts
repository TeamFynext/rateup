import { rankings, rankItem } from "@tanstack/match-sorter-utils";
import type { FilterFn } from "@tanstack/react-table";
import dayjs from "dayjs";

import { QuestionType } from "@/types/enums.ts";

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  if (!value) return;
  const cellValue: any = row.getValue(columnId);
  const responseType = columnId.split("_,_")?.[1] as QuestionType;

  let formatedResponse = "";
  if (columnId === "createdAt")
    formatedResponse = dayjs(row.getValue(columnId)).format("DD-MM-YYYY hh:mm A");
  else if ([QuestionType.EmailPhone, QuestionType.CustomNPS].includes(responseType)) {
    formatedResponse = Object.values(cellValue).join(" , ");
  } else if ([QuestionType.Date].includes(responseType)) {
    formatedResponse = dayjs(cellValue as string).format("DD, MMM YYYY");
  } else if ([QuestionType.DDMS, QuestionType.MSQ].includes(responseType)) {
    formatedResponse = cellValue.map((obj: { value?: string }) => obj.value).join(" , ");
  } else if (typeof row.getValue(columnId) === "object") {
    formatedResponse = Object.values(cellValue).join(" , ");
  } else formatedResponse = cellValue;

  let itemRank = rankItem(formatedResponse, value);

  if (responseType === QuestionType.Smiley && value?.length > 0) {
    const temp: string[] = [];
    value?.map((data: { value?: string }) => {
      temp?.push(rankItem(formatedResponse, data));
    });
    temp?.map((data: string) => {
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
