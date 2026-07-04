import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import useFlowStoreV3 from "../utils/store.ts";

interface CreateScreenModalProps {
  opened: boolean;
  close: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, { message: "Screen title is required" }),
});

// Modal for creating new screens
function CreateScreenModal({ opened, close }: CreateScreenModalProps) {
  const { t: translations } = useTranslation();
  const { addScreenWithTitle } = useFlowStoreV3();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  useEffect(() => {
    if (!opened) {
      form.reset();
    }
  }, [opened, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    addScreenWithTitle(values.title);
    form.reset();
    close();
  };

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translations("Create New Screen")}</DialogTitle>
          <DialogDescription>{translations("Add a new screen to your flow")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{translations("Screen Title")}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder={translations("Enter screen title")}
                  autoFocus
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {translations("Cancel")}
            </Button>
            <Button type="submit">{translations("Create Screen")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateScreenModal;
