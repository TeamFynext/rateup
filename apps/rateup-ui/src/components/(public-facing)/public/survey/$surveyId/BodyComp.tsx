import { Group, Stack } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";
import GoogleReview from "@/components/Survey/TakeSurvey/GoogleReview/index.tsx";

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
    <Stack
      align="center"
      justify="center"
      gap="xl"
      style={{
        flex: 1,
        borderRadius: "28px 28px 0px 0px",
        backgroundColor: "whitesmoke",
      }}
    >
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
        <Group m="xl" p="xl">
          <Link to={`${import.meta.env.VITE_FRONTEND_URL}/public/survey/cs`} target="_blank">
            <RateupButtonBlue leftIcon={<IconHome />} title={translations("Go to Home")} />
          </Link>
        </Group>
      )}
    </Stack>
  );
}

export default BodyComp;
