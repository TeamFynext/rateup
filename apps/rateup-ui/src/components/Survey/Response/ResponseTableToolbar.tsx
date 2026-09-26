import {
  IconFileDownload,
  IconRefresh,
  IconSearch,
  IconTableExport,
  IconUsers,
} from "@tabler/icons-react";
import type { ReactTable, RowData } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type { Range } from "react-date-range";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView.tsx";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { docsPath } from "@/utils/constants.ts";

import InfoButton from "../../Button/InfoButton.tsx";
import RefreshButton from "../../Button/RefreshButton.tsx";
import { MultiSelect } from "../../ui/multi-select.tsx";
import { useResponseFilterStore } from "./store.ts";

interface ResponseTableToolbarProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  CFData?: Array<{ id: string; name: string }>;
  campaignIds: string[];
  setCampaignIds: (ids: string[]) => void;
  ranges: Range[];
  setRange: (range: Range[]) => void;
  survey: Survey;
  isSyncing: boolean;
  refetchResponse: () => void;
  handleSyncGoogleSheet: () => void;
  handleExcelDownload: (columns: string[], format: "xlsx" | "ods") => void;
  handleExportContacts?: () => void;
  hasContactQuestion?: boolean;
  alertModalOpen: () => void;
  responseCount: number;
}

export function ResponseTableToolbar<TData extends RowData>({
  table,
  CFData,
  campaignIds,
  setCampaignIds,
  ranges,
  setRange,
  survey,
  isSyncing,
  refetchResponse,
  handleSyncGoogleSheet,
  handleExcelDownload,
  handleExportContacts,
  hasContactQuestion = false,
  alertModalOpen,
}: Readonly<ResponseTableToolbarProps<TData>>) {
  const { t: translations } = useTranslation();
  const [openedExport, setOpenedExport] = useState(false);
  const { serverFilters, setServerFilters } = useResponseFilterStore();
  const filters = serverFilters ?? {};

  const getBackendFilterKey = (columnId: string) => {
    if (!columnId) return "";
    const segments = columnId.split("_,_");
    if (segments.length >= 3) {
      return segments.at(-1) || columnId;
    }
    return columnId;
  };

  const filterableColumns = useMemo(
    () =>
      table
        .getAllColumns()
        .filter((column) => column.getCanFilter() && !["action", "Action"].includes(column.id))
        .map((column) => ({
          id: column.id,
          label:
            typeof column.columnDef?.header === "string" ? column.columnDef?.header : column.id,
        })),
    [table],
  );

  const initialSearchState = useMemo(() => {
    let searchByValue = typeof filters?.searchBy === "string" ? filters.searchBy : "";

    const isValidSearchBy =
      !!searchByValue && filterableColumns.some((column) => column.id === searchByValue);

    if (!isValidSearchBy) {
      const matchedColumn = filterableColumns.find((column) => {
        const backendKey = getBackendFilterKey(column.id);
        return filters?.[column.id] !== undefined || filters?.[backendKey] !== undefined;
      });

      searchByValue = matchedColumn?.id || filterableColumns[0]?.id || "";
    }

    let searchTermValue = "";

    if (filters?.search !== undefined) {
      searchTermValue = String(filters.search || "");
    } else if (searchByValue) {
      const backendKey = getBackendFilterKey(searchByValue);
      if (filters?.[searchByValue] !== undefined) {
        searchTermValue = String(filters[searchByValue] || "");
      } else if (filters?.[backendKey] !== undefined) {
        searchTermValue = String(filters[backendKey] || "");
      }
    }

    return {
      searchByValue,
      searchTermValue,
    };
  }, [filterableColumns, filters]);

  const form = useForm<{
    searchTerm: string;
    searchBy: string;
  }>({
    defaultValues: {
      searchTerm: initialSearchState.searchTermValue,
      searchBy: initialSearchState.searchByValue,
    },
  });

  const searchTerm = form.watch("searchTerm") || "";
  const rawSearchBy = form.watch("searchBy");

  const searchBy = useMemo(() => {
    if (rawSearchBy && filterableColumns.some((column) => column.id === rawSearchBy)) {
      return rawSearchBy;
    }

    return filterableColumns[0]?.id || "";
  }, [filterableColumns, rawSearchBy]);

  const getColumnFilterType = (columnId: string) => {
    if (!columnId) return "text";
    if (columnId === "createdAt") return "date";

    const segments = columnId.split("_,_");
    const metaType = (segments[1] || "").toLowerCase();

    if (
      ["number", "rating", "opinion"].includes(metaType) ||
      ["rating", "opinion"].includes(columnId.toLowerCase())
    ) {
      return "number";
    }

    if (["date", "datepicker"].includes(metaType)) {
      return "date";
    }

    return "text";
  };

  const getColumnMetaType = (columnId: string) => {
    if (!columnId) return "";
    const segments = columnId.split("_,_");
    return (segments[1] || "").toLowerCase();
  };

  const activeColumnType = useMemo(() => getColumnFilterType(searchBy), [searchBy]);

  const activeColumnMetaType = useMemo(() => getColumnMetaType(searchBy), [searchBy]);

  const isRatingColumn = activeColumnMetaType === "rating";

  const numericOptions = useMemo(() => {
    if (!searchBy || activeColumnType !== "number") return [];

    if (isRatingColumn) {
      return ["1", "2", "3", "4", "5"];
    }

    const values = table
      .getCoreRowModel()
      .rows.map((row) => row.getValue(searchBy))
      .filter((value) => value !== null && value !== undefined && value !== "")
      .filter((value) => ["string", "number", "boolean"].includes(typeof value))
      .map(String);

    return Array.from(new Set(values)).sort((a, b) => Number(a) - Number(b));
  }, [activeColumnType, isRatingColumn, searchBy, table]);

  const handleSearch = (value: string) => {
    form.setValue("searchTerm", value);
  };

  const selectedDate = useMemo(() => {
    if (!searchTerm) return undefined;
    const parsedDate = dayjs(searchTerm, "YYYY-MM-DD");
    return parsedDate.isValid() ? parsedDate.toDate() : undefined;
  }, [searchTerm]);

  const renderSearchInput = () => {
    if (activeColumnType === "date") {
      return (
        <div className="h-9">
          <DatePicker
            value={selectedDate}
            onChange={(date) => {
              form.setValue("searchTerm", date ? dayjs(date).format("YYYY-MM-DD") : "");
            }}
            className="w-full"
          />
        </div>
      );
    }

    if (activeColumnType === "number") {
      return (
        <Select
          value={searchTerm || "__none__"}
          onValueChange={(value) =>
            form.setValue("searchTerm", value === "__none__" ? "" : (value ?? ""))
          }
          items={[
            { value: "__none__", label: translations("Select value") },
            ...numericOptions.map((option) => ({ value: option, label: option })),
          ]}
        >
          <SelectTrigger className="h-9 w-full pr-9">
            <SelectValue placeholder={translations("Select value")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{translations("Select value")}</SelectItem>
            {numericOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type="search"
        placeholder={translations("Search...")}
        className="h-9 pr-9"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
    );
  };

  const applySearch = () => {
    const enteredSearchTerm = form.getValues("searchTerm") || "";
    const selectedSearchBy =
      form.getValues("searchBy") &&
      filterableColumns.some((column) => column.id === form.getValues("searchBy"))
        ? form.getValues("searchBy")
        : searchBy;

    const nextFilters: Record<string, unknown> = serverFilters ? { ...serverFilters } : {};

    delete nextFilters.search;
    delete nextFilters.searchMethod;

    filterableColumns.forEach((column) => {
      delete nextFilters[column.id];
      delete nextFilters[getBackendFilterKey(column.id)];
    });

    if (enteredSearchTerm.trim()) {
      if (selectedSearchBy) {
        nextFilters[getBackendFilterKey(selectedSearchBy)] = enteredSearchTerm.trim();
      }
    }

    setServerFilters(nextFilters);
  };

  const resetSearch = () => {
    const nextFilters: Record<string, unknown> = serverFilters ? { ...serverFilters } : {};

    delete nextFilters.search;
    delete nextFilters.searchMethod;

    filterableColumns.forEach((column) => {
      delete nextFilters[column.id];
      delete nextFilters[getBackendFilterKey(column.id)];
    });

    form.setValue("searchTerm", "");
    setServerFilters(nextFilters);
  };

  const hasActiveSearch = useMemo(() => {
    if (searchTerm.trim()) return true;

    return filterableColumns.some((column) => {
      const backendKey = getBackendFilterKey(column.id);
      return filters?.[column.id] !== undefined || filters?.[backendKey] !== undefined;
    });
  }, [filterableColumns, filters, searchTerm]);

  return (
    <div className="pb-3 pt-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {filterableColumns.length > 0 && (
            <Select
              value={searchBy}
              onValueChange={(value) => {
                form.setValue("searchBy", value ?? "");
                form.setValue("searchTerm", "");
              }}
              items={filterableColumns.map((column) => ({ value: column.id, label: column.label }))}
            >
              <SelectTrigger className="h-9 w-45">
                <SelectValue placeholder={translations("Column")} />
              </SelectTrigger>
              <SelectContent>
                {filterableColumns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex w-full max-w-md items-center gap-2">
            <div className="relative flex-1">
              {renderSearchInput()}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={applySearch}
                aria-label={translations("Search")}
              >
                <IconSearch className="size-4 text-muted-foreground" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={resetSearch}
              disabled={!hasActiveSearch}
            >
              {translations("Reset")}
            </Button>
          </div>

          {CFData && CFData.length > 0 && (
            <MultiSelect
              placeholder={translations("Campaign")}
              value={campaignIds}
              onValueChange={setCampaignIds}
              options={CFData.map(({ id, name }) => ({
                value: id,
                label: name,
              }))}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <CalenderIconDateRangePicker ranges={ranges} setRange={setRange} />
          <RefreshButton onClick={() => refetchResponse()} />
          <InfoButton docUrl={`${docsPath}/advancedFt/resultexport`} />

          {!survey?.isEncrypted && (
            <DropdownMenu open={openedExport} onOpenChange={setOpenedExport}>
              <DropdownMenuTrigger
                render={<Button variant="default" size="sm" className="gap-2" />}
              >
                <IconTableExport className="h-3.5 w-3.5" />
                {translations("Export")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    if (survey.spreadSheetId) alertModalOpen();
                    else handleSyncGoogleSheet();
                  }}
                >
                  <IconRefresh className={`mr-2 size-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {survey.spreadSheetId
                    ? translations("Resync with Google Sheet")
                    : translations("Sync with Google Sheet")}
                </DropdownMenuItem>
                {(["xlsx", "ods"] as const).map((format) => (
                  <DropdownMenuItem
                    key={format}
                    onClick={() => {
                      const columns = table
                        .getVisibleFlatColumns()
                        .map((col) =>
                          typeof col.columnDef?.header === "string"
                            ? col.columnDef?.header
                            : col?.id,
                        );
                      handleExcelDownload(columns, format);
                      setOpenedExport(false);
                    }}
                  >
                    <IconFileDownload className="mr-2 h-4 w-4" />
                    {format === "xlsx" && translations("Download as Excel")}
                    {format === "ods" && translations("Download as OpenDocument (ODS)")}
                  </DropdownMenuItem>
                ))}
                {hasContactQuestion && handleExportContacts && (
                  <DropdownMenuItem onClick={handleExportContacts}>
                    <IconUsers className="mr-2 size-4" />
                    {translations("Contacts")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </div>
  );
}
