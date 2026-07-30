import { useParams } from "@tanstack/react-router";
import { Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import { useSurvey } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import useFlowStore, { EditorType } from "@/components/whatsapp/flow-v2/utils/store.ts";
import { cn } from "@/lib/utils";
import { QuestionType as Q, SmileyResponse } from "@/types/enums.ts";

import { QuestionTabsEnum } from "../EditSurvey.tsx";
import { mapSmileyIcon } from "../TakeSurvey/TakeSurveyComponent/SmileyRating/index.tsx";
import AddGoogleReviewLinkForTeamModal from "./AddGoogleReviewLinkForTeamModal.tsx";
import { ReviewPagePlatform } from "./QuestionReviewPageEditor/index.tsx";

interface IProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<QuestionTabsEnum>>;
  surveyId?: string;
  waFlowSave?: boolean;
}

const GoogleReviewEditor = ({
  selectedQ,
  setSelectedQ,
  setActiveTab,
  surveyId,
  waFlowSave = false,
}: IProps) => {
  const params = useParams({
    strict: false,
  });
  surveyId = surveyId || (params.surveyId as string);

  const [linkUpdateStatus, setLinkUpdateStatus] = useState(false);
  const { data: survey } = useSurvey(surveyId);
  const { updateComponentInScreen, currentElementId, setDetailActiveEditor } = useFlowStore();

  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const [enableGoogleReview, setEnableGoogleReview] = useState(!!selectedQ?.googleReview);
  const [minRating, setMinRating] = useState(selectedQ?.googleReview?.minRating || 3);
  const [hoveredRating, setHoveredRating] = useState(-1);
  const [minOpinion, setMinOpinion] = useState(selectedQ?.googleReview?.minOpinion || 6);
  const [selectedSmileys, setSelectedSmileys] = useState(
    selectedQ?.googleReview?.reqOptions || ["VeryHappy", "Happy"],
  );

  const updateGoogleReview = (googleReview: any) => {
    if (selectedQ) setSelectedQ({ ...selectedQ, googleReview });
  };
  const { t: translations } = useTranslation();
  const switchCondition = waFlowSave ? selectedQ?.metaType : selectedQ?.type;
  useEffect(() => {
    if (selectedQ?.hasOwnProperty("googleReview") && selectedQ?.googleReview !== null) {
      setEnableGoogleReview(true);
      switch (selectedQ?.type) {
        case Q.Rating:
          if (minRating !== selectedQ["googleReview"]["minRating"]) {
            setMinRating(selectedQ["googleReview"]["minRating"]);
          }
          break;
        case Q.Opinion:
          if (minOpinion !== selectedQ["googleReview"]["minOpinion"]) {
            setMinOpinion(selectedQ["googleReview"]["minOpinion"]);
          }
          break;
        case Q.Smiley:
          if (selectedSmileys !== selectedQ["googleReview"]["reqOptions"]) {
            setSelectedSmileys(selectedQ["googleReview"]["reqOptions"]);
          }
          break;
      }
    } else {
      setEnableGoogleReview(false);
    }
  }, [selectedQ]);

  useEffect(() => {
    let googleReview = null;
    if (enableGoogleReview) {
      switch (switchCondition) {
        case Q.Rating:
          googleReview = { minRating: minRating };
          break;
        case Q.Opinion:
          googleReview = { minOpinion: minOpinion };
          break;
        case Q.Smiley:
          googleReview = { reqOptions: selectedSmileys };
          break;
      }
    }
    updateGoogleReview(googleReview);
  }, [enableGoogleReview, minRating, minOpinion, selectedSmileys]);

  const handleSwitch = (isChecked: boolean) => {
    setEnableGoogleReview(isChecked);
    if (isChecked) {
      toast.error(translations("Enter condition and Google page URL"), {
        id: "load-data",
      });
    }
  };

  const updateSmileyResponse = (value: string[]) => {
    setSelectedSmileys((prevSmileys) => {
      return prevSmileys.includes(value)
        ? prevSmileys.filter((smiley) => smiley !== value)
        : [...prevSmileys, value];
    });
  };

  const { data: teamsRes } = useTeamsByUser();
  const teamsToDisplay = teamsRes?.data?.filter((t) => survey?.teams.some((st) => st.id === t.id));

  const handleSave = async () => {
    if (teamsToDisplay.some((team) => !team.googleLink)) {
      toast.error(translations("Please enter Google Review links for all teams"));
      return;
    }
    if (!waFlowSave)
      toast.loading(translations("Hold on, your changes are getting updated.."), {
        id: "load-data",
      });

    try {
      setLinkUpdateStatus(true);
    } catch (error) {
      handleError(error);
    }
  };

  const handleError = (error: string) => {
    console.error("Failed to update", error);
    toast.error(`${translations("Failed to update.. try again. Error:")} ${error.message}`, {
      id: "load-data",
    });
  };

  useEffect(() => {
    if (linkUpdateStatus) finishQuestionOptionsUpdate();
  }, [linkUpdateStatus]);

  const finishQuestionOptionsUpdate = async () => {
    if (waFlowSave) {
      updateComponentInScreen(currentElementId, {
        googleReview: selectedQ?.googleReview,
      });
      setDetailActiveEditor(EditorType.ElementEditor);
    } else {
      await questionUpdateMutation.mutateAsync({
        qId: selectedQ.id,
        data: { googleReview: selectedQ?.googleReview },
      });
      setActiveTab(QuestionTabsEnum.Edit);
    }
    setLinkUpdateStatus(false);
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <ScrollArea className="h-full">
        <h3 className="text-xl font-semibold">Google Reviews Setup</h3>
        <div className="flex h-full flex-col gap-4 px-5">
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{translations("Google Reviews")}</span>
              <span className="text-sm text-muted-foreground">
                {translations("Setup Google Page review for users.")}
              </span>
            </div>
            <Switch checked={enableGoogleReview} onCheckedChange={handleSwitch} />
          </div>
          {enableGoogleReview && (
            <>
              <div className="flex items-center gap-8">
                {(() => {
                  switch (switchCondition) {
                    case Q.Smiley:
                      return (
                        <>
                          <span className="font-medium">
                            {translations(
                              "Select the emojis for which Google Review to be enabled:",
                            )}
                          </span>
                          <span className="font-medium">:</span>
                          <div className="flex items-center gap-2">
                            {Object.values(SmileyResponse).map((value) => (
                              <Button
                                key={value}
                                type="button"
                                variant="ghost"
                                size="icon-lg"
                                onClick={() => updateSmileyResponse(value)}
                              >
                                {mapSmileyIcon(
                                  value,
                                  selectedSmileys.includes(value) ? "red" : "dark",
                                )}
                              </Button>
                            ))}
                          </div>
                        </>
                      );
                    case Q.Rating:
                      return (
                        <>
                          <span className="font-medium">
                            {translations("Select minimum rating for enabling Google Review:")}
                          </span>
                          <span className="font-medium">:</span>
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }, (_, i) => {
                                const starValue = i + 1;
                                const filled =
                                  hoveredRating !== -1
                                    ? starValue <= hoveredRating
                                    : starValue <= minRating;
                                return (
                                  <button
                                    key={starValue}
                                    type="button"
                                    onClick={() => setMinRating(starValue)}
                                    onMouseEnter={() => setHoveredRating(starValue)}
                                    onMouseLeave={() => setHoveredRating(-1)}
                                    className="flex items-center justify-center p-0.5"
                                  >
                                    <Star
                                      className={cn(
                                        "size-6",
                                        filled
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-muted-foreground",
                                      )}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <span>
                              {minRating} {translations("stars and above.")}
                            </span>
                          </div>
                        </>
                      );
                    case Q.Opinion:
                      return (
                        <>
                          <span className="font-medium">
                            {translations("Select minimum scale value for enabling Google Review:")}
                          </span>
                          <span className="font-medium">:</span>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
                                <Button
                                  key={i}
                                  type="button"
                                  size="sm"
                                  variant={minOpinion === i ? "default" : "outline"}
                                  className="rounded-full"
                                  onClick={() => setMinOpinion(i)}
                                >
                                  {i}
                                </Button>
                              ))}
                            </div>
                            <span className="pt-3 text-sm text-muted-foreground">
                              For {minOpinion} and above.
                            </span>
                          </div>
                        </>
                      );
                    default:
                      return null;
                  }
                })()}
              </div>
              <Separator className="my-3" />
              <span className="my-2.5 text-lg font-semibold">
                {translations("Google Review Links")}
              </span>
              <div className="flex flex-col gap-4">
                {teamsToDisplay &&
                  teamsToDisplay.map((team) => (
                    <AddGoogleReviewLinkForTeamModal
                      team={team}
                      surveyId={surveyId}
                      key={team?.id}
                      platform={ReviewPagePlatform.Google}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
      <Separator className="my-2.5" />
      <div className="flex items-center justify-between px-3 pb-3">
        <Button variant="outline" onClick={() => setActiveTab(QuestionTabsEnum.Edit)}>
          {translations("Cancel")}
        </Button>
        <Button onClick={handleSave} disabled={questionUpdateMutation.isPending}>
          {questionUpdateMutation.isPending && <Spinner data-icon="inline-start" />}
          {translations("Save")}
        </Button>
      </div>
    </div>
  );
};

export default GoogleReviewEditor;
