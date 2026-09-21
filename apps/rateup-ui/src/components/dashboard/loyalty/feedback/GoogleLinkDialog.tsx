import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys.ts";
import { useEditTeamMutation } from "@/backend/team/team.query";
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
import { ReviewPagePlatform } from "@/types/enums.ts";

const urlSchema = z.object({
  url: z.string().refine((value) => value === "" || value.startsWith("https://"), {
    message: "Please enter a valid url (https://...)",
  }),
});
type UrlFormValues = z.infer<typeof urlSchema>;

/**
 * The team's Google review link, edited in place. Writes the same two fields the survey
 * editor's per-team dialog writes (`googleLink` and `reviewPageLinks.Google`) so both
 * surfaces read one value.
 */
export function GoogleLinkDialog({
  team,
  open,
  onOpenChange,
}: Readonly<{
  team: Pick<TeamData, "id" | "name" | "googleLink" | "reviewPageLinks">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const current = team.googleLink ?? team.reviewPageLinks?.[ReviewPagePlatform.Google] ?? "";
  const { control, handleSubmit, reset } = useForm<UrlFormValues>({
    resolver: zodResolver(urlSchema),
    defaultValues: { url: current },
  });
  const editTeam = useEditTeamMutation(team.id, () => {});

  useEffect(() => {
    if (open) reset({ url: current });
  }, [open, current, reset]);

  const onSubmit = async ({ url }: UrlFormValues) => {
    await editTeam.mutateAsync({
      googleLink: url,
      reviewPageLinks: { ...team.reviewPageLinks, [ReviewPagePlatform.Google]: url },
    });
    // The Feedback overview carries the team's link too.
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.feedback() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Google review link for {team}", { team: team.name })}</DialogTitle>
          <DialogDescription>
            {t(
              "Where happy customers are sent after the feedback survey. Paste the 'Write a review' link from your Google Business Profile.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Controller
            name="url"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t("Review link")}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="https://g.page/r/…/review"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={editTeam.isPending}>
              {t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
