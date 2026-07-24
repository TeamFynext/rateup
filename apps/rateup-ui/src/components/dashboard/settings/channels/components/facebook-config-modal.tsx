import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useMetaAssets,
  useSyncFbPages,
  useUpsertWaSettingsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { FieldTitle } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

type WaSetting = WaSettings[number];

export function FacebookConfigModal({
  opened,
  close,
  selectedWaSettings,
}: Readonly<{
  opened: boolean;
  close: () => void;
  selectedWaSettings: WaSetting | null;
}>) {
  const { data: metaAssets, isLoading } = useMetaAssets(selectedWaSettings?.id);

  const upsertMutation = useUpsertWaSettingsMutation();
  const syncfbpageMut = useSyncFbPages(selectedWaSettings?.id);

  const { t: translations } = useTranslation();

  const initialConfig = {
    fbPageId: null as string | null,
    pageAccessToken: null as string | null,
  };

  const [config, setConfig] = useState(initialConfig);

  useEffect(() => {
    if (!selectedWaSettings) return;

    setConfig({
      fbPageId: selectedWaSettings.fbPageId,
      pageAccessToken: selectedWaSettings.pageAccessToken,
    });
  }, [selectedWaSettings]);

  if (!selectedWaSettings) return null;

  const { ...rest } = selectedWaSettings;

  const fbPages =
    metaAssets?.pages.map((page) => ({
      value: page.id,
      label: page.name,
    })) ?? [];

  return (
    <Dialog open={opened} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translations("Connected Facebook account - FB Page")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Skeleton className={isLoading ? "h-24 w-full" : "hidden"}>
            <div />
          </Skeleton>

          {!isLoading && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <FieldTitle>{translations("Facebook Connected Page")}</FieldTitle>

                <Select
                  value={config.fbPageId ?? ""}
                  onValueChange={(value) => {
                    if (!value) {
                      setConfig(initialConfig);
                      return;
                    }

                    const page = metaAssets?.pages.find((item) => item.id === value);

                    if (!page) {
                      toast.error(translations("Page not found"));
                      return;
                    }

                    setConfig({
                      fbPageId: page.id,
                      pageAccessToken: page.access_token,
                    });
                  }}
                  items={fbPages}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={translations("Select Page")} />
                  </SelectTrigger>

                  <SelectContent>
                    {fbPages.length ? (
                      fbPages.map((page) => (
                        <SelectItem key={page.value} value={page.value}>
                          {page.label}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        {translations("No Pages found")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      onClick={() => syncfbpageMut.mutate()}
                      disabled={syncfbpageMut.isPending}
                    />
                  }
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncfbpageMut.isPending ? "animate-spin" : ""}`}
                  />
                  {translations("Sync FB pages")}
                </TooltipTrigger>

                <TooltipContent>{translations("Sync FB pages")}</TooltipContent>
              </Tooltip>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => {
                const data = {
                  ...rest,
                  fbPageId: config.fbPageId,
                  pageAccessToken: config.pageAccessToken,
                  teams: undefined,
                };

                if (!selectedWaSettings.fbPageId?.length && !data.fbPageId?.length) {
                  toast.warning(translations("Please select a page"));
                  return;
                }

                upsertMutation.mutate(data, {
                  onSuccess: () => close(),
                });
              }}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending
                ? translations("Loading...")
                : selectedWaSettings.fbPageId?.length && !config.fbPageId
                  ? translations("Disconnect")
                  : translations("Connect")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
