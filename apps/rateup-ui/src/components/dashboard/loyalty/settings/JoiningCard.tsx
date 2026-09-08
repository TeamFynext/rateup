import { IconDownload } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyButton } from "@/components/common/copy-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import { loyaltyRegistrationUrl } from "../registrationLink.ts";

/**
 * The join link, as two buttons: copy it, or download the QR for the counter. The URL
 * itself is not shown — nobody reads it, they paste it.
 */
export function JoiningCard({ orgId }: Readonly<{ orgId: string | undefined }>) {
  const { t } = useTranslation();
  const [qr, setQr] = useState<string | null>(null);
  const url = orgId ? loyaltyRegistrationUrl(orgId) : "";

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
      <CardHeader>
        <CardTitle className="text-base">{t("Registration link")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          {t(
            "Customers join from this link or QR — on the counter, on receipts, anywhere. Joining takes one message.",
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            value={url}
            label={t("Copy registration link")}
            toastMessage={t("Registration link copied")}
          />
          {qr && (
            <Button variant="outline" render={<a href={qr} download="loyalty-join-qr.png" />}>
              <IconDownload size={16} />
              {t("Download QR")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("The welcome they get is the “Joining the program” reply.")}{" "}
          <Link
            to={LOYALTY_PATHS.messages}
            search={{ tab: "replies" }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("Edit it in Messages")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
