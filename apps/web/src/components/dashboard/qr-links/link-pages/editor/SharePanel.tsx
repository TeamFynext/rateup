import { IconBrandFacebook, IconBrandWhatsapp, IconCode, IconMail } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { LinktreeData } from "@/backend/linktree/linktree.api.ts";
import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import type { QrDesign } from "@/components/common/qr-designer/qrDesign.ts";
import { QrDesigner } from "@/components/common/qr-designer/QrDesigner.tsx";
import IFrameModal from "@/components/Survey/ShareSurvey/IFrameModal.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { uploadToCdn } from "@/utils/file-upload/upload.ts";

import { CopyField } from "../../shared/CopyField.tsx";
import { linkPageUrl } from "../../shared/paths.ts";

export function SharePanel({ page }: Readonly<{ page: LinktreeData }>) {
  const { t } = useTranslation();
  const url = linkPageUrl(page.shortUrlId);
  const live = !!page.isPublished;
  const [embedding, setEmbedding] = useState(false);
  const { mutateAsync } = useUpdateLinktreeMutation(page.shortUrlId);

  const message = t("Everything we link to, in one place: {url}", { url });
  const channels = [
    {
      icon: IconBrandWhatsapp,
      label: t("WhatsApp"),
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
    },
    {
      icon: IconMail,
      label: t("Email"),
      href: `mailto:?subject=${encodeURIComponent(page.name)}&body=${encodeURIComponent(message)}`,
    },
    {
      icon: IconBrandFacebook,
      label: t("Facebook"),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
  ];

  /** The QR's logo is uploaded here and stored as a URL; the page record has no upload step. */
  const saveQr = async (state: QrDesign) => {
    const logoFile =
      state.logoFile instanceof File ? await uploadToCdn(state.logoFile) : state.logoFile;
    if (state.logoFile instanceof File && !logoFile) {
      toast.error(t("The logo didn't upload, so nothing was saved. Try again."));
      return false;
    }
    try {
      await mutateAsync({ shortUrlId: page.shortUrlId, shareSettings: { ...state, logoFile } });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!live && (
        <Alert>
          <AlertDescription>
            {t("This page is a draft. Switch on Published at the top before you share it.")}
          </AlertDescription>
        </Alert>
      )}

      <Card size="sm">
        <CardContent className="flex flex-col gap-4">
          <SectionHeading title={t("Page link")} hint={t("Put it in your bio or a message.")} />
          <CopyField value={url} copyLabel={t("Copy page link")} disabled={!live} />
          <div className="flex flex-wrap gap-2">
            {channels.map(({ icon: Icon, label, href }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                disabled={!live}
                render={live ? <a href={href} target="_blank" rel="noreferrer" /> : undefined}
              >
                <Icon data-icon="inline-start" />
                {label}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={!live} onClick={() => setEmbedding(true)}>
              <IconCode data-icon="inline-start" />
              {t("Embed on a website")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title={t("QR code")}
          hint={t("Print it on a counter card, receipt or table tent.")}
        />
        <QrDesigner
          url={url}
          fileName={page.name}
          initial={page.shareSettings}
          disabled={!live}
          disabledReason={t("Publish the page to download or print its code.")}
          onSave={saveQr}
        />
      </section>

      <Dialog open={embedding} onOpenChange={setEmbedding}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-175">
          <DialogHeader>
            <DialogTitle>{t("Embed on a website")}</DialogTitle>
          </DialogHeader>
          <IFrameModal close={() => setEmbedding(false)} shareUrl={url} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
