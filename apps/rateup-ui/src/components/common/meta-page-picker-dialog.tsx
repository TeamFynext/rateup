// The page picker behind both the Messenger and the Instagram connect modals. Both
// channels hang off a Facebook Page on the WhatsApp channel's settings, so the only
// differences are the copy, which pages can be picked, and which fields get saved.

import { IconRefresh } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { MetaAssets, WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useMetaAssets,
  useSyncFbPages,
  useUpsertWaSettingsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";

export type WaSetting = WaSettings[number];
export type FbPage = MetaAssets["pages"][number];

/** The channel fields a connect or disconnect writes; anything left out is untouched. */
export interface PagePayload {
  fbPageId?: string | null;
  pageAccessToken?: string | null;
  ibaId?: string | null;
}

// Fallback when a page has no picture (or it fails to load): a stable colour per page.
const PAGE_TILE_COLORS = [
  "bg-teal-500",
  "bg-violet-400",
  "bg-amber-400",
  "bg-sky-500",
  "bg-rose-400",
  "bg-emerald-500",
];

function pageTileColor(pageId: string) {
  let hash = 0;
  for (const char of pageId) hash = (hash + char.charCodeAt(0)) % PAGE_TILE_COLORS.length;
  return PAGE_TILE_COLORS[hash];
}

export function MetaPagePickerDialog({
  opened,
  close,
  selectedWaSettings,
  title,
  description,
  countLabel,
  emptyText,
  unavailableHint,
  savedPageId,
  isPickable = () => true,
  toPayload,
  pageImage = (page) => page.pictureUrl,
  pageSubtitle,
}: Readonly<{
  opened: boolean;
  close: () => void;
  selectedWaSettings: WaSetting | null;
  title: string;
  description: string;
  /** Heading above the list, given the number of pages that can be picked. */
  countLabel: (count: number) => string;
  emptyText: string;
  /** Shown under a page that `isPickable` rejects. */
  unavailableHint?: string;
  /** The page this channel is connected through, or `null` when it isn't connected. */
  savedPageId: (setting: WaSetting) => string | null;
  isPickable?: (page: FbPage) => boolean;
  /**
   * What to save for the ticked page, or for `null` when the connected page was unticked.
   * Disconnect payloads should clear only what belongs to this channel.
   */
  toPayload: (page: FbPage | null) => PagePayload;
  /** Picture for a page's row; defaults to the Page's own profile picture. */
  pageImage?: (page: FbPage) => string | undefined;
  /** Secondary line under a pickable page's name. */
  pageSubtitle?: (page: FbPage) => string | undefined;
}>) {
  const waSettingsId = selectedWaSettings?.id ?? "";
  const { data: metaAssets, isLoading } = useMetaAssets(waSettingsId);

  const upsertMutation = useUpsertWaSettingsMutation();
  const { mutate: syncPages, isPending: isSyncing } = useSyncFbPages(waSettingsId);

  const { t: translations } = useTranslation();

  // The ticked page id: `undefined` while untouched (the saved page shows as ticked),
  // `null` once the user unticks it.
  const [draft, setDraft] = useState<string | null | undefined>(undefined);

  // Pull a fresh page list from Meta once each time the modal opens, so pages
  // granted since the last sync show up without the user hunting for a button.
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!opened) {
      syncedFor.current = null;
      return;
    }
    if (!waSettingsId || syncedFor.current === waSettingsId) return;
    syncedFor.current = waSettingsId;
    syncPages({ silent: true });
  }, [opened, waSettingsId, syncPages]);

  if (!selectedWaSettings) return null;

  const pages = metaAssets?.pages ?? [];
  // Pickable pages first, so the ones that can't be used don't bury them.
  const rows = pages
    .map((page) => ({ page, pickable: isPickable(page) }))
    .sort((a, b) => Number(!a.pickable) - Number(!b.pickable));
  const selectableCount = rows.filter((row) => row.pickable).length;

  const connectedPageId = savedPageId(selectedWaSettings);
  const selectedPageId = draft === undefined ? connectedPageId : draft;
  const showSkeleton = isLoading || (isSyncing && rows.length === 0);

  const handleClose = () => {
    setDraft(undefined);
    close();
  };

  // One Page per WhatsApp channel, so checking a page replaces the previous one
  // and unchecking the current one disconnects.
  const togglePage = (page: FbPage) => {
    setDraft(selectedPageId === page.id ? null : page.id);
  };

  const save = () => {
    // Nothing changed: an existing connection has nothing to save, and a new one
    // needs a page first.
    if (selectedPageId === connectedPageId) {
      if (connectedPageId) handleClose();
      else toast.warning(translations("Please select a page"));
      return;
    }

    const page = selectedPageId ? pages.find((item) => item.id === selectedPageId) : null;
    if (page === undefined) {
      toast.error(translations("Page not found"));
      return;
    }

    upsertMutation.mutate(
      {
        ...selectedWaSettings,
        ...toPayload(page),
        teams: undefined as string[] | undefined,
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <Dialog open={opened} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{countLabel(selectableCount)}</span>

            <Button variant="ghost" size="sm" onClick={() => syncPages()} disabled={isSyncing}>
              <IconRefresh className={cn("size-4", isSyncing && "animate-spin")} />
              {isSyncing ? translations("Syncing...") : translations("Sync Facebook Pages")}
            </Button>
          </div>

          {showSkeleton ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex items-center gap-3 px-2 py-2">
                  <Skeleton className="size-10 rounded-md" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          ) : rows.length ? (
            <div
              // overflow-x-hidden: the checkbox's enlarged hit area pokes past the row's
              // padding, and overflow-y-auto would otherwise turn that into a horizontal
              // scrollbar. The whole row is the click target anyway.
              className="max-h-72 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain"
            >
              {rows.map(({ page, pickable }) => {
                const subtitle = pickable ? pageSubtitle?.(page) : unavailableHint;
                return (
                  <label
                    key={page.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-2",
                      pickable ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed",
                    )}
                  >
                    {/* Meta's picture URLs are signed and expire, so a stale one from the
                      last sync fails to load — the letter tile covers that until the
                      on-open sync swaps in a fresh URL. */}
                    <Avatar
                      aria-hidden
                      className={cn(
                        "size-10 rounded-md after:rounded-md",
                        !pickable && "opacity-40",
                      )}
                    >
                      <AvatarImage src={pageImage(page)} alt="" className="rounded-md" />
                      <AvatarFallback
                        className={cn(
                          "rounded-md text-base font-semibold text-white",
                          pageTileColor(page.id),
                        )}
                      >
                        {page.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-base",
                          !pickable && "text-muted-foreground",
                        )}
                      >
                        {page.name}
                      </span>
                      {subtitle && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {subtitle}
                        </span>
                      )}
                    </span>
                    <Checkbox
                      className="size-5"
                      checked={pickable && selectedPageId === page.id}
                      disabled={!pickable}
                      onCheckedChange={() => pickable && togglePage(page)}
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-muted px-4 py-6 text-center text-muted-foreground">
              {emptyText}
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="secondary" size="lg" onClick={handleClose}>
            {translations("Cancel")}
          </Button>
          <Button size="lg" onClick={save} loading={upsertMutation.isPending}>
            {upsertMutation.isPending
              ? translations("Loading...")
              : connectedPageId && !selectedPageId
                ? translations("Disconnect")
                : translations("Connect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
