import { Button, Container, Image, Paper, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState } from "react";

import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";

export const Route = createFileRoute("/(public-facing)/public/survey/cs/")({
  component: Page,
});

function Page() {
  const largeScreen = useMediaQuery("(min-width: 48em)");
  const [startClicked, setStartClicked] = useState(false);

  return (
    <Container fluid px="10vw" py="5vh" style={{ background: "#F7F6FB", height: "100vh" }}>
      <>
        {/* <Image pb={30}
              src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/logo.svg`} 
              alt="RateUp Logo" width={140} height={35} /> */}

        <Image
          pb={30}
          src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/cs-logo.jpeg`}
          alt="Govt Logo"
          w={largeScreen ? 600 : 310}
        />
      </>
      <Paper p="sm" radius="lg" shadow="lg" style={{ minHeight: "80vh" }}>
        <Container fluid>
          {startClicked ? (
            <StartPage largeScreen={largeScreen} />
          ) : (
            <Welcome largeScreen={largeScreen} setStartClicked={setStartClicked} />
          )}
        </Container>
        {/* <RateupRedirectCard /> */}
      </Paper>
    </Container>
  );
}

function Welcome({ setStartClicked, largeScreen }) {
  return (
    <>
      {/* .........Survey Welcome page.......... */}
      <Stack align="center" justify="center" gap="xl" style={{ height: "70vh" }}>
        <Title order={2} style={{ fontSize: largeScreen ? "4rem" : "3rem" }}>
          Welcome
        </Title>
        <Text>Please fill the survey..</Text>
        <RateupButtonBlue
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

const survey1 =
  "https://www.rateup.app/public/survey/06f95c13-fc22-438f-a7dd-f4f068ac4233?start=true";
const survey2 =
  "https://www.rateup.app/public/survey/24f3cdde-4833-46f6-9b82-6ded85e679f8?start=true";
const survey3 =
  "https://www.rateup.app/public/survey/74a86d7e-ec59-40e3-8bf5-4dbece9023e2?start=true";

function StartPage({ largeScreen }) {
  return (
    <Stack align="center" justify="center" gap="xl" style={{ height: "70vh" }}>
      <Title order={3} mb="xl" pb="sm" style={{ fontSize: largeScreen ? "3rem" : "1.5rem" }}>
        Select one option :
      </Title>

      <Link to={`${survey1}`}>
        <Button variant="outline" size={largeScreen ? "lg" : "sm"}>
          I Have Ration Card & Aadhaar Card
        </Button>
      </Link>

      <Link to={`${survey2}`}>
        <Button variant="outline" size={largeScreen ? "lg" : "sm"}>
          I have Aadhaar only [No Ration Card]
        </Button>
      </Link>

      <Link to={`${survey3}`}>
        <Button variant="outline" size={largeScreen ? "lg" : "sm"}>
          I have No Aadhaar & Ration Card
        </Button>
      </Link>
    </Stack>
  );
}
