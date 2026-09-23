import { IconDots, IconPencil, IconScan, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { GeneratedQr } from "@/backend/generateQr/generateQr.api.ts";
import { QrThumbnail } from "@/components/common/qr-designer/QrThumbnail.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

import { CopyButton } from "../shared/CopyButton.tsx";
import { QR_LINKS_PATHS, qrShortUrl } from "../shared/paths.ts";

export function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function QrCodeTile({
  qr,
  onRename,
  onDelete,
}: Readonly<{ qr: GeneratedQr; onRename: () => void; onDelete: () => void }>) {
  const { t } = useTranslation();
  const params = { shortUrlId: qr.shortUrlId };

  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full items-start gap-4">
        <Link
          to={QR_LINKS_PATHS.qrCode}
          params={params}
          tabIndex={-1}
          aria-hidden="true"
          className="shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10"
        >
          <QrThumbnail
            value={`${qrShortUrl(qr.shortUrlId)}?qr=1`}
            color={qr.shareSettings?.qrColor}
            background={qr.shareSettings?.qrBgColor}
            className="size-20"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-1">
            <Link
              to={QR_LINKS_PATHS.qrCode}
              params={params}
              className="line-clamp-2 min-w-0 flex-1 font-medium leading-snug hover:underline"
            >
              {qr.name}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="-mt-1 -mr-2"
                    aria-label={t("Actions for {name}", { name: qr.name })}
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
          <p className="truncate text-xs text-muted-foreground" title={qr.link}>
            {t("To {host}", { host: hostOf(qr.link) })}
          </p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconScan className="size-3.5" aria-hidden="true" />
              {t("{count, plural, one {# scan} other {# scans}}", { count: qr.noOfScans })}
            </span>
            <CopyButton
              value={qrShortUrl(qr.shortUrlId)}
              label={t("Copy the link for {name}", { name: qr.name })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
