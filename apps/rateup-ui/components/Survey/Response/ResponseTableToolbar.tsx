import React, { useEffect, useState } from "react";

import {
  IconDatabaseImport,
  IconFileDownload,
  IconRefresh,
  IconSearch,
  IconTableExport,
} from "@tabler/icons-react";
import { Table } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";

import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { docsPath } from "@/utils/constants";

import InfoButton from "../../Button/InfoButton";
import RefreshButton from "../../Button/RefreshButton";
import { ContainedMultiSelect } from "../../input/ContainedInput/ContainedInput";
import { useResponseFilterStore } from "./store";

interface ResponseTableToolbarProps<TData> {
  table: Table<TData>;
  CFData?: any[];
  campaignIds: string[];
  setCampaignIds: (ids: string[]) => void;
  ranges: Range[];
  setRange: (range: Range[]) => void;
  survey: any;
  isSyncing: boolean;
  refetchResponse: () => void;
  handleSyncGoogleSheet: () => void;
  handleExcelDownload: (columns: string[]) => void;
  handleExportContacts?: () => void;
  hasContactQuestion?: boolean;
  alertModalOpen: () => void;
  responseCount: number;
}

export function ResponseTableToolbar<TData>({
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
  responseCount,
}: Readonly<ResponseTableToolbarProps<TData>>) {
  const translations = useTranslations();
  const [openedExport, setOpenedExport] = useState(false);
  const { serverFilters, setServerFilters } = useResponseFilterStore();
  const filters = serverFilters as Record<string, any>; // Cast locally to avoid store change
  const [searchTerm, setSearchTerm] = useState(filters?.search || "");

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const currentSearch = filters?.search || "";
      if (currentSearch !== searchTerm) {
        setServerFilters({ ...serverFilters, search: searchTerm });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, serverFilters, setServerFilters, filters?.search]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  return (
    <div className="pb-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={translations("Search...")}
              className="h-9 pl-9"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {CFData && CFData.length > 0 && (
            <ContainedMultiSelect
              placeholder={translations("Campaign")}
              value={campaignIds}
              onChange={setCampaignIds}
              data={CFData.map(({ id, name }) => ({
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
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-2">
                  <IconTableExport className="h-3.5 w-3.5" />
                  {translations("Export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    if (survey.spreadSheetId) alertModalOpen();
                    else handleSyncGoogleSheet();
                  }}
                >
                  <IconRefresh
                    className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  {survey.spreadSheetId
                    ? translations("Resync with Google Sheet")
                    : translations("Sync with Google Sheet")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const columns = table
                      .getAllColumns()
                      .map((col) =>
                        typeof col.columnDef?.header === "string"
                          ? col.columnDef?.header
                          : col?.id,
                      );
                    handleExcelDownload(columns);
                    setOpenedExport(false);
                  }}
                >
                  <IconFileDownload className="mr-2 h-4 w-4" />
                  {translations("Download")}
                </DropdownMenuItem>
                {hasContactQuestion && handleExportContacts && (
                  <DropdownMenuItem onClick={handleExportContacts}>
                    <IconDatabaseImport className="mr-2 h-4 w-4" />
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
