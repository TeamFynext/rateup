"use client";

import { ChevronDown, Filter, Grid3x3, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface ToolBarProps {
  title?: string;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: "name" | "date" | "status";
  onSortChange: (sort: "name" | "date" | "status") => void;
  filterActive: "all" | "active" | "inactive";
  onFilterChange: (filter: "all" | "active" | "inactive") => void;
  onCreate: () => void;
  isLoading?: boolean;
}

export function ToolBar({
  title,
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  filterActive,
  onFilterChange,
  onCreate,
  isLoading = false,
}: Readonly<ToolBarProps>) {
  return (
    <div className="flex items-center gap-2 p-1 rounded-lg justify-between w-full">
      <div className="flex gap-3">
        {title && (
          <>
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
            <Separator orientation="vertical" className="h-5" />
          </>
        )}
        <Button
          onClick={onCreate}
          size="sm"
          className="gap-2"
          disabled={isLoading}
        >
          <span>Create +</span>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 text-sm"
          disabled={isLoading}
        />

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={isLoading}
            >
              Sort
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-sm">
            <DropdownMenuItem
              onClick={() => onSortChange("date")}
              className={sortBy === "date" ? "bg-accent" : ""}
            >
              By Date
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortChange("name")}
              className={sortBy === "name" ? "bg-accent" : ""}
            >
              By Name
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortChange("status")}
              className={sortBy === "status" ? "bg-accent" : ""}
            >
              By Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={isLoading}
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-sm">
            <DropdownMenuItem
              onClick={() => onFilterChange("all")}
              className={filterActive === "all" ? "bg-accent" : ""}
            >
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onFilterChange("active")}
              className={filterActive === "active" ? "bg-accent" : ""}
            >
              Active
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onFilterChange("inactive")}
              className={filterActive === "inactive" ? "bg-accent" : ""}
            >
              Inactive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-muted p-1 rounded">
          <Button
            onClick={() => onViewModeChange("grid")}
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            disabled={isLoading}
          >
            <Grid3x3 className="w-4 h-4" />
            Grid
          </Button>
          <Button
            onClick={() => onViewModeChange("list")}
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            disabled={isLoading}
          >
            <List className="w-4 h-4" />
            List
          </Button>
        </div>
      </div>
    </div>
  );
}
