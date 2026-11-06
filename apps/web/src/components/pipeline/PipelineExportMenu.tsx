import { IconDownload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { PipelineExportFormat } from "@/backend/pipeline/pipeline.api.ts";
import { useExportPipelineMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type { LeadListParams } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Downloads what the board is showing — the same filters and search — so the file
 * matches the screen. The columns are the import template's, so it can be edited and
 * uploaded again.
 */
export function PipelineExportMenu({
  pipelineId,
  pipelineName,
  params,
  filtered,
}: Readonly<{
  pipelineId: string;
  pipelineName: string;
  params: LeadListParams;
  /** Whether a filter or search is narrowing the board, which the menu then says. */
  filtered: boolean;
}>) {
  const { t } = useTranslation();
  const exportPipeline = useExportPipelineMutation();

  const download = (format: PipelineExportFormat) =>
    exportPipeline.mutate({ pipelineId, pipelineName, params, format });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            loading={exportPipeline.isPending}
          />
        }
      >
        <IconDownload className="size-4" />
        <span className="hidden sm:inline">{t("Export")}</span>
        <span className="sr-only sm:hidden">{t("Export")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {filtered ? t("Cards matching the current filters") : t("Every card on this board")}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => download("xlsx")}>
            {t("Download as Excel")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => download("ods")}>
            {t("Download as OpenDocument (ODS)")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
