import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconMessageStar } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useFeedbackDrafts, useSetupFeedbackMutation } from "@/backend/loyalty/feedback.query.ts";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import { DraftPicker } from "./DraftPicker.tsx";
import { FeedbackFlowPreview } from "./FeedbackFlowPreview.tsx";
import { feedbackSetupSchema, type FeedbackSetupFormValues } from "./schemas.ts";
import { TeamGoogleLinkRow } from "./TeamGoogleLinkRow.tsx";

/**
 * The empty state: pick a ready-made survey for the kind of business, see it on a phone,
 * choose the team whose Google review link to use, and create the flow as a draft.
 */
export function FeedbackSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: catalogue, isPending: draftsLoading } = useFeedbackDrafts();
  const setup = useSetupFeedbackMutation(() =>
    navigate({ to: LOYALTY_PATHS.feedback, search: { tab: "settings", page: 1 } }),
  );

  const form = useForm<FeedbackSetupFormValues>({
    resolver: zodResolver(feedbackSetupSchema),
    defaultValues: { draftKey: undefined, teamId: "", whatsappSettingsPhoneId: undefined },
  });
  const { control, handleSubmit, setValue, watch, getValues } = form;

  // Preselect the suggested draft once the catalogue lands, unless the user got there first.
  useEffect(() => {
    if (catalogue && !getValues("draftKey")) {
      setValue("draftKey", catalogue.suggestedKey);
    }
  }, [catalogue, getValues, setValue]);

  const draftKey = watch("draftKey");
  const teamId = watch("teamId");
  const selected = catalogue?.drafts.find((draft) => draft.key === draftKey);

  if (draftsLoading || !catalogue) {
    return (
      <div className="flex h-64 items-center justify-center">
        <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) =>
        setup.mutate({
          draftKey: values.draftKey,
          teamId: values.teamId,
          ...(values.whatsappSettingsPhoneId
            ? { whatsappSettingsPhoneId: values.whatsappSettingsPhoneId }
            : {}),
        }),
      )}
      className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("Pick a survey")}</h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Each one asks for an overall rating, two things specific to your kind of business, and a comment. You can edit the questions before submitting.",
            )}
          </p>
        </div>
        <Controller
          name="draftKey"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <DraftPicker
                drafts={catalogue.drafts}
                suggestedKey={catalogue.suggestedKey}
                value={field.value}
                onChange={field.onChange}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        {selected && <FeedbackFlowPreview key={selected.key} json={selected.previewJson} />}

        <Card>
          <CardHeader>
            <CardTitle>{t("Where the review goes")}</CardTitle>
            <CardDescription>
              {t("Happy customers are sent to this team's Google review link.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Controller
              name="teamId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("Team")}</FieldLabel>
                  <TeamSelector
                    value={field.value}
                    onChange={field.onChange}
                    enableDefaultValue={false}
                    className="w-full"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <TeamGoogleLinkRow teamId={teamId || undefined} />
            <Controller
              name="whatsappSettingsPhoneId"
              control={control}
              render={({ field }) => (
                <Field>
                  <AccountSelector
                    label={t("WhatsApp number")}
                    optional
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FieldDescription>
                    {t("Leave it on your programme's number unless you have a reason not to.")}
                  </FieldDescription>
                </Field>
              )}
            />
            <Button type="submit" disabled={setup.isPending || !selected}>
              {setup.isPending ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconMessageStar size={16} />
              )}
              {t("Create feedback flow")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
