import {
  IconMenu2,
  IconPlus,
  IconSend,
  IconTrash,
  IconCloudUpload,
  IconCloudOff,
} from "@tabler/icons-react";
import { useId, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useDeleteInstagramPersistentMenuMutation,
  useInstagramProfile,
  useSetInstagramPersistentMenuMutation,
  useSyncInstagramPersistentMenuMutation,
} from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { PersistentMenuPhone } from "@/components/dashboard/instagram/instagram-preview.tsx";
import {
  ChannelPreviewButton,
  WithChannelPreview,
} from "@/components/dashboard/meta-channels/ChannelPreview.tsx";
import { ChannelSection } from "@/components/dashboard/meta-channels/ChannelSection.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useCan } from "@/hooks/usePermission.ts";

import type { DraftMenuItem } from "./shared.tsx";

export function PersistentMenuTab({
  channelId,
  businessName,
}: Readonly<{ channelId: string; businessName: string }>) {
  const uid = useId();
  const { data } = useInstagramProfile(channelId);
  const setMutation = useSetInstagramPersistentMenuMutation(channelId);
  const syncMutation = useSyncInstagramPersistentMenuMutation(channelId);
  const deleteMutation = useDeleteInstagramPersistentMenuMutation(channelId);
  const canManage = useCan("channels.manage");
  const locale = "default";
  const [items, setItems] = useState<DraftMenuItem[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    const existing = data?.data.persistentMenu?.[0];
    setItems(
      existing?.call_to_actions?.length
        ? existing.call_to_actions.map((item) => ({
            id: crypto.randomUUID(),
            type: item.type,
            title: item.title,
            payload: item.payload || "",
            url: item.url || "",
          }))
        : [{ id: crypto.randomUUID(), type: "postback" as const, title: "", payload: "", url: "" }],
    );
  }, [data]);

  const canSave = useMemo(() => items.some((item) => item.title.trim().length > 0), [items]);

  const updateItem = (index: number, patch: Partial<DraftMenuItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const save = () => {
    const call_to_actions = items
      .map((item) => ({
        type: item.type,
        title: item.title.trim(),
        payload: item.type === "postback" ? item.payload.trim() : undefined,
        url: item.type === "web_url" ? item.url.trim() : undefined,
      }))
      .filter((item) => item.title.length > 0)
      .slice(0, 5);

    setMutation.mutate([{ locale, call_to_actions }]);
  };

  const preview = <PersistentMenuPhone items={items} businessName={businessName} />;

  return (
    <WithChannelPreview platform="instagram" preview={preview}>
      <ChannelSection
        icon={IconMenu2}
        title={t("Menu entries")}
        description={t(
          "Postback items trigger in-conversation actions. Web URL items open external links. Max 5 items.",
        )}
        actions={
          <>
            <ChannelPreviewButton platform="instagram">{preview}</ChannelPreviewButton>
            <Badge variant="outline" className="text-xs tabular-nums">
              {items.length}/5
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
              className="group space-y-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {item.type === "postback" ? t("Postback") : t("Web URL")}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("Item {number}", { number: index + 1 })}
                  </span>
                </div>
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
                        disabled={items.length <= 1}
                      />
                    }
                  >
                    <IconTrash className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>{t("Remove item")}</TooltipContent>
                </Tooltip>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor={`${uid}-field-5-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    {t("Type")}
                  </FieldLabel>
                  <Select
                    // A fieldset does not reach Base UI's Select, so it is disabled explicitly.
                    disabled={!canManage}
                    value={item.type}
                    onValueChange={(v) => updateItem(index, { type: v ?? "postback" })}
                    items={[
                      { value: "postback", label: t("Postback") },
                      { value: "web_url", label: t("Web URL") },
                    ]}
                  >
                    <SelectTrigger id={`${uid}-field-5-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postback">{t("Postback")}</SelectItem>
                      <SelectItem value="web_url">{t("Web URL")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor={`${uid}-field-6-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    {t("Title")}
                  </FieldLabel>
                  <Input
                    id={`${uid}-field-6-${index}`}
                    value={item.title}
                    placeholder={t("e.g. Talk to an agent")}
                    onChange={(e) => updateItem(index, { title: e.target.value })}
                  />
                </Field>
              </div>

              {item.type === "postback" ? (
                <Field>
                  <FieldLabel
                    htmlFor={`${uid}-field-7-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    {t("Payload")}
                  </FieldLabel>
                  <Textarea
                    id={`${uid}-field-7-${index}`}
                    value={item.payload}
                    placeholder={t("e.g. CARE_HELP")}
                    rows={2}
                    onChange={(e) => updateItem(index, { payload: e.target.value })}
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel
                    htmlFor={`${uid}-field-8-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    {t("URL")}
                  </FieldLabel>
                  <Input
                    id={`${uid}-field-8-${index}`}
                    value={item.url}
                    placeholder="https://example.com"
                    type="url"
                    onChange={(e) => updateItem(index, { url: e.target.value })}
                  />
                </Field>
              )}
            </div>
          ))}

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((c) => [
                  ...c,
                  { id: crypto.randomUUID(), type: "postback", title: "", payload: "", url: "" },
                ])
              }
              disabled={items.length >= 5}
            >
              <IconPlus className="mr-1.5 size-4" />
              {t("Add item")}
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
