import { IconDownload, IconX } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { usePendingApprovalCount } from "@/backend/loyalty/approval/approval.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useExportTransactionsMutation } from "@/backend/loyalty/redemption/redemption.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import { ledgerQueryFor, type ActivityFilter, type ActivitySearch } from "./activity.filters.ts";
import { ActivityLedgerTable } from "./ActivityLedgerTable.tsx";
import { PendingApprovalsTable } from "./PendingApprovalsTable.tsx";

/**
 * Transactions, renamed. Same ledger, same export; Approvals became the Pending filter on
 * the same table, with inline approve / reject.
 */
export function ActivityPage({ search }: Readonly<{ search: ActivitySearch }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: program } = useLoyaltyProgram();
  const { data: pendingCount = 0 } = usePendingApprovalCount();
  const exportLedger = useExportTransactionsMutation();

  const pointsName = program?.currencyName ?? "Points";
  const ledgerQuery = ledgerQueryFor(search);

  const setSearch = (patch: Partial<ActivitySearch>) =>
    navigate({ to: LOYALTY_PATHS.activity, search: { ...search, ...patch } });

  const exportFilters = ledgerQuery
    ? { transactionType: ledgerQuery.transactionType, customerId: ledgerQuery.customerId }
    : {};

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title={t("Activity")}
        description={
          pendingCount > 0
            ? t("{count} requests waiting on you", { count: pendingCount })
            : t("Every {points} in and out", { points: pointsName })
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" loading={exportLedger.isPending} />}
            >
              <IconDownload size={16} />
              {exportLedger.isPending ? t("Exporting…") : t("Export")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => exportLedger.mutate({ filters: exportFilters, format: "csv" })}
              >
                {t("Export as CSV")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportLedger.mutate({ filters: exportFilters, format: "excel" })}
              >
                {t("Export as Excel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={search.filter}
          onValueChange={(value) => setSearch({ filter: value as ActivityFilter, page: 1 })}
        >
          <TabsList>
            <TabsTrigger value="all">{t("All")}</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              {t("Pending")}
              {pendingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-amber-50 px-1.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="earned">{t("Earned")}</TabsTrigger>
            <TabsTrigger value="redeemed">{t("Redeemed")}</TabsTrigger>
          </TabsList>
        </Tabs>
        {search.customerId && (
          <Badge variant="secondary" className="gap-1">
            {t("One customer")}
            <button
              type="button"
              aria-label={t("Show every customer")}
              onClick={() => setSearch({ customerId: undefined, page: 1 })}
            >
              <IconX size={12} />
            </button>
          </Badge>
        )}
      </div>

      {ledgerQuery ? (
        <ActivityLedgerTable
          filters={ledgerQuery}
          pointsName={pointsName}
          currencySymbol={program?.currencySymbol ?? "₹"}
          onPageChange={(page) => setSearch({ page })}
        />
      ) : (
        <PendingApprovalsTable
          page={search.page}
          pointsName={pointsName}
          onPageChange={(page) => setSearch({ page })}
        />
      )}

      <p className="text-xs text-muted-foreground">
        {program?.autoApproveAdjustments
          ? t(
              "Staff adjustments are auto-approved — only tier overrides and bulk operations land under Pending.",
            )
          : t(
              "Approving posts the {points} immediately and tells the customer on WhatsApp. Rejecting leaves a note for whoever asked.",
              {
                points: pointsName,
              },
            )}
      </p>
    </div>
  );
}
