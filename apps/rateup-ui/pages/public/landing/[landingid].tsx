import {
  Title,
  Paper,
  Button,
  Center,
  Text,
  Stack,
  Container,
  Image,
} from "@mantine/core";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import { useRouter } from "next/router";
import {
  useLandingPage,
  useSurveysBylandingId,
} from "../../../backend/surveys/surveys.query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  usePublicLandingPage,
  usePublicLandingPageSurveys,
} from "../../../backend/LandingPage/landingpage.query";
import LandingWelcomepage from "./LandingWelcomePage";
import LandingWelcomePage from "./LandingWelcomePage";

export default () => {
  const largeScreen = useMediaQuery("(min-width: 48em)");
  const [startClicked, setStartClicked] = useState(false);
  const router = useRouter();
  const { landingid } = router.query;

  //-----------get survey by landing -------
  //---------check not array ------------
  if (Array.isArray(landingid)) {
    throw new Error("surveyId is an array");
  }
  const {
    isLoading,
    error,
    data: Landingpagesurveys,
  } = usePublicLandingPageSurveys(landingid);
  const queryClient = useQueryClient();

  //--------------get landing page details based on landing page id (prop)----------
  const {
    isLoading: isLandingPageLoading,
    error: LandingPageError,
    data: LandingPage,
  } = usePublicLandingPage(landingid);


  useEffect(() => {
    if (LandingPage?.welcomePageEnabled) {
      setStartClicked(false);
    } else {
      setStartClicked(true);
    }
  }, [LandingPage?.welcomePageEnabled]);

  return (
    <Container
      fluid
      px="10vw"
      py="5vh"
      sx={{ background: "#F7F6FB", height: "100vh" }}
    >
      <>
        <Image
          pb={30}
          src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
          alt="RateUp Logo"
          width={140}
          height={35}
        />
      </>
      <Paper radius="lg" sx={{ minHeight: "75vh" }} bg={"#F7F6FB"}>
        <Paper bg={"#F7F6FB"}>
          {startClicked ? (
            <StartPage
              largeScreen={largeScreen}
              Landingpagesurveys={Landingpagesurveys}
              LandingPage={LandingPage}
            />
          ) : (
            <LandingWelcomePage
              largeScreen={largeScreen}
              setStartClicked={setStartClicked}
              landingid={landingid ? landingid : null}
            />
          )}
        </Paper>

        <Center mt={20}>
          <Text fz="sm">Powered by </Text>
          <Image
            pl={10}
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
            alt="RateUp Logo"
            width={80}
            height={20}
          />
        </Center>
      </Paper>
    </Container>
  );
};

function StartPage({ largeScreen, Landingpagesurveys, LandingPage }) {
  return (
    <Stack
      align="center"
      justify="center"
      spacing="xl"
      // radius="lg"
      sx={{ height: "70vh" }}
      bg={"#fff"}
      style={{borderRadius:18}}
    >
      <Title
        order={3}
        mb="xl"
        pb="sm"
        sx={{ fontSize: largeScreen ? "3rem" : "1.5rem" }}
      >
        {LandingPage?.header}
      </Title>

      {Landingpagesurveys?.map((item, index) => (
        <Link
          href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${item.id}?start=true`}
        >
          {/* //--------------survey name as button displayed here ------------------- */}
          <Button
            variant="outline"
            size={largeScreen ? "lg" : "sm"}
            tt={"capitalize"}
          >
            {item.title}
          </Button>
        </Link>
      ))}
    </Stack>
  );
}
