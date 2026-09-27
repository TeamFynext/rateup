import type { RankingInfo } from "@tanstack/match-sorter-utils";
import { rankings, rankItem } from "@tanstack/match-sorter-utils";
import type { Row, RowData } from "@tanstack/react-table";
import dayjs from "dayjs";

import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { QuestionType } from "@/types/enums.ts";

/** The toolbar search text, or the picked choices for a smiley question. */
type FuzzyFilterValue = string | Array<{ value?: string }>;

/** Generic over the row so the survey and WhatsApp response tables can share it. */
export const fuzzyFilter = <TData extends RowData>(
  row: Row<DataTableFeatures, TData>,
  columnId: string,
  value: FuzzyFilterValue,
  addMeta?: (meta: { itemRank?: RankingInfo }) => void,
): boolean => {
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

  // `rankItem` coerces its query to a string itself; keep that for the smiley choice list.
  let itemRank = rankItem(formatedResponse, String(value));

  if (responseType === QuestionType.Smiley && Array.isArray(value) && value.length > 0) {
    const temp: RankingInfo[] = [];
    value.map((data) => {
      temp?.push(rankItem(formatedResponse, data?.value ?? ""));
    });
    temp?.map((data) => {
      if (data.passed) itemRank = data;
    });
  }
  addMeta?.({
    itemRank,
  });

  if ([QuestionType.LD].includes(responseType))
    return itemRank.rank === rankings.EQUAL ? itemRank.passed : false;
  else return itemRank.passed;
};
