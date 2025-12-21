import { Flex, RangeSlider } from "@mantine/core";
import { Column } from "@tanstack/react-table";

import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { QuestionType, SmileyResponse } from "../../../types/enums";
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
      <MultiSelect
        options={selectValue}
        onValueChange={(value) => column.setFilterValue(value)}
        placeholder="select option"
      />
    );
  } else if ([QuestionType.LD].includes(responseType)) {
    renderData = (
      <Select
        value={typeof columnFilterValue === "string" ? columnFilterValue : ""}
        onValueChange={(value) => column.setFilterValue(value)}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder="Select option" />
        </SelectTrigger>

        <SelectContent>
          {selectValue.map((option: string) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (
    [QuestionType.Rating, QuestionType.Opinion].includes(responseType)
  ) {
    renderData = (
      <div className="w-full border px-2 py-3 rounded-sm">
        <RangeSlider
          minRange={1}
          min={min}
          max={max}
          step={1}
          defaultValue={[min, max]}
          onChange={column.setFilterValue}
          color="var(--primary)"
        />
      </div>
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
