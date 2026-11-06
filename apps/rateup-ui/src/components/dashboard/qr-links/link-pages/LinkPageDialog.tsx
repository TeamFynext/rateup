import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import {
  useCreateLinktreeMutation,
  useUpdateLinktreeMutation,
} from "@/backend/linktree/linktree.query";
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

import { QR_LINKS_PATHS } from "../shared/paths.ts";

type LinkPageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & ({ mode: "create" } | { mode: "rename"; shortUrlId: string; name: string });

/** Create takes a name only; everything else happens in the editor it opens. */
export function LinkPageDialog(props: Readonly<LinkPageDialogProps>) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {props.open && (
          <NameForm
            mode={props.mode}
            shortUrlId={props.mode === "rename" ? props.shortUrlId : ""}
            name={props.mode === "rename" ? props.name : ""}
            onDone={() => props.onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  mode,
  shortUrlId,
  name,
  onDone,
}: Readonly<{ mode: "create" | "rename"; shortUrlId: string; name: string; onDone: () => void }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateLinktreeMutation();
  const rename = useUpdateLinktreeMutation(shortUrlId);
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("Give it a name."))
      .max(200, t("Keep it under 200 characters.")),
  });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name } });
  const { errors } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    if (mode === "rename") {
      await rename.mutateAsync({ shortUrlId, name: values.name });
      onDone();
      return;
    }
    const created = await create.mutateAsync(values);
    onDone();
    void navigate({ to: QR_LINKS_PATHS.linkPage, params: { shortUrlId: created.shortUrlId } });
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{mode === "create" ? t("New link page") : t("Rename link page")}</DialogTitle>
        <DialogDescription>
          {mode === "create"
            ? t("One page with all your links, for your Instagram bio or a QR code.")
            : t("Only you see this name. The page address doesn't change.")}
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="link-page-name">{t("Name")}</FieldLabel>
        <Input
          id="link-page-name"
          autoFocus
          placeholder={mode === "create" ? t("Instagram bio") : undefined}
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
        <FieldError errors={[errors.name]} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={create.isPending || rename.isPending}>
          {mode === "create" ? t("Create and add links") : t("Save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
