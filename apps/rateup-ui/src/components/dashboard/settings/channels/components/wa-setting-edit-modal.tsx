import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useUpdateWaSettingsMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

type WaSetting = WaSettings[number];

interface WaSettingEditFormValues {
  phoneDisplayName: string;
}

export const WaSettingEditModal = ({
  opened,
  close,
  waSetting,
}: Readonly<{
  opened: boolean;
  close: () => void;
  waSetting: WaSetting | null;
}>) => {
  const updatemut = useUpdateWaSettingsMutation(waSetting?.id);

  const schema = z.object({
    phoneDisplayName: z.string(),
  });

  const form = useForm<WaSettingEditFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phoneDisplayName: waSetting?.phoneDisplayName || "",
    },
  });

  useEffect(() => {
    form.reset({ phoneDisplayName: waSetting?.phoneDisplayName || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waSetting?.id]);

  function handleSubmit(values: WaSettingEditFormValues) {
    updatemut.mutate(values, { onSuccess: () => close() });
  }

  if (!waSetting) return null;

  return (
    <Dialog open={opened} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Controller
            name="phoneDisplayName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Display name for whatsapp phone number</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatemut.isPending}>
              {updatemut.isPending && <Spinner />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
