"use client";
"use no memo";

import React from "react";

import { IconChevronDown, IconDownload, IconFilter } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useResponseFilterStore } from "@/components/Survey/Response/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// Add shadcn UI imports
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showErrorToast } from "@/utils/notifications";

import { extractText } from "../../../utils";
import { RateupButtonPrimary } from "../../Button/RateupButtons";

const FilterToggles = ({
  table,
  enableFilter,
  setFilterVisibility,
  filterVisibility,
  enableColumnSelection,
  tempVisibleColumnArray,
  enableExport = false,
  onExport,
}) => {
  const translations = useTranslations();
  const { setServerFilters } = useResponseFilterStore();

  const leafColumns = table
    .getAllLeafColumns()
    ?.filter(
      (column) =>
        column.getIsVisible() && !["select", "action"].includes(column.id),
    )
    ?.map((col) => col.id);

  const handleExport = (type: string) => {
    if (!leafColumns?.length) {
      showErrorToast(
        translations("Please select at least one field to export."),
      );
      return;
    }
    onExport.mutate({
      type,
      fields: leafColumns,
    });
  };
  return (
    <div className="flex flex-col sm:flex-row items-center gap-1">
      {enableExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconDownload />
              Export
              <IconChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("csv")}>
              Download as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("xlsx")}>
              Download as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {enableFilter && (
        <Button
          onClick={() => setFilterVisibility((el) => !el)}
          variant={filterVisibility ? "default" : "outline"}
        >
          <IconFilter stroke={1.5} />
        </Button>
      )}
      {enableColumnSelection && (
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <Button variant="outline">Select Fields</Button>
            </div>
          </PopoverTrigger>

          <PopoverContent align="start" side="bottom" className="w-[200px] p-2">
            <ScrollArea className="max-h-[200px] overflow-auto">
              <div className="flex flex-col gap-2">
                {/* Toggle all */}
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={table.getIsAllColumnsVisible()}
                    onCheckedChange={() =>
                      table.toggleAllColumnsVisible(
                        !table.getIsAllColumnsVisible(),
                      )
                    }
                  />
                  <span className="text-sm font-medium">Toggle All</span>
                </label>

                {/* Columns */}
                {table.getAllLeafColumns().map((column, index) => {
                  if (column.getIsVisible()) {
                    tempVisibleColumnArray.push(column.id?.split("_,_")?.[0]);
                  }

                  return (
                    <label key={index} className="flex items-center gap-2">
                      <Checkbox
                        checked={column.getIsVisible()}
                        onCheckedChange={() =>
                          column.toggleVisibility(!column.getIsVisible())
                        }
                      />
                      <span className="text-sm">
                        {extractText(column.id?.split("_,_")?.[0])}
                      </span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
      {enableFilter && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={() => {
                    table.resetColumnFilters();
                    setServerFilters(null);
                  }}
                  variant="outline"
                >
                  Reset
                </Button>
              </div>
            </TooltipTrigger>

            <TooltipContent>
              {translations("Clear the filtered values")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default FilterToggles;
