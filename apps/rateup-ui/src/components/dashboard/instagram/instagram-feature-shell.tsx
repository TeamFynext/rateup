import { IconBrandInstagram } from "@tabler/icons-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

type WaSetting = WaSettings[number];

type InstagramFeatureShellProps = Readonly<{
  title: string;
  description: string;
  eyebrow?: string;
  children: (waSetting: WaSetting) => ReactNode;
  secondaryAction?: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}>;

export function InstagramFeatureShell({
  title,
  description,
  eyebrow = "Instagram management",
  children,
  secondaryAction,
  fallbackTitle = "Connect an Instagram account first",
  fallbackDescription = "These tools operate on an Instagram business account linked to a WhatsApp Business channel.",
}: InstagramFeatureShellProps) {
  const { t: translations } = useTranslation();
  const { data: waSettings, isLoading } = useWaSettings();

  const connectedSettings = useMemo(
    () => waSettings?.filter((setting) => setting.ibaId?.length) ?? [],
    [waSettings],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(connectedSettings[0]?.id);

  useEffect(() => {
    if (!selectedId && connectedSettings[0]?.id) {
      setSelectedId(connectedSettings[0].id);
    }
  }, [connectedSettings, selectedId]);

  const selectedSetting = connectedSettings.find((item) => item.id === selectedId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!connectedSettings.length) {
    return (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-3xl border bg-linear-to-br from-pink-500/10 via-background to-orange-500/10 p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            <IconBrandInstagram className="h-4 w-4 text-pink-600" />
            {translations(eyebrow)}
          </div>
          <div className="mt-4 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
          </div>
        </section>

        <Alert>
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <p className="font-medium">{fallbackTitle}</p>
                <p className="text-sm text-muted-foreground">{fallbackDescription}</p>
              </div>
              <Button asChild>
                <a href="/dashboard/settings/channels/instagram">Open Instagram channel settings</a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-linear-to-br from-pink-500/10 via-background to-orange-500/10 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <IconBrandInstagram className="h-4 w-4 text-pink-600" />
              {translations(eyebrow)}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
            </div>
          </div>

          {secondaryAction ? <div className="flex gap-3">{secondaryAction}</div> : null}
        </div>
      </section>

      <Card className="border-border/70">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Instagram account</CardTitle>
          <CardDescription>
            Select the connected business account you want to manage.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1 space-y-2">
              <Select
                value={selectedSetting?.id ?? ""}
                onValueChange={(value) => setSelectedId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {connectedSettings.map((setting) => (
                    <SelectItem key={setting.id} value={setting.id}>
                      {setting.igDisplayName ||
                        setting.igUserName ||
                        setting.phoneDisplayName ||
                        setting.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {connectedSettings.length} account
              {connectedSettings.length === 1 ? "" : "s"} connected
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSetting ? children(selectedSetting) : null}
    </div>
  );
}
