import { IconLayoutList, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { LinktreeData } from "@/backend/linktree/linktree.api.ts";
import { useDeleteLinktreeMutation, useLinktrees } from "@/backend/linktree/linktree.query";
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
import { LinkPageDialog } from "./LinkPageDialog.tsx";
import { LinkPageTile } from "./LinkPageTile.tsx";

export function LinkPagesPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data, isPending, isError, refetch } = useLinktrees();
  const remove = useDeleteLinktreeMutation();
  const all = data ?? [];
  const { search, setSearch, sort, setSort, visible } = useListFilter(all);

  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<LinktreeData | null>(null);

  const deletePage = async (page: LinktreeData) => {
    const ok = await confirm({
      title: t("Delete {name}?", { name: page.name }),
      description: t("Anyone who opens its link, or scans a QR code for it, will find nothing."),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });
    if (ok) remove.mutate(page.id);
  };

  const createButton = (
    <Button onClick={() => setCreating(true)}>
      <IconPlus data-icon="inline-start" />
      {t("Create link page")}
    </Button>
  );

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-5">
      <PageHeading
        title={t("Link pages")}
        description={t(
          "One short link that opens a page of buttons: your surveys, WhatsApp, menu, website.",
        )}
        actions={all.length > 0 ? createButton : undefined}
      />

      {all.length > 0 && (
        <ListToolbar
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          placeholder={t("Search link pages")}
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
              <IconLayoutList />
            </EmptyMedia>
            <EmptyTitle>{t("No link pages yet")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "Make one for your Instagram bio, or print its QR code so customers can pick a survey.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{createButton}</EmptyContent>
        </Empty>
      ) : visible.length === 0 ? (
        <NoSearchMatches onClear={() => setSearch("")} />
      ) : (
        <div className={TILE_GRID}>
          {visible.map((page) => (
            <LinkPageTile
              key={page.id}
              page={page}
              onRename={() => setRenaming(page)}
              onDelete={() => void deletePage(page)}
            />
          ))}
        </div>
      )}

      <LinkPageDialog mode="create" open={creating} onOpenChange={setCreating} />
      {renaming && (
        <LinkPageDialog
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
