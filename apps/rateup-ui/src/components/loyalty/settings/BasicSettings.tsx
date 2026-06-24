import { Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { CountryDropdown } from "@/components/ui/country-dropdown.tsx";
import { CurrencySelect } from "@/components/ui/currency-select.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";

import type { BasicSettingsSchema } from "./schemas.ts";

interface BasicSettingsProps {
  form: UseFormReturn<z.infer<typeof BasicSettingsSchema>>;
  onSave: (data: z.infer<typeof BasicSettingsSchema>) => void;
  isPending: boolean;
  programId: string | null;
}

export function BasicSettings({
  form,
  onSave,
  isPending,
  programId,
}: Readonly<BasicSettingsProps>) {
  const { t } = useTranslation();

  let buttonLabel: string | React.ReactNode;
  if (isPending) {
    buttonLabel = (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        {t("Saving")}
      </>
    );
  } else if (programId) {
    buttonLabel = t("Save Changes");
  } else {
    buttonLabel = t("Create Program");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Basic Settings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
            <FormField
              control={form.control}
              name="programName"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs">{t("Program Name")}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., VIP Rewards" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pointsCurrency"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs">{t("Points Currency")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Points" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moneyCurrency"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs">{t("Money Currency")}</FormLabel>
                  <FormControl>
                    <CurrencySelect
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("Select Currency")}
                      currencies="all"
                      variant="default"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultCountryCode"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs">{t("Default Country")}</FormLabel>
                  <FormControl>
                    <CountryDropdown
                      placeholder={t("Select Country")}
                      defaultValue={field.value}
                      onChange={(country) => {
                        field.onChange(country.alpha2);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsappSettingsId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs">{t("WhatsApp Account")}</FormLabel>
                  <FormControl>
                    <AccountSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button size="sm" className="w-full mt-2" type="submit" disabled={isPending}>
              {buttonLabel}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
