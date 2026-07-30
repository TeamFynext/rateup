import { IconHome } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import GoogleReview from "@/components/Survey/TakeSurvey/GoogleReview/index.tsx";
import { buttonVariants } from "@/components/ui/button.tsx";

function BodyComp({
  enableGoogleReview,
  googleLink: _googleLink,
  reviews,
  orgLogoSrc,
  surveyId,
  k,
  reviewPageLinks,
}: {
  enableGoogleReview: boolean;
  googleLink?: string;
  reviews: unknown[];
  orgLogoSrc?: string;
  surveyId: string;
  k?: string;
  reviewPageLinks?: Survey["reviewPageLinks"] | null;
}) {
  const { t: translations } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 rounded-t-[28px] bg-muted">
      {enableGoogleReview && (
        <GoogleReview
          reviewSuggestions={reviews}
          orgLogoUrl={orgLogoSrc}
          surveyTeamMapId={surveyId}
          survey={undefined}
          reviewPageLinks={reviewPageLinks}
        />
      )}
      {k === "cs" && (
        <div className="m-8 flex p-8">
          {/* A single anchor styled as a button — a Button wrapping a Link would nest two
              interactive controls. */}
          <Link
            to={`${import.meta.env.VITE_FRONTEND_URL}/public/survey/cs`}
            target="_blank"
            className={buttonVariants()}
          >
            <IconHome data-icon="inline-start" />
            {translations("Go to Home")}
          </Link>
        </div>
      )}
    </div>
  );
}

export default BodyComp;
