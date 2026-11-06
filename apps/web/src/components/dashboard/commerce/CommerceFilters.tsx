import { IconDownload, IconLoader2 } from "@tabler/icons-react";

import type { SpreadsheetFormat } from "@/backend/commerce/commerce.api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DateRangeSelector from "@/components/whatsapp/inbox/analytics/DateRangeSelector";

import { useCommerce } from "./CommerceContext";

/** The date window every commerce page filters by — backed by CommerceContext. */
export function CommerceDateFilter() {
  const { dateRange, setDateRange } = useCommerce();
  return <DateRangeSelector value={dateRange} onChange={setDateRange} />;
}

/**
 * Export button with a format picker. `onExport` receives the chosen format and
 * is expected to fire the page's export mutation with the on-screen filters.
 */
export function CommerceExportButton({
  onExport,
  isPending,
  disabled,
  label = "Export",
}: Readonly<{
  onExport: (format: SpreadsheetFormat) => void;
  isPending?: boolean;
  disabled?: boolean;
  label?: string;
}>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" disabled={disabled || isPending} />}
      >
        {isPending ? (
          <IconLoader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <IconDownload data-icon="inline-start" />
        )}
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onExport("xlsx")}>Download as Excel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("ods")}>Download as ODS</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
