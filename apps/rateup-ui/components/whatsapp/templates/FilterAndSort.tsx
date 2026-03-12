"use client";

import { useState } from "react";

import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

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

function OptionRow({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-muted",
      )}
    >
      {label}
      {active && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}

function ActiveBadge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
      {count}
    </span>
  );
}

// Accordion section
function FilterSection({ label, hint, isOpen, onToggle, children }) {
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
          <ChevronDown
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
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null); // "status" | "category" | "templateType" | null

  const activeFilterCount = [
    filters.status !== "all",
    filters.category !== "all",
    filters.templateType !== "all",
  ].filter(Boolean).length;

  function toggleSection(section) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  function handleFilterOpenChange(open) {
    setFilterOpen(open);
    if (!open) setOpenSection(null);
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 px-3 text-sm font-medium transition-all",
              activeFilterCount > 0 && "border-primary/50 text-primary",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
            <ActiveBadge count={activeFilterCount} />
          </Button>
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
                onClick={() =>
                  setFilters((f) => ({ ...f, category: opt.value }))
                }
              />
            ))}
          </FilterSection>

          {templateTypeOptions.length > 1 && (
            <>
              <Separator className="my-1" />
              <FilterSection
                label="Type"
                hint={
                  filters.templateType === "all" ? null : filters.templateType
                }
                isOpen={openSection === "templateType"}
                onToggle={() => toggleSection("templateType")}
              >
                {templateTypeOptions.map((opt) => (
                  <OptionRow
                    key={opt.value}
                    label={opt.label}
                    active={filters.templateType === opt.value}
                    onClick={() =>
                      setFilters((f) => ({ ...f, templateType: opt.value }))
                    }
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
