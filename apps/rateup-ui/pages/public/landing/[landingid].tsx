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
import React, { useState } from "react";
import Link from "next/link";
import { useMediaQuery } from "@mantine/hooks";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import { useRouter } from "next/router";
import { useSurveysBylandingId } from "../../../backend/surveys/surveys.query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePublicLandingPageSurveys } from "../../../backend/LandingPage/landingpage.query";

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
  console.log(Landingpagesurveys, "emanshuuuuu", landingid);

  return (
    <Container
      fluid
      px="10vw"
      py="5vh"
      sx={{ background: "#F7F6FB", height: "100vh" }}
    >
      <>
        {/* <Image pb={30} 
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} 
              alt="RateUp Logo" width={140} height={35} /> */}

        <Image
          pb={30}
          src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/cs-logo.jpeg`}
          alt="Govt Logo"
          width={largeScreen ? 600 : 310}
        />
      </>
      <Paper p="sm" radius="lg" shadow="lg" sx={{ minHeight: "80vh" }}>
        <Container fluid>
          {startClicked ? (
            <StartPage
              largeScreen={largeScreen}
              Landingpagesurveys={Landingpagesurveys}
            />
          ) : (
            <Welcome
              largeScreen={largeScreen}
              setStartClicked={setStartClicked}
            />
          )}
        </Container>

        <Center>
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

function Welcome({ setStartClicked, largeScreen }) {
  return (
    <>
      {/* .........Survey Welcome page.......... */}
      <Stack
        align="center"
        justify="center"
        spacing="xl"
        sx={{ height: "70vh" }}
      >
        <Title order={1} sx={{ fontSize: largeScreen ? "4rem" : "3rem" }}>
          Welcome
        </Title>
        {/* <Text>landing survey name here </Text> */}
        <Text>Lets get started with survey</Text>
        <RateupButtonSecondary
          radius={"xl"}
          title="Start Survey"
          size="lg"
          onClick={() => {
            setStartClicked(true);
          }}
        />
      </Stack>
    </>
  );
}

let survey1 =
  "https://www.rateup.app/public/survey/06f95c13-fc22-438f-a7dd-f4f068ac4233?start=true";
let survey2 =
  "https://www.rateup.app/public/survey/24f3cdde-4833-46f6-9b82-6ded85e679f8?start=true";
let survey3 =
  "https://www.rateup.app/public/survey/74a86d7e-ec59-40e3-8bf5-4dbece9023e2?start=true";

function StartPage({ largeScreen, Landingpagesurveys }) {
  return (
    <Stack align="center" justify="center" spacing="xl" sx={{ height: "70vh" }}>
      <Title
        order={3}
        mb="xl"
        pb="sm"
        sx={{ fontSize: largeScreen ? "3rem" : "1.5rem" }}
      >
        Select one option :
      </Title>

      {Landingpagesurveys.map((item,index)=>
       <Link href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${item.id}?start=true`}>
       <Button variant="outline" size={largeScreen ? "lg" : "sm"} tt={"capitalize"}>
        {item.title}
       </Button>
     </Link>
      )}

     

      {/* <Link href={`${survey2}`}>
        <Button variant="outline" size={largeScreen ? "lg" : "sm"}>
          I have Aadhaar only [No Ration Card]
        </Button>
      </Link>

      <Link href={`${survey3}`}>
        <Button variant="outline" size={largeScreen ? "lg" : "sm"}>
          I have No Aadhaar & Ration Card
        </Button>
      </Link> */}
    </Stack>
  );
}
