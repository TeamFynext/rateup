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
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePublicLandingPage,
  usePublicLandingPageSurveys,
} from "../../../backend/LandingPage/landingpage.query";
import LandingWelcomePage from "./LandingWelcomePage";
import RateupRedirectCard from "../../../components/Card/RateupRedirectCard";
import { rateupLogoUrl } from "../../../components/HomePage/constants";

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
      style={{ background: "#F7F6FB", height: "100vh" }}
    >
      <>
        <Image pb={30} src={rateupLogoUrl} alt="RateUp Logo" w={140} h={35} />
      </>
      <Paper radius="lg" style={{ minHeight: "75vh" }} bg={"#F7F6FB"}>
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
        <RateupRedirectCard />
      </Paper>
    </Container>
  );
};

function StartPage({ largeScreen, Landingpagesurveys, LandingPage }) {
  return (
    <Stack
      align="center"
      justify="center"
      gap="xl"
      // radius="lg"
      style={{ height: "70vh", borderRadius: 18 }}
      bg={"#fff"}
    >
      <Title
        order={3}
        mb="xl"
        pb="sm"
        style={{ fontSize: largeScreen ? "3rem" : "1.5rem" }}
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
