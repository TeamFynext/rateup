import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import type { LoyaltyProgram } from "@/backend/loyalty/program.api";
import { useUpdateLoyaltyProgramMutation } from "@/backend/loyalty/program.query";
import { DEFAULT_JOIN_MESSAGE_TEXT } from "@/components/loyalty/settings/constants.ts";
import { ReferralMessageSettings } from "@/components/loyalty/settings/ReferralMessageSettings.tsx";
import { BasicSettingsSchema } from "@/components/loyalty/settings/schemas.ts";

type BasicValues = z.infer<typeof BasicSettingsSchema>;

/**
 * The welcome sent when someone joins — the one plain-text message that carries their
 * referral code. It shares the settings form schema so the existing editor is reused as is.
 */
export function JoinMessageCard({ program }: Readonly<{ program: LoyaltyProgram }>) {
  const update = useUpdateLoyaltyProgramMutation(program.id);
  const form = useForm<BasicValues>({
    resolver: zodResolver(BasicSettingsSchema),
    defaultValues: valuesOf(program),
  });

  useEffect(() => {
    if (!form.formState.isDirty) form.reset(valuesOf(program));
  }, [program, form]);

  return (
    <ReferralMessageSettings
      form={form}
      isPending={update.isPending}
      onSave={(data) =>
        update.mutate(
          { referralMessageTemplate: data.referralMessageTemplate },
          { onSuccess: () => form.reset(data) },
        )
      }
    />
  );
}

function valuesOf(program: LoyaltyProgram): BasicValues {
  return {
    programName: program.name,
    pointsCurrency: program.currencyName,
    moneyCurrency: program.currencyCode,
    defaultCountryCode: program.defaultCountryCode ?? "IN",
    averageOrderValue: program.averageOrderValue ?? null,
    whatsappSettingsId: program.whatsappSettingsId ?? undefined,
    referralMessageTemplate: program.referralMessageTemplate ?? DEFAULT_JOIN_MESSAGE_TEXT,
  };
}
