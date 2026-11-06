import { Badge } from "@rateup/ui/components/badge";
import { Button } from "@rateup/ui/components/button";
import { Field, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { Separator } from "@rateup/ui/components/separator";
import { Textarea } from "@rateup/ui/components/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
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
import {
  ChannelPreviewButton,
  WithChannelPreview,
} from "@/components/dashboard/meta-channels/ChannelPreview.tsx";
import { ChannelSection } from "@/components/dashboard/meta-channels/ChannelSection.tsx";
import { useCan } from "@/hooks/usePermission.ts";

import type { DraftIceBreaker } from "./shared.tsx";

export function IceBreakersTab({
  channelId,
  businessName,
}: Readonly<{ channelId: string; businessName: string }>) {
  const uid = useId();
  const { data } = useInstagramProfile(channelId);
  const setMutation = useSetInstagramIceBreakersMutation(channelId);
  const syncMutation = useSyncInstagramIceBreakersMutation(channelId);
  const deleteMutation = useDeleteInstagramIceBreakersMutation(channelId);
  const canManage = useCan("channels.manage");
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

  const preview = <IceBreakersPhone items={items} businessName={businessName} />;

  return (
    <WithChannelPreview platform="instagram" preview={preview}>
      <ChannelSection
        icon={IconMessageDots}
        title={t("Ice breaker questions")}
        description={t("Up to 4 starter questions shown when users open your Instagram DM.")}
        actions={
          <>
            <ChannelPreviewButton platform="instagram">{preview}</ChannelPreviewButton>
            <Badge variant="outline" className="text-xs tabular-nums">
              {items.length}/4
            </Badge>
          </>
        }
      >
        {!canManage && (
          <p className="text-sm text-muted-foreground">
            {t(
              "You can view these settings. Ask an admin for the manage channels permission to change them.",
            )}
          </p>
        )}
        {/* Writes need `channels.manage` on the API; without it the fieldset disables every
            control natively. The phone preview stays usable. */}
        <fieldset disabled={!canManage} className="min-w-0 space-y-4">
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
                        aria-label={t("Delete")}
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
            <div className="ml-auto flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
              >
                <IconCloudOff className="mr-1.5 size-4" />
                {t("Clear from Meta")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => syncMutation.mutate()}
                loading={syncMutation.isPending}
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
          </div>
        </fieldset>
      </ChannelSection>
    </WithChannelPreview>
  );
}
