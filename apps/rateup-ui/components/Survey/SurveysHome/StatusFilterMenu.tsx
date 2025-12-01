"use client";

import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function StatusFilterMenu({ filterParam, setFilterParam }) {
  const translations = useTranslations();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Select value={filterParam} onValueChange={setFilterParam}>
          <SelectTrigger className="min-w-[110px] rounded-sm capitalize">
            <SelectValue placeholder={translations("Status") ?? "Status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="capitalize">
              {translations("All")}
            </SelectItem>
            <SelectItem value="active" className="capitalize">
              {translations("Active")}
            </SelectItem>
            <SelectItem value="paused" className="capitalize">
              {translations("Paused")}
            </SelectItem>
          </SelectContent>
        </Select>
      </TooltipTrigger>

      <TooltipContent side="top">
        {translations("Status") ?? "Status"}
      </TooltipContent>
    </Tooltip>
  );
}
