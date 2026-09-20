import { IconBrandWhatsapp, IconDownload, IconQrcode } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CopyButton } from "@/components/common/copy-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

import { formatWhatsappNumber, whatsappJoinUrl } from "../joinLink.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { QrPosterCard, type PosterProgram } from "../poster/QrPosterCard.tsx";
import { loyaltyRegistrationUrl } from "../registrationLink.ts";

/**
 * How customers join: the web registration link to paste anywhere, and — once a WhatsApp
 * number is connected — the QR that opens a chat with the join keyword typed in, as a
 * branded poster or a bare code. Without a number there is no QR, only the way to get one.
 */
export function JoiningCard({
  orgId,
  program,
  whatsappNumber,
  joinKeyword,
}: Readonly<{
  orgId: string | undefined;
  program?: PosterProgram;
  whatsappNumber: string | null;
  joinKeyword: string;
}>) {
  const { t } = useTranslation();
  const [qr, setQr] = useState<string | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);
  const webUrl = orgId ? loyaltyRegistrationUrl(orgId) : "";
  const joinUrl = whatsappNumber ? whatsappJoinUrl(whatsappNumber, joinKeyword) : null;

  useEffect(() => {
    if (!joinUrl) {
      setQr(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { width: 512, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">{t("Joining")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          {joinUrl
            ? t(
                "The QR opens WhatsApp with “{keyword}” ready to send. Put it on the counter, on receipts, anywhere.",
                { keyword: joinKeyword },
              )
            : t(
                "Customers can join from the registration link, or by scanning a QR once WhatsApp is connected.",
              )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {webUrl && (
            <CopyButton
              value={webUrl}
              label={t("Copy registration link")}
              toastMessage={t("Registration link copied")}
            />
          )}
          {joinUrl && (
            <CopyButton
              variant="outline"
              value={joinUrl}
              label={t("Copy WhatsApp join link")}
              toastMessage={t("WhatsApp join link copied")}
            />
          )}
          {program && joinUrl && (
            <Button variant="outline" onClick={() => setPosterOpen(true)}>
              <IconQrcode size={16} />
              {t("Download poster")}
            </Button>
          )}
          {qr && (
            <Button variant="ghost" render={<a href={qr} download="loyalty-join-qr.png" />}>
              <IconDownload size={16} />
              {t("Plain QR")}
            </Button>
          )}
        </div>
        {!joinUrl && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-ru-green-50 px-3 py-2 text-sm text-ru-green-700 dark:bg-ru-green-700/20 dark:text-ru-green-300">
            <IconBrandWhatsapp size={18} className="shrink-0" />
            <span className="min-w-0 flex-1">
              {t("Connect a WhatsApp number to get your join QR.")}
            </span>
            <Button size="sm" variant="outline" render={<Link to="/dashboard/settings/channels" />}>
              {t("Connect WhatsApp")}
            </Button>
          </div>
        )}
        {program && joinUrl && whatsappNumber && (
          <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto overscroll-contain sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("QR poster")}</DialogTitle>
                <DialogDescription>
                  {t("Your logo, colour and join code on one printable card.")}
                </DialogDescription>
              </DialogHeader>
              <QrPosterCard
                program={program}
                url={joinUrl}
                caption={formatWhatsappNumber(whatsappNumber)}
                joinKeyword={joinKeyword}
              />
            </DialogContent>
          </Dialog>
        )}
        <p className="text-xs text-muted-foreground">
          {t("The keyword and the welcome they get are the “Joining the program” reply.")}
          {""}
          <Link
            to={LOYALTY_PATHS.messages}
            search={{ tab: "replies" }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("Edit it in Messages")}
          </Link>
          {" · "}
          <Link
            to={LOYALTY_PATHS.materials}
            search={{ tab: "qr" }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("Edit the card in Materials")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
