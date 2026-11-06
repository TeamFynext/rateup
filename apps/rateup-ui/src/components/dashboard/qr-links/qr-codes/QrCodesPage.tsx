import { IconPlus, IconQrcode } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { GeneratedQr } from "@/backend/generateQr/generateQr.api.ts";
import {
  useDeleteQrMutation,
  useGetAllGeneratedQrsQuery,
} from "@/backend/generateQr/generateQr.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

import {
  ListLoadError,
  NoSearchMatches,
  TILE_GRID,
  TileGridSkeleton,
} from "../shared/ListStates.tsx";
import { ListToolbar } from "../shared/ListToolbar.tsx";
import { useListFilter } from "../shared/useListFilter.ts";
import { QrCodeDialog } from "./QrCodeDialog.tsx";
import { QrCodeTile } from "./QrCodeTile.tsx";

export function QrCodesPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data, isPending, isError, refetch } = useGetAllGeneratedQrsQuery();
  const remove = useDeleteQrMutation();
  const all = data ?? [];
  const { search, setSearch, sort, setSort, visible } = useListFilter(all);

  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<GeneratedQr | null>(null);

  const deleteQr = async (qr: GeneratedQr) => {
    const ok = await confirm({
      title: t("Delete {name}?", { name: qr.name }),
      description: t(
        "Printed copies of this code will stop working. Its scan count is deleted too.",
      ),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });
    if (ok) remove.mutate(qr.shortUrlId);
  };

  const createButton = (
    <Button onClick={() => setCreating(true)}>
      <IconPlus data-icon="inline-start" />
      {t("Create QR code")}
    </Button>
  );

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-5">
      <PageHeading
        title={t("QR codes")}
        description={t("Print once, change where it points any time. Every scan is counted.")}
        actions={all.length > 0 ? createButton : undefined}
      />

      {all.length > 0 && (
        <ListToolbar
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          placeholder={t("Search QR codes")}
          shown={visible.length}
          total={all.length}
        />
      )}

      {isPending ? (
        <TileGridSkeleton />
      ) : isError ? (
        <ListLoadError onRetry={() => void refetch()} />
      ) : all.length === 0 ? (
        <Empty className="rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconQrcode />
            </EmptyMedia>
            <EmptyTitle>{t("No QR codes yet")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "Put one on a menu, a receipt or a poster. If the link changes later, the printed code keeps working.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{createButton}</EmptyContent>
        </Empty>
      ) : visible.length === 0 ? (
        <NoSearchMatches onClear={() => setSearch("")} />
      ) : (
        <div className={TILE_GRID}>
          {visible.map((qr) => (
            <QrCodeTile
              key={qr.id}
              qr={qr}
              onRename={() => setRenaming(qr)}
              onDelete={() => void deleteQr(qr)}
            />
          ))}
        </div>
      )}

      <QrCodeDialog mode="create" open={creating} onOpenChange={setCreating} />
      {renaming && (
        <QrCodeDialog
          mode="rename"
          open
          onOpenChange={(open) => !open && setRenaming(null)}
          shortUrlId={renaming.shortUrlId}
          name={renaming.name}
        />
      )}
    </div>
  );
}
