import type { Dispatch, SetStateAction } from "react";

import { Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

interface FilterProps {
  filterOpened: boolean;
  setFilterOpened: Dispatch<SetStateAction<boolean>>;
  priorityFilter: string | null;
  setPriorityFilter: Dispatch<SetStateAction<string | null>>;
}

export function PriorityFilter(props: Readonly<FilterProps>) {
  const { priorityFilter, setPriorityFilter } = props;
  const priorities = [
    { value: "", label: "Default" },
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "CRITICAL", label: "Critical" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Filter className="mr-2" data-icon="inline-start" />
          {priorityFilter
            ? priorities.find((p) => p.value === priorityFilter)?.label
            : "Filter"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 p-2">
        <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={priorityFilter ?? ""}
          onValueChange={(val) => setPriorityFilter(val || null)}
        >
          {priorities.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {item.label}
              {priorityFilter === item.value && (
                <Badge variant="secondary" className="ml-2">
                  Selected
                </Badge>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
