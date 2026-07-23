import { IconHome } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import GoogleReview from "@/components/Survey/TakeSurvey/GoogleReview/index.tsx";
import { Button } from "@/components/ui/button.tsx";

function BodyComp({
  enableGoogleReview,
  googleLink: _googleLink,
  reviews,
  orgLogoSrc,
  surveyId,
  k,
  reviewPageLinks,
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
          <Link to={`${import.meta.env.VITE_FRONTEND_URL}/public/survey/cs`} target="_blank">
            <Button>
              <IconHome />
              {translations("Go to Home")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default BodyComp;
