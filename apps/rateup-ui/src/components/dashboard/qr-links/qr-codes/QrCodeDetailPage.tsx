import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { GeneratedQr } from "@/backend/generateQr/generateQr.api.ts";
import { useGetQrWithShortUrlId, useUpdateQrMutation } from "@/backend/generateQr/generateQr.query";
import {
  useGetShareSettings,
  useUpdateShareSettingsMutation,
} from "@/backend/surveyShareSettings/surveyShareSettings.query";
import { BackLink } from "@/components/common/back-link.tsx";
import { PageHeading, SectionHeading } from "@/components/common/page-heading.tsx";
import type { QrDesign } from "@/components/common/qr-designer/qrDesign.ts";
import { QrDesigner } from "@/components/common/qr-designer/QrDesigner.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { isNotFound } from "@/utils/apiError.ts";

import { CopyField } from "../shared/CopyField.tsx";
import { ListLoadError, RecordNotFound } from "../shared/ListStates.tsx";
import { QR_LINKS_PATHS, qrShortUrl } from "../shared/paths.ts";
import { destinationUrlSchema } from "./destinationUrl.ts";
import { QrCodeDialog } from "./QrCodeDialog.tsx";

export function QrCodeDetailPage({ shortUrlId }: Readonly<{ shortUrlId: string }>) {
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch } = useGetQrWithShortUrlId(shortUrlId);
  const [renaming, setRenaming] = useState(false);

  const { update: setBreadcrumb } = useRouteParams();
  useEffect(() => {
    if (data?.name) setBreadcrumb({ shortUrlId: data.name });
  }, [data?.name]);

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-5">
      <BackLink to={QR_LINKS_PATHS.qrCodes} label={t("QR codes")} />
      {isPending ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : isError && isNotFound(error) ? (
        <RecordNotFound
          title={t("This QR code doesn't exist")}
          description={t("It may have been deleted. Your other QR codes are on the list.")}
        />
      ) : isError ? (
        <ListLoadError onRetry={() => void refetch()} />
      ) : (
        <>
          <PageHeading
            title={data.name}
            description={t("{count, plural, one {Scanned # time} other {Scanned # times}}", {
              count: data.noOfScans,
            })}
            actions={
              <Button variant="outline" onClick={() => setRenaming(true)}>
                <IconPencil data-icon="inline-start" />
                {t("Rename")}
              </Button>
            }
          />
          <DestinationCard key={data.link} qr={data} />
          <DesignCard key={data.id} qr={data} />
          <QrCodeDialog
            mode="rename"
            open={renaming}
            onOpenChange={setRenaming}
            shortUrlId={data.shortUrlId}
            name={data.name}
          />
        </>
      )}
    </div>
  );
}

function DestinationCard({ qr }: Readonly<{ qr: GeneratedQr }>) {
  const { t } = useTranslation();
  const update = useUpdateQrMutation(qr.shortUrlId);
  const form = useForm({
    resolver: zodResolver(z.object({ link: destinationUrlSchema(t) })),
    defaultValues: { link: qr.link },
  });
  const { errors, isDirty } = form.formState;

  const submit = form.handleSubmit(async ({ link }) => {
    await update.mutateAsync({ shortUrlId: qr.shortUrlId, link });
    form.reset({ link });
  });

  return (
    <Card>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
          <Field data-invalid={!!errors.link}>
            <FieldLabel htmlFor="qr-destination">{t("Where it points")}</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="qr-destination"
                type="url"
                inputMode="url"
                aria-invalid={!!errors.link}
                {...form.register("link")}
              />
              {isDirty && (
                <Button type="submit" loading={update.isPending}>
                  {t("Save")}
                </Button>
              )}
            </div>
            <FieldDescription>
              {t("Change this whenever you like. Codes already printed follow the new link.")}
            </FieldDescription>
            <FieldError errors={[errors.link]} />
          </Field>
        </form>
        <Field>
          <FieldLabel htmlFor="qr-short-link">{t("Short link")}</FieldLabel>
          <CopyField
            id="qr-short-link"
            value={qrShortUrl(qr.shortUrlId)}
            copyLabel={t("Copy short link")}
          />
          <FieldDescription>
            {t("What the code contains. Share it where a QR code can't go.")}
          </FieldDescription>
        </Field>
      </CardContent>
    </Card>
  );
}

function DesignCard({ qr }: Readonly<{ qr: GeneratedQr }>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // The settings endpoint, not the record: it turns the stored logo key into a URL.
  const settings = useGetShareSettings("qrShareSettings", "generateQr", qr.id);
  const save = useUpdateShareSettingsMutation("qrShareSettings", "generateQr", qr.id);

  const onSave = async (state: QrDesign) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(state)) {
      body.append(key, value instanceof File ? value : String(value));
    }
    try {
      await save.mutateAsync({ params: { resourceName: "generateQr", id: qr.id }, body });
    } catch {
      return false;
    }
    void queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
    void queryClient.invalidateQueries({ queryKey: ["generatedQr", qr.shortUrlId] });
    return true;
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title={t("Design")} hint={t("What the printed code looks like.")} />
      {settings.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <QrDesigner
          url={`${qrShortUrl(qr.shortUrlId)}?qr=1`}
          fileName={qr.name}
          initial={settings.data}
          onSave={onSave}
        />
      )}
    </section>
  );
}
