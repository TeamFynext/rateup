import { IconAlertCircle, IconArrowsSort, IconFolderCode, IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";

const LIST_SKELETON_COUNT = 12;

const DEFAULT_SORT_OPTIONS = [
  { value: "latest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "Name (A-Z)" },
  { value: "z-a", label: "Name (Z-A)" },
] as const;

interface SortOption {
  readonly value: string;
  readonly label: string;
}

interface ListPageSearchInputProps {
  readonly value?: string;
  readonly placeholder?: string;
  readonly onChange?: (value: string) => void;
  readonly className?: string;
}

export function ListPageSearchInput({
  value,
  placeholder,
  onChange,
  className,
}: Readonly<ListPageSearchInputProps>) {
  return (
    <div className={cn("relative max-w-sm", className)}>
      <IconSearch className="absolute left-3 top-1/2 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="pl-9"
        aria-label="Search"
      />
    </div>
  );
}

interface ListPageSortDropdownProps {
  readonly options?: readonly SortOption[];
  readonly value?: string;
  readonly onChange?: (value: string) => void;
  readonly className?: string;
}

export function ListPageSortDropdown({
  options = DEFAULT_SORT_OPTIONS,
  value,
  onChange,
  className,
}: Readonly<ListPageSortDropdownProps>) {
  const defaultValue = options[0]?.value;
  const currentLabel = options.find((opt) => opt.value === value)?.label ?? "Sort";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 px-3 text-sm font-medium transition-all",
              value !== defaultValue && "border-primary/50 text-primary",
              className,
            )}
          />
        }
      >
        <IconArrowsSort className="h-3.5 w-3.5" />
        {currentLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44 p-1.5">
        <DropdownMenuRadioGroup value={value ?? ""} onValueChange={(val) => onChange?.(val)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ListPageLoadingProps {
  readonly count?: number;
  readonly className?: string;
}

export function ListPageLoading({
  count = LIST_SKELETON_COUNT,
  className,
}: Readonly<ListPageLoadingProps>) {
  return (
    <div
      className={cn(
        "min-h-65 grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={`skeleton-${i}`} className="space-y-4 rounded-lg border bg-card p-4">
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
}

interface ListPageEmptyProps {
  readonly title?: string;
  readonly description?: string;
  readonly children?: ReactNode;
}

export function ListPageEmpty({
  title = "No data yet",
  description = "You have not created anything yet.",
  children,
}: Readonly<ListPageEmptyProps>) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconFolderCode />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

interface ListPageErrorProps {
  readonly onRetry?: () => void;
}

export function ListPageError({ onRetry }: Readonly<ListPageErrorProps>) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconAlertCircle className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>We could not load this list. Please try again.</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

interface ListPageContentProps {
  readonly isLoading?: boolean;
  readonly isError?: boolean;
  readonly isEmpty?: boolean;
  readonly loadingCount?: number;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly onRetry?: () => void;
  readonly children?: ReactNode;
}

export function ListPageContent({
  isLoading = false,
  isError = false,
  isEmpty = false,
  loadingCount,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: Readonly<ListPageContentProps>) {
  if (isLoading) {
    return <ListPageLoading count={loadingCount} />;
  }

  if (isError) {
    return <ListPageError onRetry={onRetry} />;
  }

  if (isEmpty) {
    return (
      <ListPageEmpty title={emptyTitle} description={emptyDescription}>
        {children}
      </ListPageEmpty>
    );
  }

  return children ?? null;
}

interface ListPageProps {
  readonly children?: ReactNode;
  readonly className?: string;
}

export function ListPage({ children, className }: Readonly<ListPageProps>) {
  return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
}

interface ListPageHeaderProps {
  readonly children?: ReactNode;
  readonly className?: string;
}

export function ListPageHeader({ children, className }: Readonly<ListPageHeaderProps>) {
  return (
    <div
      className={cn(
        "sticky -top-4 z-10 flex flex-wrap items-center justify-between gap-4 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ListPageHeaderSectionProps {
  readonly children?: ReactNode;
  readonly className?: string;
}

export function ListPageHeaderSection({
  children,
  className,
}: Readonly<ListPageHeaderSectionProps>) {
  return (
    <div className={cn("flex min-h-12.5 flex-wrap items-center gap-2.5", className)}>
      {children}
    </div>
  );
}

export { DEFAULT_SORT_OPTIONS };
export type { SortOption };
