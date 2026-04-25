"use client";

import { ReactNode } from "react";

import { IconFolderCode, IconPlus } from "@tabler/icons-react";
import { AlertCircle, ArrowUpDown, Check, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import InfoButton from "@/components/Button/InfoButton";
import RefreshButton from "@/components/Button/RefreshButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { docsPath } from "@/utils/constants";

import WelcomeTour from "../WelcomeTour/WelcomeTour";

const TEMPLATE_SORT_OPTIONS = [
  { value: "latest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "Name (A-Z)" },
  { value: "z-a", label: "Name (Z-A)" },
] as const;

const LIST_SKELETON_KEYS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
] as const;

type ListSortOption = {
  readonly value: string;
  readonly label: string;
};

type ListPageLayoutProps = {
  readonly canCreate: boolean;
  readonly createLabel: string;
  readonly createDisabledText: string;
  readonly docsUrl: string;
  readonly isLoading: boolean;
  readonly queryKeys: string[];
  readonly search: string;
  readonly searchPlaceholder: string;
  readonly tourSteps: {
    element: string;
    popover: {
      title: string;
      description: string;
      side: string;
      align: string;
    };
  }[];
  readonly onCreate: () => void;
  readonly onSearchChange: (value: string) => void;
  readonly rightControls?: ReactNode;
  readonly leftControls?: ReactNode;
  readonly sortOptions?: readonly ListSortOption[];
  readonly sortValue?: string;
  readonly onSortChange?: (value: string) => void;
  readonly isError?: boolean;
  readonly isEmpty?: boolean;
  readonly onRetry?: () => void;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly children: ReactNode;
};

export function ListPageLayout({
  canCreate,
  createLabel,
  createDisabledText,
  docsUrl,
  isLoading,
  queryKeys,
  search,
  searchPlaceholder,
  tourSteps,
  onCreate,
  onSearchChange,
  rightControls,
  leftControls,
  sortOptions,
  sortValue,
  onSortChange,
  isError = false,
  isEmpty = false,
  onRetry,
  emptyTitle,
  emptyDescription,
  children,
}: Readonly<ListPageLayoutProps>) {
  const createButton = (
    <Button onClick={onCreate} disabled={!canCreate || isLoading}>
      {createLabel}
      <IconPlus size={16} className="ml-2" />
    </Button>
  );

  const activeSortOptions = sortOptions ?? TEMPLATE_SORT_OPTIONS;

  const hasSortControl = Boolean(
    activeSortOptions.length && sortValue && onSortChange,
  );
  const currentSortLabel =
    activeSortOptions.find((option) => option.value === sortValue)?.label ??
    "Sort";
  const defaultSortValue = activeSortOptions[0]?.value;

  let renderedContent = children;
  if (isLoading) {
    renderedContent = (
      <div className="min-h-65 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5">
        {LIST_SKELETON_KEYS.map((key) => (
          <div key={key} className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="size-8 rounded-md" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>

            <div className="flex items-center gap-2 pt-2 justify-between">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (isError) {
    renderedContent = (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircle className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            We could not load this list. Please try again.
          </EmptyDescription>
        </EmptyHeader>
        {onRetry ? (
          <EmptyContent>
            <Button onClick={onRetry} variant="outline">
              Retry
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  } else if (isEmpty) {
    renderedContent = (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconFolderCode />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle ?? "No data yet"}</EmptyTitle>
          <EmptyDescription>
            {emptyDescription ??
              "You have not created anything yet. Get started by creating your first item."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreate}>{createLabel}</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-h-12.5 flex-wrap items-center gap-3">
          {canCreate ? (
            createButton
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{createButton}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{createDisabledText}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <InfoButton docUrl={`${docsPath}/${docsUrl}`} />
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={queryKeys} />
          {leftControls}
        </div>

        <div className="flex min-h-12.5 flex-wrap items-center gap-2.5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-8"
            />
          </div>

          {hasSortControl ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 px-3 text-sm font-medium transition-all",
                    sortValue !== defaultSortValue &&
                      "border-primary/50 text-primary",
                  )}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {currentSortLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 p-1.5">
                <DropdownMenuRadioGroup
                  value={sortValue ?? ""}
                  onValueChange={(val) => onSortChange?.(val)}
                >
                  {activeSortOptions.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {rightControls}
        </div>
      </div>

      {renderedContent}
    </div>
  );
}
