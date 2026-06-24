import type { SelectProps } from "@mantine/core";
import { Divider, Group, Loader, Select, Stack, Switch, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCheck } from "@tabler/icons-react";
import classNames from "classnames/bind";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { RateupButtonBlue, RateupButtonSecondary } from "@/components/Button/RateupButtons.tsx";
import { QuestionType } from "@/types/enums.ts";

import { QuestionTabsEnum } from "../../EditSurvey.tsx";
import AddGoogleReviewLinkForTeamModal from "../AddGoogleReviewLinkForTeamModal.tsx";
import { reviewPageLogosObj } from "./constants.tsx";
import OpinionQuestionCondition from "./OpinionQuestionCondition/index.tsx";
import RatingQuestionCondition from "./RatingQuestionCondition/index.tsx";
import SmileyQuestionCondition from "./SmileyQuestionCondition/index.tsx";

import styles from "./QuestionReviewPageEditor.module.css";

const cx = classNames.bind(styles);

export enum ReviewPagePlatform {
  Google = "Google",
  Custom = "Custom",
}

const renderSelectOption: SelectProps["renderOption"] = ({ option, checked }) => (
  <Group flex="1" gap="xs">
    {reviewPageLogosObj[option.value]}
    {option.label}
    {checked && <IconCheck style={{ marginInlineStart: "auto" }} size={"1rem"} />}
  </Group>
);

function QuestionReviewPageEditor({ selectedQ, survey, setActiveTab }) {
  const [state, setState] = useState(selectedQ?.reviewPageOptions);
  const [reviewPagePlatformDDState, setReviewPageDDState] = useState(selectedQ?.reviewPagePlatform);
  const [isSwitchStateSaving, setIsSwitchStateSaving] = useState(false);

  const customPlatformForm = useForm({
    initialValues: {
      platformName: "",
    },
    validate: {
      platformName: (value) => {
        if (!(value?.trim()?.length > 0)) {
          return "Please enter platform name.";
        }
      },
    },
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

  const handleSwitchChange = async (event) => {
    const isChecked = event?.currentTarget?.checked;
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
      customPlatformForm.setFieldValue(
        "platformName",
        selectedQ?.reviewPageOptions?.customPlatformName,
      );
    } else {
      customPlatformForm.reset();
    }
  }, [selectedQ]);

  useEffect(() => {
    if (reviewPagePlatformDDState === ReviewPagePlatform.Custom) {
      customPlatformForm.setFieldValue(
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

    const { hasErrors } = customPlatformForm.validate();
    if (hasErrors && reviewPagePlatformDDState === ReviewPagePlatform.Custom) {
      return;
    }

    try {
      setIsSwitchStateSaving(true);
      const data = {
        reviewPageOptions: state,
        reviewPagePlatform: reviewPagePlatformDDState,
      };
      if (reviewPagePlatformDDState === ReviewPagePlatform.Custom) {
        data["reviewPageOptions"]["customPlatformName"] =
          customPlatformForm.getValues().platformName;
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
    <Stack className={cx("question-review-page-editor-root-div")}>
      <h1 className={cx("heading")}>Review Page Settings</h1>
      <Switch
        className={cx("switch")}
        size="lg"
        label={`${selectedQ?.reviewPageOptions ? "Disable" : "Enable"} Review Page: `}
        labelPosition="left"
        checked={Boolean(selectedQ?.reviewPageOptions)}
        onChange={handleSwitchChange}
        offLabel={isSwitchStateSaving ? <Loader size={"1rem"} /> : null}
        onLabel={isSwitchStateSaving ? <Loader size={"1rem"} color="white" /> : null}
      />
      <Stack className={cx("dropdown-and-conditon-comp-container")}>
        {selectedQ?.reviewPageOptions && (
          <>
            <Group className={cx("platform-dd-and-platform-name-input-container")}>
              <Select
                label="Choose Platform"
                placeholder="Choose Platform"
                data={Object.values(ReviewPagePlatform)}
                value={reviewPagePlatformDDState}
                onChange={setReviewPageDDState}
                w={"max-content"}
                allowDeselect={false}
                renderOption={renderSelectOption}
                leftSection={reviewPageLogosObj[reviewPagePlatformDDState]}
              />
              {reviewPagePlatformDDState === ReviewPagePlatform.Custom && (
                <TextInput
                  label={"Custom Platform Name"}
                  placeholder="Enter Custom Platform Name"
                  withAsterisk
                  {...customPlatformForm.getInputProps("platformName")}
                />
              )}
            </Group>
            {componentToBeRendered}
            <Divider />
            <Stack className={cx("team-link-inputs-container")}>
              <h1 className={cx("heading")}>Review Page Links</h1>
              <Stack p={"1rem"}>
                {teamsToDisplay &&
                  teamsToDisplay.map((team) => (
                    <AddGoogleReviewLinkForTeamModal
                      team={team}
                      surveyId={survey?.id}
                      key={team?.id}
                      platform={reviewPagePlatformDDState}
                    />
                  ))}
              </Stack>
            </Stack>
          </>
        )}
      </Stack>
      <Divider />
      <Group className={cx("save-cancel-btns-container")} justify="space-between">
        <RateupButtonSecondary
          title={translations("Cancel")}
          size="md"
          onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
        />
        <RateupButtonBlue
          title={translations("Save")}
          size="md"
          onClick={handleSave}
          disabled={!selectedQ?.reviewPageOptions}
          loading={questionUpdateMutation.isPending}
        />
      </Group>
    </Stack>
  );
}

export default QuestionReviewPageEditor;
