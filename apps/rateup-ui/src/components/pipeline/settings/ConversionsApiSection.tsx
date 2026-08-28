import { IconCheck } from "@tabler/icons-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useUpdateOrgDetailsMutation } from "@/backend/org/org.query";
import { useUserInfo } from "@/backend/user/user.query";
import {
  useSyncDatasetsMutation,
  useUpdateWaSettingsMutation,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ConversionData {
  event_name?: string;
  currency?: string;
  conversionsApiDatasetId?: string;
}

/**
 * Meta Conversions API settings — reporting a win to Meta's ad platform.
 *
 * Lives with the pipeline because the board is what decides a win now: a lead
 * landing on a stage whose status is Won is what fires the event, where the
 * contact's lifecycle used to. It moved here from lifecycle setup for that
 * reason, not for tidiness.
 *
 * Self-contained on purpose. The settings straddle two records — the flag is on
 * the org, the event shape and dataset id are on the WhatsApp settings — and
 * keeping that in one place stops the two drifting apart if this is ever shown
 * somewhere else as well.
 */
export function ConversionsApiSection() {
  const { t } = useTranslation();
  const uid = useId();

  const { data: userInfo } = useUserInfo();
  const { data: waSettingsData } = useWaSettings();
  const updateOrgDetails = useUpdateOrgDetailsMutation();
  const updateWaSettings = useUpdateWaSettingsMutation(waSettingsData?.[0]?.id ?? "");
  const syncDatasets = useSyncDatasetsMutation(waSettingsData?.[0]?.id ?? "");

  const [isActive, setIsActive] = useState(false);
  const [conversionData, setConversionData] = useState<ConversionData>({});
  const [pixelIdDraft, setPixelIdDraft] = useState("");

  const hasWhatsAppSettings = Boolean(waSettingsData?.length);

  useEffect(() => {
    if (userInfo && "data" in userInfo) {
      setIsActive(userInfo.data.isConversionApiActive === true);
    }
  }, [userInfo]);

  useEffect(() => {
    const settings = waSettingsData?.[0];
    if (!settings) return;
    setConversionData({
      event_name: settings.conversionData?.event_name || "Purchase",
      currency: settings.conversionData?.currency || "INR",
      conversionsApiDatasetId: settings.conversionsApiDatasetId || "",
    });
    setPixelIdDraft(settings.conversionsApiDatasetId || "");
  }, [waSettingsData]);

  /**
   * One writer for both records, so the toggle and the event shape can never be
   * saved half-way. Turning it on with no dataset set asks Meta for the account's
   * datasets and takes the first, which is the only part that needs the network.
   */
  const save = async (active: boolean, data: ConversionData) => {
    try {
      const finalData = { ...data };

      if (active !== isActive) {
        await updateOrgDetails.mutateAsync({ isConversionApiActive: active });
        setIsActive(active);

        if (active && waSettingsData?.[0]?.id && !finalData.conversionsApiDatasetId) {
          try {
            const datasets = await syncDatasets.mutateAsync();
            if (datasets && datasets.length > 0) {
              finalData.conversionsApiDatasetId = datasets[0].id;
              toast.success(t("Auto-selected dataset: {{name}}", { name: datasets[0].name }));
            } else {
              toast.info(t("No Meta datasets found for this account."));
            }
          } catch {
            toast.error(t("Failed to auto-fetch Meta datasets."));
          }
        }
      }

      if (
        waSettingsData?.[0]?.id &&
        (finalData.event_name !== conversionData.event_name ||
          finalData.currency !== conversionData.currency ||
          finalData.conversionsApiDatasetId !== conversionData.conversionsApiDatasetId)
      ) {
        await updateWaSettings.mutateAsync({
          conversionData: { event_name: finalData.event_name, currency: finalData.currency },
          conversionsApiDatasetId: finalData.conversionsApiDatasetId,
        });
        setConversionData(finalData);
      }
      toast.success(t("Settings saved successfully"));
    } catch {
      toast.error(t("Failed to save settings"));
    }
  };

  // Meta's own credentials come with the WhatsApp connection, so without it there
  // is nothing to configure — say so rather than showing a dead switch.
  if (!hasWhatsAppSettings) {
    return (
      <Card className="flex flex-col gap-4 p-6 bg-muted/20">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            {t("Meta Conversions API (CAPI)")}
          </h3>
          <p className="mt-1 max-w-4xl text-xs font-medium leading-relaxed text-muted-foreground">
            {t("Please connect WhatsApp to configure Meta Conversions API for tracking.")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            {t("Meta Conversions API (CAPI)")}
          </h3>
          <p className="mt-1 max-w-4xl text-xs font-medium leading-relaxed text-muted-foreground">
            {t(
              "Report a conversion to Meta whenever a lead moves onto a stage whose status is Won.",
            )}
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={(checked) => save(checked, conversionData)} />
      </div>

      {isActive && (
        <div
          className={cn(
            "grid gap-4 pt-4 border-t border-border",
            conversionData.event_name === "Purchase"
              ? "grid-cols-1 md:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2",
          )}
        >
          <Field>
            <FieldLabel
              htmlFor={`${uid}-event`}
              className="text-xs font-bold text-muted-foreground"
            >
              {t("Event Name")}
            </FieldLabel>
            <Select
              value={conversionData.event_name || "Purchase"}
              items={[
                { value: "Purchase", label: t("Purchase") },
                { value: "Lead", label: t("Lead") },
              ]}
              onValueChange={(val) =>
                save(isActive, { ...conversionData, event_name: val ?? undefined })
              }
            >
              <SelectTrigger id={`${uid}-event`} className="w-full">
                <SelectValue placeholder={t("Select Event")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Purchase">{t("Purchase")}</SelectItem>
                <SelectItem value="Lead">{t("Lead")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {conversionData.event_name === "Purchase" && (
            <Field>
              <FieldLabel
                htmlFor={`${uid}-currency`}
                className="text-xs font-bold text-muted-foreground"
              >
                {t("Currency")}
              </FieldLabel>
              <Select
                value={conversionData.currency || "INR"}
                items={[
                  { value: "INR", label: t("INR") },
                  { value: "USD", label: t("USD") },
                  { value: "EUR", label: t("EUR") },
                  { value: "GBP", label: t("GBP") },
                  { value: "AED", label: t("AED") },
                ]}
                onValueChange={(val) =>
                  save(isActive, { ...conversionData, currency: val ?? undefined })
                }
              >
                <SelectTrigger id={`${uid}-currency`} className="w-full">
                  <SelectValue placeholder={t("Select Currency")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">{t("INR")}</SelectItem>
                  <SelectItem value="USD">{t("USD")}</SelectItem>
                  <SelectItem value="EUR">{t("EUR")}</SelectItem>
                  <SelectItem value="GBP">{t("GBP")}</SelectItem>
                  <SelectItem value="AED">{t("AED")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="space-y-2">
            <FieldLabel
              htmlFor={`${uid}-pixel`}
              className="text-xs font-bold text-muted-foreground"
            >
              {t("Pixel ID")}
            </FieldLabel>
            <div className="relative">
              <Input
                id={`${uid}-pixel`}
                value={pixelIdDraft}
                onChange={(e) => setPixelIdDraft(e.target.value)}
                placeholder={t("Enter Pixel ID")}
                className="w-full border-input bg-background pr-8 text-xs font-semibold text-foreground"
              />
              {/* The tick only appears once the draft differs, so the field never
                  looks like it has an unsaved change when it does not. */}
              {pixelIdDraft !== (conversionData.conversionsApiDatasetId || "") && (
                <Button
                  type="button"
                  size="icon"
                  onClick={() =>
                    save(isActive, { ...conversionData, conversionsApiDatasetId: pixelIdDraft })
                  }
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
                >
                  <IconCheck className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
