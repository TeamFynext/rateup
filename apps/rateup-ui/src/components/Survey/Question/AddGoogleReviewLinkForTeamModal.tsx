import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useEditTeamMutation } from "@/backend/team/team.query";
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
import { ReviewPagePlatform } from "@/types/enums.ts";

const urlSchema = z.object({
  url: z.string().refine((value) => value === "" || value.startsWith("https://"), {
    message: "Please enter a valid url (https://...)",
  }),
});
type UrlFormValues = z.infer<typeof urlSchema>;

const AddGoogleReviewLinkForTeamModal = ({
  team,
  surveyId,
  platform,
}: {
  team: TeamData;
  surveyId: string;
  platform: ReviewPagePlatform;
}) => {
  const { t: translations } = useTranslation();
  const { control, handleSubmit, reset, setValue } = useForm<UrlFormValues>({
    resolver: zodResolver(urlSchema),
    defaultValues: { url: team?.reviewPageLinks?.[platform] ?? "" },
  });
  const [open, setOpen] = useState(false);
  const editTeamMutation = useEditTeamMutation(team.id, () => {}, surveyId);

  const onSubmit = async ({ url }: UrlFormValues) => {
    let newReviewPageLinks: Record<string, string> = {};
    if (!team.reviewPageLinks) {
      newReviewPageLinks = {
        [platform]: url,
      };
    } else if (team.reviewPageLinks) {
      if ("" in team.reviewPageLinks && platform === ReviewPagePlatform.Google) {
        newReviewPageLinks = {
          ...team.reviewPageLinks,
          [platform]: url,
        };
        delete newReviewPageLinks[""];
      } else
        newReviewPageLinks = {
          ...team.reviewPageLinks,
          [platform]: url,
        };
    }
    await editTeamMutation.mutateAsync({
      reviewPageLinks: newReviewPageLinks,
      googleLink: newReviewPageLinks[ReviewPagePlatform.Google]?.length
        ? newReviewPageLinks[ReviewPagePlatform.Google]
        : undefined,
    });
    reset({ url });
    setOpen(false);
  };

  useEffect(() => {
    setValue("url", team?.reviewPageLinks?.[platform] || "");
  }, [team, open, platform]);

  return (
    <div className="flex items-center justify-between gap-3" key={team.id}>
      <span className="flex-1">{team.name}</span>
      <span>:</span>
      <Input className="flex-1" value={team?.reviewPageLinks?.[platform] ?? ""} readOnly />
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <IconEdit />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            reset();
            setOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`${platform} Url`}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
              if (isSave) {
                e.preventDefault();
                handleSubmit(onSubmit)();
              }
            }}
          >
            <Controller
              name="url"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{team?.name}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder={`Enter review page url for ${team?.name}`}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                {translations("Cancel")}
              </Button>
              <Button type="submit">{translations("Save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddGoogleReviewLinkForTeamModal;
