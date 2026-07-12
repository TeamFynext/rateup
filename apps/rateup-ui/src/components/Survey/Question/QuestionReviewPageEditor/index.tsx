import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { QuestionType } from "@/types/enums.ts";

import { QuestionTabsEnum } from "../../EditSurvey.tsx";
import AddGoogleReviewLinkForTeamModal from "../AddGoogleReviewLinkForTeamModal.tsx";
import { reviewPageLogosObj } from "./constants.tsx";
import OpinionQuestionCondition from "./OpinionQuestionCondition/index.tsx";
import RatingQuestionCondition from "./RatingQuestionCondition/index.tsx";
import SmileyQuestionCondition from "./SmileyQuestionCondition/index.tsx";

export enum ReviewPagePlatform {
  Google = "Google",
  Custom = "Custom",
}

const platformSelectItems = Object.values(ReviewPagePlatform).map((platform) => ({
  value: platform,
  label: (
    <span className="flex items-center gap-2">
      {reviewPageLogosObj[platform]}
      {platform}
    </span>
  ),
}));

const customPlatformSchema = z.object({
  platformName: z.string().trim().min(1, "Please enter platform name."),
});
type CustomPlatformFormValues = z.infer<typeof customPlatformSchema>;

function QuestionReviewPageEditor({ selectedQ, survey, setActiveTab }) {
  const [state, setState] = useState(selectedQ?.reviewPageOptions);
  const [reviewPagePlatformDDState, setReviewPageDDState] = useState(selectedQ?.reviewPagePlatform);
  const [isSwitchStateSaving, setIsSwitchStateSaving] = useState(false);

  const customPlatformForm = useForm<CustomPlatformFormValues>({
    resolver: zodResolver(customPlatformSchema),
    defaultValues: { platformName: "" },
  });

  const { t: translations } = useTranslation();

  const { data: teamsRes } = useTeamsByUser();
  const teamsToDisplay = teamsRes?.data?.filter((t) => survey?.teams.some((st) => st.id === t.id));

  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId: survey?.id,
  });
  const selectedQuestionType = selectedQ?.type;
  let componentToBeRendered = null;
  switch (selectedQuestionType) {
    case QuestionType.Rating: {
      componentToBeRendered = (
        <RatingQuestionCondition currentMinRating={state?.minRating} setState={setState} />
      );
      break;
    }
    case QuestionType.Opinion: {
      componentToBeRendered = (
        <OpinionQuestionCondition currentMinOpinion={state?.minOpinion} setState={setState} />
      );
      break;
    }
    case QuestionType.Smiley: {
      componentToBeRendered = (
        <SmileyQuestionCondition currentSelectedEmojis={state?.reqOptions} setState={setState} />
      );
    }
  }

  const handleSwitchChange = async (isChecked: boolean) => {
    if (isChecked) {
      if (survey.kioskMode) {
        toast.warning(
          "Kiosk mode has been turned off automatically as the review page is enabled.",
        );
      }
      const data = { reviewPageOptions: {} };
      if (selectedQ.type === QuestionType.Rating) {
        data["reviewPageOptions"]["minRating"] = 3;
      } else if (selectedQ.type === QuestionType.Opinion) {
        data["reviewPageOptions"]["minOpinion"] = 6;
      } else if (selectedQ.type === QuestionType.Smiley) {
        data["reviewPageOptions"]["reqOptions"] = ["Very Happy", "Happy"];
      }

      if (!selectedQ["reviewPagePlatform"]) {
        data["reviewPagePlatform"] = ReviewPagePlatform.Google;
      }

      setIsSwitchStateSaving(true);
      await questionUpdateMutation.mutateAsync({
        qId: selectedQ?.id,
        data,
      });
      setIsSwitchStateSaving(false);
    } else if (!isChecked) {
      setIsSwitchStateSaving(true);
      await questionUpdateMutation.mutateAsync({
        qId: selectedQ?.id,
        data: {
          reviewPageOptions: null,
        },
      });
      setIsSwitchStateSaving(false);
    }
  };

  useEffect(() => {
    setState(selectedQ?.reviewPageOptions);
    setReviewPageDDState(selectedQ?.reviewPagePlatform);
    if (selectedQ?.reviewPagePlatform === ReviewPagePlatform.Custom) {
      customPlatformForm.setValue("platformName", selectedQ?.reviewPageOptions?.customPlatformName);
    } else {
      customPlatformForm.reset();
    }
  }, [selectedQ]);

  useEffect(() => {
    if (reviewPagePlatformDDState === ReviewPagePlatform.Custom) {
      customPlatformForm.setValue(
        "platformName",
        selectedQ?.reviewPageOptions?.customPlatformName || "",
      );
    } else {
      customPlatformForm.reset();
    }
  }, [reviewPagePlatformDDState]);

  const handleSave = async () => {
    if (teamsToDisplay.some((team) => !team?.["reviewPageLinks"]?.[reviewPagePlatformDDState])) {
      toast.error("Please enter review page link for all teams.");
      return;
    }

    if (reviewPagePlatformDDState === ReviewPagePlatform.Custom) {
      const isValid = await customPlatformForm.trigger("platformName");
      if (!isValid) return;
    }

    try {
      setIsSwitchStateSaving(true);
      const data = {
        reviewPageOptions: state,
        reviewPagePlatform: reviewPagePlatformDDState,
      };
      if (reviewPagePlatformDDState === ReviewPagePlatform.Custom) {
        data["reviewPageOptions"]["customPlatformName"] =
          customPlatformForm.getValues("platformName");
      }
      await questionUpdateMutation.mutateAsync({
        qId: selectedQ?.id,
        data,
      });
      setIsSwitchStateSaving(false);
      toast.success("Saved changes.");
    } catch {
      toast.error("Something went wrong, please try again later.");
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-2xl">Review Page Settings</h1>
      <div className=" flex w-fit items-center gap-3 text-lg">
        <span>{selectedQ?.reviewPageOptions ? "Disable" : "Enable"} Review Page: </span>
        <Switch
          checked={Boolean(selectedQ?.reviewPageOptions)}
          onCheckedChange={handleSwitchChange}
        />
        {isSwitchStateSaving && <Spinner className="size-4" />}
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-auto">
        {selectedQ?.reviewPageOptions && (
          <>
            <div className="flex flex-row items-start gap-8">
              <Field>
                <FieldLabel htmlFor="review-page-platform">Choose Platform</FieldLabel>
                <Select
                  value={reviewPagePlatformDDState}
                  onValueChange={setReviewPageDDState}
                  items={platformSelectItems}
                >
                  <SelectTrigger id="review-page-platform">
                    <SelectValue placeholder="Choose Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ReviewPagePlatform).map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {reviewPageLogosObj[platform]}
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {reviewPagePlatformDDState === ReviewPagePlatform.Custom && (
                <Controller
                  name="platformName"
                  control={customPlatformForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Custom Platform Name<span className="text-destructive"> *</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder="Enter Custom Platform Name"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}
            </div>
            {componentToBeRendered}
            <Separator />
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl">Review Page Links</h1>
              <div className="flex flex-col gap-4 ">
                {teamsToDisplay &&
                  teamsToDisplay.map((team) => (
                    <AddGoogleReviewLinkForTeamModal
                      team={team}
                      surveyId={survey?.id}
                      key={team?.id}
                      platform={reviewPagePlatformDDState}
                    />
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
      <Separator />
      <div className="flex flex-row items-center justify-between">
        <Button variant="outline" onClick={() => setActiveTab(QuestionTabsEnum.Edit)}>
          {translations("Cancel")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!selectedQ?.reviewPageOptions || questionUpdateMutation.isPending}
        >
          {questionUpdateMutation.isPending && <Spinner data-icon="inline-start" />}
          {translations("Save")}
        </Button>
      </div>
    </div>
  );
}

export default QuestionReviewPageEditor;
