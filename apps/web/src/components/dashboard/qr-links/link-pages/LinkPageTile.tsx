import { IconDots, IconEye, IconLink, IconPencil, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LinktreeData } from "@/backend/linktree/linktree.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

import { CopyButton } from "../shared/CopyButton.tsx";
import { linkPageUrl, QR_LINKS_PATHS } from "../shared/paths.ts";
import { StatusLine } from "../shared/StatusLine.tsx";

export function LinkPageTile({
  page,
  onRename,
  onDelete,
}: Readonly<{ page: LinktreeData; onRename: () => void; onDelete: () => void }>) {
  const { t } = useTranslation();
  const url = linkPageUrl(page.shortUrlId);
  const linkCount = page.links?.length ?? 0;

  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-start gap-1">
          <Link
            to={QR_LINKS_PATHS.linkPage}
            params={{ shortUrlId: page.shortUrlId }}
            className="line-clamp-2 min-w-0 flex-1 font-medium leading-snug hover:underline"
          >
            {page.name}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="-mt-1 -mr-2"
                  aria-label={t("Actions for {name}", { name: page.name })}
                />
              }
            >
              <IconDots />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onRename}>
                <IconPencil />
                {t("Rename")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <IconTrash />
                {t("Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <StatusLine live={!!page.isPublished} label={page.isPublished ? t("Live") : t("Draft")} />
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <IconLink className="size-3.5" aria-hidden="true" />
              {t("{count, plural, one {# link} other {# links}}", { count: linkCount })}
            </span>
            <span className="inline-flex items-center gap-1">
              <IconEye className="size-3.5" aria-hidden="true" />
              {t("{count, plural, one {# visit} other {# visits}}", {
                count: page.visitorsCount ?? 0,
              })}
            </span>
          </div>
          <CopyButton
            value={url}
            label={t("Copy the link for {name}", { name: page.name })}
            disabled={!page.isPublished}
          />
        </div>
      </CardContent>
    </Card>
  );
}
