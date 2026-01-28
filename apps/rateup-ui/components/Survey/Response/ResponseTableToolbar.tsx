import React, { useState } from "react";

import { useDebouncedState } from "@mantine/hooks";
import {
  IconFileDownload,
  IconRefresh,
  IconSearch,
  IconTableExport,
} from "@tabler/icons-react";
import { Table } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Range } from "react-date-range";

import { DateRangePickerButton } from "@/components/DateAndTime/DatePicker/DateRangePicker";
import { CalenderIconDateRangePicker } from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
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
import ConfirmationModal from "../../Modal/ConfirmationModal";
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
  handleExcelDownload: () => void;
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
  alertModalOpen,
  responseCount,
}: Readonly<ResponseTableToolbarProps<TData>>) {
  const translations = useTranslations();
  const [openedExport, setOpenedExport] = useState(false);
  const toggle = () => setOpenedExport(!openedExport);
  const { serverFilters, setServerFilters } = useResponseFilterStore();
  const filters = serverFilters as Record<string, any>; // Cast locally to avoid store change
  const [searchTerm, setSearchTerm] = useState(filters?.search || "");

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setServerFilters({ ...serverFilters, search: value });
  };

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
            {translations("Total Responses :")} {responseCount}
          </h2>
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="search"
              placeholder={translations("Search responses...")}
              className="pl-9 w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <RefreshButton onClick={() => refetchResponse()} />
        </div>

        <div className="flex items-center gap-2">
          {CFData && CFData.length > 0 && (
            <ContainedMultiSelect
              placeholder={translations("Filter By Campaign")}
              value={campaignIds}
              onChange={setCampaignIds}
              data={CFData.map(({ id, name }) => ({
                value: id,
                label: name,
              }))}
            />
          )}

          <CalenderIconDateRangePicker ranges={ranges} setRange={setRange} />

          {!survey?.isEncrypted && (
            <DropdownMenu open={openedExport} onOpenChange={setOpenedExport}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-8 text-xs px-3 rounded-md"
                >
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
                    handleExcelDownload();
                    toggle();
                  }}
                >
                  <IconFileDownload className="mr-2 h-4 w-4" />
                  {translations("Download Excel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="text-gray-500 hover:bg-gray-100 rounded p-1 cursor-pointer">
            <InfoButton docUrl={`${docsPath}/advancedFt/resultexport`} />
          </div>
        </div>
      </div>
    </div>
  );
}
