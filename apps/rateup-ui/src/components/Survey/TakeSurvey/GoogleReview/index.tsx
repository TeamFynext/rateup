import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateReviewLinkStatsOnSurveyMutation } from "@/backend/surveys/surveys.query";
import { useDeleteReviewSuggestionMutation } from "@/backend/team/reviewSuggestion/reviewSuggestion.query";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { ReviewSuggestion } from "@/types/global";
import { shuffleArray } from "@/utils/index.ts";

import { GoogleIcon } from "../../../Button/GoogleIcon.tsx";
import RateupRedirectCard from "../../../Card/RateupRedirectCard.tsx";
import { reviewPageLogosObj } from "../../Question/QuestionReviewPageEditor/constants.tsx";
import { ReviewPagePlatform } from "../../Question/QuestionReviewPageEditor/index.tsx";
import WandIcon from "./WandIcon.tsx";

function GoogleReview({
  reviewSuggestions = [],
  orgLogoUrl = "",
  surveyTeamMapId = "",
  isSurveyPreview = false,
  survey,
  reviewPageLinks = null,
}: {
  reviewSuggestions?: ReviewSuggestion[];
  orgLogoUrl?: string;
  surveyTeamMapId?: string;
  isSurveyPreview?: boolean;
  survey: Survey;
  reviewPageLinks?: Survey["reviewPageLinks"] | null;
}) {
  const [isSuggestionCopiedModalOpen, setIsSuggestionCopiedModalOpen] = useState(false);
  const openSuggestionCopiedModal = () => setIsSuggestionCopiedModalOpen(true);
  const closeSuggestionCopiedModal = () => setIsSuggestionCopiedModalOpen(false);

  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [shuffledArray, setShuffledArray] = useState<Array<ReviewSuggestion>>(null);
  const [fakeLoading, setFakeLoading] = useState(false);
  const [lastCopiedReview, setLastCopiedReview] = useState<ReviewSuggestion | null>(null);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (reviewSuggestions.length > 0) {
      setShuffledArray(shuffleArray(reviewSuggestions));
      handleRegenerate();
    }
  }, [reviewSuggestions]);

  function handleRegenerate() {
    setFakeLoading(true);

    if (reviewIndex >= reviewSuggestions.length - 1 || reviewIndex === null) {
      setReviewIndex(0);
      setShuffledArray(shuffleArray(reviewSuggestions));
    } else {
      setReviewIndex(reviewIndex + 1);
    }

    setTimeout(
      () => {
        setFakeLoading(false);
      },
      Math.floor(Math.random() * 500) + 500,
    );
  }

  const deleteReviewMutation = useDeleteReviewSuggestionMutation(surveyTeamMapId, true);
  const updateReviewPageVisits = useUpdateReviewLinkStatsOnSurveyMutation(survey?.id);
  // if user clicks on go to review page, delete the last copied review
  function handleGoToReviewPage() {
    updateReviewPageVisits.mutate(surveyTeamMapId);
    if (lastCopiedReview) {
      deleteReviewMutation.mutate(lastCopiedReview.id, {
        onSuccess: () => {
          setLastCopiedReview(null);
        },
      });
    }
  }

  const handleCopyBtnClick = useCallback(() => {
    const currentReview = shuffledArray[reviewIndex];
    if (currentReview) {
      navigator.clipboard.writeText(currentReview.review);
      openSuggestionCopiedModal();
      setLastCopiedReview(currentReview);
    }
  }, [isSuggestionCopiedModalOpen, shuffledArray, reviewIndex]);

  const questionWithReviewPageOptions = survey?.questions?.find((question: Question) => {
    return Boolean(question?.reviewPageOptions);
  });

  if (!reviewPageLinks) reviewPageLinks = survey?.reviewPageLinks;

  let reviewPagePlatform =
    questionWithReviewPageOptions?.reviewPagePlatform || ReviewPagePlatform.Google;
  if (reviewPagePlatform === ReviewPagePlatform.Custom) {
    reviewPagePlatform = questionWithReviewPageOptions?.reviewPageOptions?.customPlatformName;
  }

  const link = reviewPageLinks?.[reviewPagePlatform];
  const reviewLink = link?.trim();

  return (
    <div className="flex flex-col" style={{ minHeight: isSurveyPreview ? "100%" : "100dvh" }}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-auto p-4">
        {orgLogoUrl && (
          <div>
            <img src={orgLogoUrl} alt="Organization Logo" className="h-[60px] w-[60px]" />
          </div>
        )}
        <div>
          <h2 className="m-0 mb-4 text-center text-2xl font-medium">Make us more happy!</h2>
          <p className="m-0 text-center">{`Leave us a review on ${reviewPagePlatform}`}</p>
        </div>
        {reviewSuggestions?.length >= 3 && (
          <div className="w-full max-w-[320px]">
            <p className="mb-2.5 text-center font-bold text-muted-foreground">
              {translations("Need Inspirations?")}
            </p>
            <div className="flex w-full flex-col items-center justify-center gap-4 rounded-[0.625rem] border border-[#adb5bd] p-4">
              <Button
                variant="outline"
                className="rounded-[1.25rem] border-primary bg-[whitesmoke] text-primary hover:bg-[whitesmoke]"
                onClick={handleRegenerate}
              >
                <WandIcon data-icon="inline-start" />
                {translations("Regenerate Suggestions")}
              </Button>
              {fakeLoading || !shuffledArray ? (
                <div className="flex w-full flex-col items-center justify-center gap-4">
                  <div className="flex h-[150px] w-full flex-col justify-center gap-1.5 px-2.5">
                    <Skeleton className="h-2.5 rounded-full" />
                    <Skeleton className="h-2.5 rounded-full" />
                    <Skeleton className="h-2.5 rounded-full" />
                    <Skeleton className="h-2.5 rounded-full" />
                    <Skeleton className="h-2.5 rounded-full" />
                    <Skeleton className="h-2.5 rounded-full" />
                    <Skeleton className="h-2.5 rounded-full" />
                    <Skeleton className="h-2.5 w-[70%] rounded-full" />
                  </div>

                  <Button className="rounded-[1.25rem] px-6 py-2.5" disabled>
                    {translations("Copy")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <p className="h-[150px] w-full overflow-auto px-2.5 text-center break-words">
                    {shuffledArray?.[reviewIndex]?.review}
                  </p>
                  <Button className="rounded-[1.25rem] px-6 py-2.5" onClick={handleCopyBtnClick}>
                    {translations("Copy")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        <div>
          {reviewLink ? (
            <Link
              to={reviewLink}
              target="_blank"
              onClick={handleGoToReviewPage}
              className="flex w-[320px] max-w-[320px] items-center justify-center gap-2.5 rounded-[0.625rem] bg-[#0a000d] px-4 py-2.5 text-base text-white no-underline"
            >
              <span>{translations("Go to Review Page")}</span>
              <span className="flex items-center">
                {reviewPageLogosObj[reviewPagePlatform] || null}
              </span>
            </Link>
          ) : (
            <span>{translations("Review link unavailable")}</span>
          )}
        </div>

        <Dialog
          open={isSuggestionCopiedModalOpen}
          onOpenChange={(open) => {
            if (!open) closeSuggestionCopiedModal();
          }}
        >
          <DialogContent showCloseButton={false} className="gap-0 bg-[brown] px-6 py-10">
            <DialogTitle className="sr-only">
              {translations("Your Suggestion is copied!")}
            </DialogTitle>
            <p className="mb-8 text-center">{translations("Your Suggestion is copied!")}</p>
            <div className="flex justify-center">
              {reviewLink ? (
                <Link
                  to={reviewLink}
                  target="_blank"
                  onClick={handleGoToReviewPage}
                  className="flex w-[320px] max-w-[320px] items-center justify-center gap-2.5 rounded-[0.625rem] bg-[#0a000d] px-4 py-2.5 text-base text-white no-underline"
                >
                  <span>{translations("Go to Review Page")}</span>
                  <span>
                    <GoogleIcon />
                  </span>
                </Link>
              ) : (
                <span>{translations("Review link unavailable")}</span>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex justify-center">
        <RateupRedirectCard className="!m-0" />
      </div>
    </div>
  );
}

export default GoogleReview;
