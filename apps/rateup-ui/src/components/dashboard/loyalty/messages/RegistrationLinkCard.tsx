import { IconDownload } from "@tabler/icons-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyLinkComponent } from "@/components/Survey/ShareSurvey/ShareSurvey.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { FRONTEND_URL } from "@/utils/constants.ts";

/** The join link and its QR. Members join fastest from a card next to the till. */
export function RegistrationLinkCard({ orgId }: Readonly<{ orgId: string | undefined }>) {
  const { t } = useTranslation();
  const [qr, setQr] = useState<string | null>(null);
  const url = orgId ? `${FRONTEND_URL}/loyalty/${orgId}/register` : "";

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 512, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("Registration link")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("Put this on the counter, on receipts, anywhere. Joining takes one message.")}
            </p>
          </div>
          <CopyLinkComponent value={url} disabled={!url} />
          <p className="text-xs text-muted-foreground">
            {t(
              "Members join fastest from a card next to the till. The QR is ready before the program is.",
            )}
          </p>
        </div>
        {qr && (
          <div className="flex flex-col items-center gap-2">
            <img
              src={qr}
              alt={t("QR code for the registration link")}
              className="size-36 rounded-md border border-border"
            />
            <Button
              variant="outline"
              size="sm"
              render={<a href={qr} download="loyalty-join-qr.png" />}
            >
              <IconDownload size={14} />
              {t("Download QR")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
