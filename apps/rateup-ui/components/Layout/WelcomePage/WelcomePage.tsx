import {
  Title,
  Space,
  Text,
  Stack,
  Image,
  Button,
  Flex,
  BackgroundImage,
} from "@mantine/core";
import React, { useState, useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useVerifySurveyPwdMutation } from "../../../backend/surveys/surveys.query";
import { notifications } from "@mantine/notifications";
import FormModalLayout from "../../Modal/FormModalLayout";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";

const buttonStyles = {
  backgroundColor: "var(--tertiary-color)",
  borderRadius: "48px",
  padding: "10px",
  paddingLeft: "20px",
  paddingRight: "20px",
};

function WelcomePage({
  surveyThemeData,
  onStart,
  isProtected,
  surveyId,
  largeScreen,
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [passwordInput, setPasswordInput] = useState("");

  const verifySurveyPassword = useVerifySurveyPwdMutation(
    surveyId,
    passwordInput,
    onStart,
  );

  useEffect(() => {
    const loadFont = async (fontFamily) => {
      const WebFont = await import("webfontloader");

      WebFont.load({
        google: {
          families: [fontFamily],
        },
      });
    };

    if (surveyThemeData?.descStyles?.fontFamily) {
      loadFont(surveyThemeData?.descStyles?.fontFamily);
    }
    if (surveyThemeData?.headerStyles?.fontFamily) {
      loadFont(surveyThemeData?.headerStyles?.fontFamily);
    }
    if (surveyThemeData?.buttonStyles?.fontFamily) {
      loadFont(surveyThemeData?.buttonStyles?.fontFamily);
    }
  }, [surveyThemeData]);

  return (
    <>
      <FormModalLayout
        opened={opened}
        onClose={close}
        title={"Survey Login"}
        centered
        onSubmit={() => {
          notifications.show({
            id: "load-data",
            loading: true,
            title: "Verifying Password..",
            message: `Hold on, your access is getting verified.`,
            autoClose: false,
            withCloseButton: false,
          });
          verifySurveyPassword.mutate();
        }}
        buttonTitle={"Login"}
      >
        <Text mt="lg" size="sm" c="gray">
          Hey Welcome , <br /> You need to enter password to continue.
        </Text>
        <Space h="lg" />
        <ContainedPasswordInput
          required
          label="Password"
          placeholder="Enter survey password"
          onChange={(event) => setPasswordInput(event?.target?.value)}
          my="lg"
        />
      </FormModalLayout>

      {/* .........Survey Welcome page.......... */}

      <Stack
        align="center"
        justify="center"
        gap="xl"
        style={{
          height: "75vh",
          borderRadius: 18,
          ...surveyThemeData?.bgStyles,
        }}
      >
        <BackgroundImage
          style={{
            height: "100%",
            width: "100%",
            objectFit: "contain",
            borderRadius: 18,
          }}
          src={
            surveyThemeData?.bgUrl && surveyThemeData?.bgType != "bgcolor"
              ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${surveyThemeData?.bgUrl}`
              : ""
          }
        >
          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
            // bg={"red"}
          >
            {surveyThemeData?.logoUrl && (
              <Image
                fit="contain"
                src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${surveyThemeData?.logoUrl}`}
                alt=" Logoss "
                style={surveyThemeData?.logoStyles}
              />
            )}
            <Title
              order={1}
              style={{
                fontSize: largeScreen ? "4rem" : "3rem",
                ...surveyThemeData?.headerStyles,
              }}
              tt={"capitalize"}
              mt={25}
            >
              {surveyThemeData?.headerText}
            </Title>
            <Text mt={20} style={surveyThemeData?.descStyles} tt={"capitalize"}>
              {surveyThemeData?.descText}
            </Text>
            <Button
              mt={20}
              style={{ ...surveyThemeData?.buttonStyles, ...buttonStyles }} //VERIFY MANTINE
              // className={classes.ButtonStyles}
              onClick={isProtected ? open : onStart}
              // size="xl"
              // w={150}
              miw={150}
            >
              {surveyThemeData?.buttonText}
            </Button>
          </Flex>
        </BackgroundImage>
      </Stack>
    </>
  );
}

export default WelcomePage;
