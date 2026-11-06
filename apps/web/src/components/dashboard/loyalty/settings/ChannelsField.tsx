import { useTranslation } from "react-i18next";

import type { LoyaltyChannel } from "@/backend/loyalty/program.api";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { channelLabel, toggleChannel } from "../channels/channels.ts";

/**
 * Which channels the programme messages members on. Shown only once the server can send
 * on more than one — with WhatsApp alone there is nothing to choose.
 */
export function ChannelsField({
  available,
  enabled,
  disabled,
  onChange,
}: Readonly<{
  available: readonly LoyaltyChannel[];
  enabled: readonly LoyaltyChannel[];
  disabled?: boolean;
  onChange: (next: LoyaltyChannel[]) => void;
}>) {
  const { t } = useTranslation();
  if (available.length < 2) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">{t("Channels")}</p>
        <p className="text-xs text-muted-foreground">
          {t(
            "Members hear from you on the channel they chose. If it cannot reach them, the next one on this list is tried.",
          )}
        </p>
      </div>
      {available.map((channel) => {
        const on = enabled.includes(channel);
        return (
          <Field key={channel} orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`loyalty-channel-${channel}`} className="text-sm">
                {channelLabel(channel, t)}
              </FieldLabel>
              {on && enabled.length === 1 && (
                <FieldDescription className="text-xs">
                  {t("Keep at least one channel on.")}
                </FieldDescription>
              )}
            </FieldContent>
            <Switch
              id={`loyalty-channel-${channel}`}
              checked={on}
              disabled={disabled || (on && enabled.length === 1)}
              onCheckedChange={(next) => onChange(toggleChannel(enabled, channel, next))}
            />
          </Field>
        );
      })}
    </div>
  );
}
