import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useCreateQrMutation, useUpdateQrMutation } from "@/backend/generateQr/generateQr.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import { QR_LINKS_PATHS } from "../shared/paths.ts";
import { destinationUrlSchema } from "./destinationUrl.ts";

type QrCodeDialogProps =
  | { mode: "create"; open: boolean; onOpenChange: (open: boolean) => void }
  | {
      mode: "rename";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      shortUrlId: string;
      name: string;
    };

export function QrCodeDialog(props: Readonly<QrCodeDialogProps>) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mounted per opening so the form starts from the current name each time. */}
        {props.open &&
          (props.mode === "create" ? (
            <CreateForm onDone={() => props.onOpenChange(false)} />
          ) : (
            <RenameForm
              shortUrlId={props.shortUrlId}
              name={props.name}
              onDone={() => props.onOpenChange(false)}
            />
          ))}
      </DialogContent>
    </Dialog>
  );
}

function useNameSchema() {
  const { t } = useTranslation();
  return z
    .string()
    .trim()
    .min(1, t("Give it a name."))
    .max(200, t("Keep it under 200 characters."));
}

function CreateForm({ onDone }: Readonly<{ onDone: () => void }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateQrMutation();
  const schema = z.object({ name: useNameSchema(), link: destinationUrlSchema(t) });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "", link: "" } });
  const { errors } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    const created = await create.mutateAsync(values);
    onDone();
    void navigate({ to: QR_LINKS_PATHS.qrCode, params: { shortUrlId: created.shortUrlId } });
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{t("New QR code")}</DialogTitle>
        <DialogDescription>
          {t("You can change where it points after it's printed.")}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="qr-name">{t("Name")}</FieldLabel>
          <Input
            id="qr-name"
            autoFocus
            placeholder={t("Table tent, spring menu")}
            aria-invalid={!!errors.name}
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.link}>
          <FieldLabel htmlFor="qr-link">{t("Where it points")}</FieldLabel>
          <Input
            id="qr-link"
            type="url"
            inputMode="url"
            placeholder="https://"
            aria-invalid={!!errors.link}
            {...form.register("link")}
          />
          <FieldDescription>{t("The page people land on when they scan.")}</FieldDescription>
          <FieldError errors={[errors.link]} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={create.isPending}>
          {t("Create QR code")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RenameForm({
  shortUrlId,
  name,
  onDone,
}: Readonly<{ shortUrlId: string; name: string; onDone: () => void }>) {
  const { t } = useTranslation();
  const update = useUpdateQrMutation(shortUrlId);
  const schema = z.object({ name: useNameSchema() });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name } });
  const { errors } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    await update.mutateAsync({ shortUrlId, name: values.name });
    onDone();
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{t("Rename QR code")}</DialogTitle>
        <DialogDescription>
          {t("Only you see this name. The code itself doesn't change.")}
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="qr-rename">{t("Name")}</FieldLabel>
        <Input id="qr-rename" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
        <FieldError errors={[errors.name]} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={update.isPending}>
          {t("Save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
