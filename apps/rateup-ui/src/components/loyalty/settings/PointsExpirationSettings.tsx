"use client";

import { Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import type { ExpirationSettingsSchema } from "./schemas.ts";

interface PointsExpirationSettingsProps {
  form: UseFormReturn<z.infer<typeof ExpirationSettingsSchema>>;
  onSave: (data: z.infer<typeof ExpirationSettingsSchema>) => void;
  isPending: boolean;
  disabled?: boolean;
}

export function PointsExpirationSettings({
  form,
  onSave,
  isPending,
  disabled = false,
}: Readonly<PointsExpirationSettingsProps>) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Points Expiration")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-2.5 border rounded-lg space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">
                      {t("Enable Expiration")}
                    </FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      {t("Points expire after period")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={disabled ? undefined : field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="months"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs">
                    {t("Expiration Period")}
                  </FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={
                      disabled
                        ? undefined
                        : (val) => field.onChange(Number.parseInt(val))
                    }
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="3">{t("3 months")}</SelectItem>
                      <SelectItem value="6">{t("6 months")}</SelectItem>
                      <SelectItem value="12">{t("12 months")}</SelectItem>
                      <SelectItem value="24">{t("24 months")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              size="sm"
              className="w-full"
              type="submit"
              disabled={isPending || disabled}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("Saving")}
                </>
              ) : (
                t("Save Changes")
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
