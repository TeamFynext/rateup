"use client";

import Link from "next/link";

import { Group, Stack } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import GoogleReview from "@/components/Survey/TakeSurvey/GoogleReview";

function BodyComp({
  enableGoogleReview,
  googleLink,
  reviews,
  orgLogoSrc,
  surveyId,
  k,
  reviewPageLinks,
}) {
  const translations = useTranslations();
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
          <Link
            href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/cs`}
            target="_blank"
          >
            <RateupButtonBlue
              leftIcon={<IconHome />}
              title={translations("Go to Home")}
            />
          </Link>
        </Group>
      )}
    </Stack>
  );
}

export default BodyComp;
