import { Button } from "@rateup/ui/components/button";
import { Label } from "@rateup/ui/components/label";
import { Switch } from "@rateup/ui/components/switch";
import { IconSpeakerphone, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useInboxCampaignOptions } from "@/backend/whatsapp/inbox/message/wamessage.query.ts";
import {
  Combobox,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { useChatFilterStore } from "@/store/chat-filter.store.ts";

/**
 * Narrows the inbox list to one campaign's tickets, so the replies to a send can be
 * found and worked through. Picking a campaign turns "Replied only" on, since the
 * replies are what someone opening this is after; the bar below the header turns it off.
 */
export function CampaignFilterButton() {
  const { t } = useTranslation();
  const { filter, setFilter } = useChatFilterStore();
  const [open, setOpen] = useState(false);
  const { data: campaigns } = useInboxCampaignOptions(open || Boolean(filter.campaigns?.length));
  const selected = filter.campaigns?.[0] ?? null;

  const items = (campaigns ?? []).map((campaign) => ({
    value: campaign.id,
    label: campaign.name,
    sentAt: campaign.sentAt,
  }));

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(campaignId: string | null) => {
        setOpen(false);
        if (!campaignId) return;
        setFilter({ ...filter, campaigns: [campaignId], campaignReplied: true });
      }}
      open={open}
      onOpenChange={setOpen}
    >
      <CustomTooltip
        trigger={
          <ComboboxTrigger
            render={
              <button
                aria-label={t("Filter by campaign")}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md border-0 bg-transparent p-0 outline-none",
                  selected && "bg-primary/10 text-primary",
                )}
              />
            }
          >
            <IconSpeakerphone className="size-4 cursor-pointer" />
          </ComboboxTrigger>
        }
        content={<p>{t("Filter by campaign")}</p>}
        side="bottom"
      />
      <ComboboxContent className="w-72 p-0" align="end">
        <ComboboxChipsInput
          placeholder={t("Search campaigns...")}
          className="h-9 w-full rounded-none border-0 border-b px-3"
        />
        <ComboboxEmpty>{t("No sent campaigns found.")}</ComboboxEmpty>
        <ComboboxList className="max-h-72">
          {(item: (typeof items)[number]) => (
            <ComboboxItem key={item.value} value={item.value} className="flex-col items-start">
              <span className="truncate text-sm">{item.label}</span>
              {item.sentAt && (
                <span className="text-xs text-muted-foreground">
                  {t("Sent {date}", { date: dayjs(item.sentAt).format("D MMM YYYY") })}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** Shown under the list header while a campaign filter is on: what it is, and how to undo it. */
export function CampaignFilterBar() {
  const { t } = useTranslation();
  const { filter, setFilter } = useChatFilterStore();
  const campaignId = filter.campaigns?.[0];
  const { data: campaigns } = useInboxCampaignOptions(Boolean(campaignId));

  if (!campaignId) return null;
  const name = campaigns?.find((campaign) => campaign.id === campaignId)?.name ?? t("Campaign");

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-primary/5 px-3 py-1.5 text-xs">
      <IconSpeakerphone className="size-3.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground" title={name}>
        {name}
      </span>
      <Label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-normal text-muted-foreground">
        <Switch
          size="sm"
          checked={Boolean(filter.campaignReplied)}
          onCheckedChange={(checked) => setFilter({ ...filter, campaignReplied: checked })}
        />
        {t("Replied only")}
      </Label>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label={t("Clear campaign filter")}
        onClick={() => setFilter({ ...filter, campaigns: [], campaignReplied: false })}
      >
        <IconX className="size-3" />
      </Button>
    </div>
  );
}
