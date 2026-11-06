import { useTranslation } from "react-i18next";

import {
  useGetShareSettings,
  useUpdateShareSettingsMutation,
} from "@/backend/surveyShareSettings/surveyShareSettings.query";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import type { QrDesign } from "@/components/common/qr-designer/qrDesign.ts";
import { QrDesigner } from "@/components/common/qr-designer/QrDesigner.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

/** Mirrors SHARE_SETTINGS_RESOURCES in rateup-api's shareSettings.schema.ts. */
const SAVEABLE_RESOURCES = new Set(["survey", "generateQr"]);

interface ShareQRProps {
  url: string;
  title: string;
  isPublished: boolean;
  /** With `queryKey` and a saveable `resourceName`, the design is loaded and saved. */
  id?: string;
  queryKey?: string;
  resourceName?: string;
  /** Inside an existing card, drop the designer's own cards. */
  flat?: boolean;
}

/** The share QR for a survey, flow or automation link: design it, then download or print. */
const ShareQR = ({ url, title, isPublished, id, queryKey, resourceName, flat }: ShareQRProps) => {
  const { t } = useTranslation();
  const saveable = !!id && !!queryKey && SAVEABLE_RESOURCES.has(resourceName ?? "");
  const settings = useGetShareSettings(queryKey, resourceName, saveable ? id : "");
  const mutation = useUpdateShareSettingsMutation(queryKey, resourceName, id ?? "");

  const save = async (design: QrDesign) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(design)) {
      body.append(key, value instanceof File ? value : String(value));
    }
    try {
      await mutation.mutateAsync({ params: { resourceName, id }, body });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        title={t("QR code")}
        hint={isPublished ? t("For posters, receipts and table cards.") : undefined}
      />
      {saveable && settings.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <QrDesigner
          key={id ?? url}
          url={url}
          fileName={title}
          initial={saveable ? settings.data : null}
          disabled={!isPublished}
          disabledReason={t("Publish to download or print the code.")}
          onSave={saveable ? save : undefined}
          flat={flat}
        />
      )}
    </section>
  );
};

export default ShareQR;
