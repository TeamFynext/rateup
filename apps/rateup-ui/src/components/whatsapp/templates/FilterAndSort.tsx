import { IconAdjustmentsHorizontal, IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { cn } from "@/lib/utils.ts";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utility" },
  { value: "AUTHENTICATION", label: "Authentication" },
];

/** The status/category/type filter selection for the templates list. */
export interface TemplateFilters {
  status: string;
  category: string;
  templateType: string;
}

function OptionRow({
  label,
  active,
  onClick,
}: {
  label: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors",
        active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted",
      )}
    >
      {label}
      {active && <IconCheck className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}

function ActiveBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
      {count}
    </span>
  );
}

// Accordion section
function FilterSection({
  label,
  hint,
  isOpen,
  onToggle,
  children,
}: {
  label: ReactNode;
  hint?: string | null;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isOpen ? "text-foreground" : "text-foreground hover:bg-muted",
        )}
      >
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          {!isOpen && hint && (
            <span className="text-xs font-normal text-muted-foreground capitalize">
              {hint.toLowerCase()}
            </span>
          )}
          <IconChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </span>
      </button>

      {/* Animated expand */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-1 pt-0.5 pl-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function TemplateFilterSort({
  filters,
  setFilters,
  templateTypeOptions = [],
}: {
  filters: TemplateFilters;
  setFilters: Dispatch<SetStateAction<TemplateFilters>>;
  templateTypeOptions?: Array<{ value: string; label: string }>;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null); // "status" | "category" | "templateType" | null

  const activeFilterCount = [
    filters.status !== "all",
    filters.category !== "all",
    filters.templateType !== "all",
  ].filter(Boolean).length;

  function toggleSection(section: string) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  function handleFilterOpenChange(open: boolean) {
    setFilterOpen(open);
    if (!open) setOpenSection(null);
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 px-3 text-sm font-medium transition-all",
                activeFilterCount > 0 && "border-primary/50 text-primary",
              )}
            />
          }
        >
          <IconAdjustmentsHorizontal className="h-3.5 w-3.5" />
          Filter
          <ActiveBadge count={activeFilterCount} />
        </PopoverTrigger>

        <PopoverContent align="start" sideOffset={6} className="w-52 p-1.5">
          {/* Status */}
          <FilterSection
            label="Status"
            hint={filters.status === "all" ? null : filters.status}
            isOpen={openSection === "status"}
            onToggle={() => toggleSection("status")}
          >
            {STATUS_OPTIONS.map((opt) => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                active={filters.status === opt.value}
                onClick={() => setFilters((f) => ({ ...f, status: opt.value }))}
              />
            ))}
          </FilterSection>

          <Separator className="my-1" />

          {/* Category */}
          <FilterSection
            label="Category"
            hint={filters.category === "all" ? null : filters.category}
            isOpen={openSection === "category"}
            onToggle={() => toggleSection("category")}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                active={filters.category === opt.value}
                onClick={() => setFilters((f) => ({ ...f, category: opt.value }))}
              />
            ))}
          </FilterSection>

          {templateTypeOptions.length > 1 && (
            <>
              <Separator className="my-1" />
              <FilterSection
                label="Type"
                hint={filters.templateType === "all" ? null : filters.templateType}
                isOpen={openSection === "templateType"}
                onToggle={() => toggleSection("templateType")}
              >
                {templateTypeOptions.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    active={filters.templateType === opt.value}
                    onClick={() => setFilters((f) => ({ ...f, templateType: opt.value }))}
                  />
                ))}
              </FilterSection>
            </>
          )}

          {activeFilterCount > 0 && (
            <>
              <Separator className="my-1.5" />
              <button
                onClick={() =>
                  setFilters({
                    status: "all",
                    category: "all",
                    templateType: "all",
                  })
                }
                className="w-full rounded-md px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
              >
                Clear all filters
              </button>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
