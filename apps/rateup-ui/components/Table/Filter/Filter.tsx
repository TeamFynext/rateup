import { Flex, RangeSlider, Stack } from "@mantine/core";
import { Column } from "@tanstack/react-table";

import { QuestionType, SmileyResponse } from "../../../types/enums";
import {
  ContainedMultiSelect,
  ContainedSelection,
} from "../../input/ContainedInput/ContainedInput";
import DebouncedInput from "./DebouncedInput";

export const Filter = ({
  column,
  table,
}: {
  column: Column<any, unknown>;
  table: any;
}) => {
  const firstValue = table
    .getPreFilteredRowModel()
    .flatRows[0]?.getValue(column.id);

  const columnFilterValue = column.getFilterValue();

  const responseType = column?.id?.split("_,_")?.[1] as QuestionType;
  let max = 10;
  let min = 0;
  let selectValue: any = ["LIKE", "DISLIKE"];
  if (responseType === QuestionType.Rating) {
    min = 1;
    max = 5;
  }
  if (responseType === QuestionType.Smiley) {
    selectValue = Object.keys(SmileyResponse).map((key) => ({
      label: SmileyResponse[key],
      value: SmileyResponse[key],
    }));
  }

  let renderData;
  if ([QuestionType.Smiley].includes(responseType)) {
    renderData = (
      <ContainedMultiSelect
        data={selectValue}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={"select option"}
      />
    );
  } else if ([QuestionType.LD].includes(responseType)) {
    renderData = (
      <ContainedSelection
        data={selectValue}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={"select option"}
      />
    );
  } else if (
    [QuestionType.Rating, QuestionType.Opinion].includes(responseType)
  ) {
    renderData = (
      <Stack gap={"xs"} h={36} justify="center">
        <RangeSlider
          minRange={1}
          min={min}
          max={max}
          step={1}
          defaultValue={[min, max]}
          onChange={column.setFilterValue}
          color="var(--primary)"
        />
      </Stack>
    );
  } else if (typeof firstValue === "number") {
    renderData = (
      <Flex gap={"xs"}>
        <DebouncedInput
          type="number"
          value={(columnFilterValue as [number, number])?.[0] ?? ""}
          onChange={(value) =>
            column.setFilterValue((old: [number, number]) => [value, old?.[1]])
          }
          placeholder={`Min ${
            column.getFacetedMinMaxValues()?.[0]
              ? `(${column.getFacetedMinMaxValues()?.[0]})`
              : ""
          }`}
        />
        <DebouncedInput
          type="number"
          value={(columnFilterValue as [number, number])?.[1] ?? ""}
          onChange={(value) =>
            column.setFilterValue((old: [number, number]) => [old?.[0], value])
          }
          placeholder={`Max ${
            column.getFacetedMinMaxValues()?.[1]
              ? `(${column.getFacetedMinMaxValues()?.[1]})`
              : ""
          }`}
        />
      </Flex>
    );
  } else {
    renderData = (
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? "") as string}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={`Search...`}
      />
    );
  }
  return renderData;
};
