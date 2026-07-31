// Extracted verbatim from `InstagramDashboard.tsx`. Behaviour is unchanged.

import {
  IconMessageDots,
  IconPlus,
  IconSend,
  IconTrash,
  IconCloudUpload,
  IconCloudOff,
} from "@tabler/icons-react";
import { useId, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useDeleteInstagramIceBreakersMutation,
  useInstagramProfile,
  useSetInstagramIceBreakersMutation,
  useSyncInstagramIceBreakersMutation,
} from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { IceBreakersPhone } from "@/components/dashboard/instagram/instagram-preview.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import type { DraftIceBreaker } from "./shared.tsx";

export function IceBreakersTab({
  waSettingId,
  businessName,
}: Readonly<{ waSettingId: string; businessName: string }>) {
  const uid = useId();
  const { data } = useInstagramProfile(waSettingId);
  const setMutation = useSetInstagramIceBreakersMutation(waSettingId);
  const syncMutation = useSyncInstagramIceBreakersMutation(waSettingId);
  const deleteMutation = useDeleteInstagramIceBreakersMutation(waSettingId);
  const [items, setItems] = useState<DraftIceBreaker[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    setItems(
      data?.data.iceBreakers?.length
        ? data.data.iceBreakers.map((item) => ({
            id: crypto.randomUUID(),
            question: item.question,
            payload: item.payload,
          }))
        : [{ id: crypto.randomUUID(), question: "", payload: "" }],
    );
  }, [data]);

  const canSave = useMemo(
    () => items.some((item) => item.question.trim() || item.payload.trim()),
    [items],
  );

  const save = () => {
    const payload = items
      .map((item) => ({ question: item.question.trim(), payload: item.payload.trim() }))
      .filter((item) => item.question.length || item.payload.length)
      .slice(0, 4);
    setMutation.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <IconMessageDots className="size-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Ice breaker questions")}</CardTitle>
            <CardDescription>
              {t("Up to 4 starter questions shown when users open your Instagram DM.")}
            </CardDescription>
          </div>
          <PhonePreviewButton platform="instagram">
            <IceBreakersPhone items={items} businessName={businessName} />
          </PhonePreviewButton>
          <Badge variant="outline" className="text-xs tabular-nums">
            {items.length}/4
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group relative space-y-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {t("Question {number}", { number: index + 1 })}
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                    />
                  }
                >
                  <IconTrash className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{t("Remove question")}</TooltipContent>
              </Tooltip>
            </div>
            <Field>
              <FieldLabel
                htmlFor={`${uid}-field-${index}`}
                className="text-xs text-muted-foreground"
              >
                {t("Question text")}
              </FieldLabel>
              <Input
                id={`${uid}-field-${index}`}
                value={item.question}
                placeholder={t("e.g. What are your business hours?")}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...next[index], question: e.target.value };
                  setItems(next);
                }}
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor={`${uid}-field-2-${index}`}
                className="text-xs text-muted-foreground"
              >
                {t("Payload")}
              </FieldLabel>
              <Textarea
                id={`${uid}-field-2-${index}`}
                value={item.payload}
                placeholder={t("Payload sent when this question is tapped")}
                rows={2}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...next[index], payload: e.target.value };
                  setItems(next);
                }}
              />
            </Field>
          </div>
        ))}

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setItems((c) => [...c, { id: crypto.randomUUID(), question: "", payload: "" }])
            }
            disabled={items.length >= 4}
          >
            <IconPlus className="mr-1.5 size-4" />
            {t("Add question")}
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <IconCloudOff className="mr-1.5 size-4" />
            {t("Clear from Meta")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <IconCloudUpload className="mr-1.5 size-4" />
            {t("Sync with Meta")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!canSave || setMutation.isPending}
          >
            <IconSend className="mr-1.5 size-4" />
            {t("Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
