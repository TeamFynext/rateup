import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useCreateTestimonialCollection } from "@/backend/testimonials/testimonial.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { defaultTestimonialStyle } from "@/utils/testimonial.ts";

type SaveTestimonialCollectionProps = Readonly<{
  opened: boolean;
  close: () => void;
}>;

interface CollectionFormValues {
  name: string;
  teamId: string;
}

const SaveTestimonialCollection = ({ opened, close }: SaveTestimonialCollectionProps) => {
  const { data: teamRes } = useTeamsByUser();
  const { t: translations } = useTranslation();

  const teamOptions =
    teamRes?.data?.map((team) => ({
      value: team?.id,
      label: team?.name,
    })) ?? [];

  const collectionSchema = z.object({
    name: z.string().trim().min(1, translations("Name cannot be blank")),
    teamId: z.string().trim().min(1, translations("Please select a team")),
  });

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      teamId: "",
    },
  });

  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const saveCollection = useCreateTestimonialCollection();

  const onSubmit = (values: CollectionFormValues) => {
    toast.loading(translations("Hold on, your collection is getting created..."), {
      id: "create-collection",
    });
    saveCollection.mutate(
      { ...values, theme: defaultTestimonialStyle },
      {
        onSuccess: (data) => {
          close();
          navigate({
            to: `${pathname}/${data?.id}`,
          });
        },
      },
    );
  };

  const handleClose = () => {
    form.reset();
    close();
  };

  return (
    <Dialog
      open={opened}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">{translations("Create Collection")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-base font-bold">
                    {translations("Name your collection")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder={translations("Enter collection name ")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="teamId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="collection-team">{translations("Select Team")}</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    items={teamOptions}
                  >
                    <SelectTrigger
                      id="collection-team"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder={translations("Select Team")} />
                    </SelectTrigger>
                    <SelectContent>
                      {teamOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <DialogFooter>
              <DialogClose render={<Button variant="secondary" type="button" />}>
                <span className="text-sm font-normal">{translations("Cancel")}</span>
              </DialogClose>
              <Button type="submit" loading={saveCollection.isPending}>
                <span className="text-sm font-normal">{translations("Save")}</span>
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveTestimonialCollection;
