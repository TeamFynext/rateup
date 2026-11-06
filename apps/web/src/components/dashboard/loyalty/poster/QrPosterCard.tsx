import { IconDownload, IconPrinter } from "@tabler/icons-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import type { LoyaltyProgram } from "@/backend/loyalty/program.api";
import { CopyButton } from "@/components/common/copy-button.tsx";
import { Button } from "@/components/ui/button.tsx";

import { QrPoster } from "./QrPoster.tsx";
import { usePosterExport } from "./usePosterExport.ts";

/** What the poster reads off the programme. Kept narrow so Settings can pass its own row. */
export type PosterProgram = Pick<
  LoyaltyProgram,
  "name" | "businessName" | "currencyName" | "brandColor" | "logoUrl" | "heroImageUrl"
>;

/**
 * The poster in a preview well, with Download, Print and Copy link underneath. `url` is
 * the WhatsApp join link the QR encodes — the caller only renders this once a number is
 * connected, so the poster never ships a code that opens nothing.
 */
export function QrPosterCard({
  program,
  url,
  caption,
  joinKeyword,
}: Readonly<{ program: PosterProgram; url: string; caption: string; joinKeyword: string }>) {
  const { t } = useTranslation();
  const posterRef = useRef<HTMLDivElement>(null);
  const { qrDataUrl, exporting, exportSafe, download, print } = usePosterExport(url, posterRef);
  const filename = `${program.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "loyalty"}-join-poster.png`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center overflow-x-auto rounded-xl bg-muted p-4 sm:p-6">
        <QrPoster
          ref={posterRef}
          venueName={program.businessName ?? program.name}
          programName={program.name}
          pointsName={program.currencyName}
          brandColor={program.brandColor ?? "#1c518e"}
          logoUrl={program.logoUrl}
          heroImageUrl={program.heroImageUrl}
          caption={caption}
          joinKeyword={joinKeyword}
          qrDataUrl={qrDataUrl}
          exportSafe={exportSafe}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => download(filename)} disabled={exporting || !qrDataUrl}>
          <IconDownload size={16} />
          {exporting ? t("Preparing…") : t("Download poster")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => print()}
          disabled={exporting || !qrDataUrl}
        >
          <IconPrinter size={16} />
          {t("Print")}
        </Button>
        <CopyButton
          variant="ghost"
          value={url}
          label={t("Copy WhatsApp join link")}
          toastMessage={t("WhatsApp join link copied")}
        />
      </div>
    </div>
  );
}
