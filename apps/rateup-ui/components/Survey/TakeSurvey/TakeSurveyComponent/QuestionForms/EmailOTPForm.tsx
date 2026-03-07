"use client";

import { useContext, useEffect, useState } from "react";

import {
  Button,
  PinInput,
  Stack,
  Text,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconMail } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  useSendOTPEmail,
  useValidateOtp,
} from "../../../../../backend/surveys/surveys.query";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import { useSurveyContext } from "../../../../../context/SurveyObjContext";
import { emailPattern } from "../../../../../utils/constants";
import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext";
import classes from "../TakeSurvey.module.css";
import { handleInputScrollIntoView } from "../util";
import FormPaperLayout from "./layout/FormPaperLayout";

const EmailOTPForm = ({ isPreview }: { isPreview?: boolean }) => {
  const survey = !isPreview ? useSurveyContext() : null;
  const isSurveyThemePreview = useIsSurveyThemePreview();
  const { selectedQ } = useContext(SelectedQContext);
  const [otp, setOTP] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isOtpSend, setIsOtpSend] = useState(false);
  const sendOtpMailMutation = useSendOTPEmail();
  const validateOTP = useValidateOtp();
  const theme = useMantineTheme();
  const [timerComplete, setTimerComplete] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = selectedQ?.features?.[selectedLanguage];
  const allowedEmailIDs = features ? features?.allowedEmails : [];
  const isMobile = useMediaQuery("(max-width: 480px)");

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const translations = useTranslations();
  useEffect(() => {
    if (response) {
      setEmail(response?.email);
      setTimerComplete(response?.isValid);
    }
  }, [response]);

  const onTimerComplete = () => {
    setTimerComplete(true);
  };

  const handleGetOTP = () => {
    if (isPreview || isSurveyThemePreview) {
      setIsOtpSend(true);
      setTimerComplete(false);
      return;
    }
    if (!survey) return;
    if (
      !email ||
      !emailPattern.test(email) ||
      (features?.isRestricted && !allowedEmailIDs?.includes(email))
    ) {
      setError("Invalid Email");
      return;
    }
    const message = {
      toEmail: email,
      subject: `${survey?.orgName} - OTP for ${survey?.title}`,
      purpose: "SurveyEmailOTPQuestion",
      text: `${survey?.orgName} - OTP for ${survey?.title}`,
      data: { orgName: survey?.orgName, surveyName: survey?.title },
      surveyId: survey?.id,
      userId: email,
    };
    sendOtpMailMutation.mutate(message, {
      onSuccess: () => {
        setIsOtpSend(true);
        setTimerComplete(false);
      },
      onError: (error) => {
        toast.error(
          error?.message || translations("Something went wrong please retry"),
        );
      },
    });
  };

  const handleValidateOTP = () => {
    if (!otp || otp.length !== 6 || isPreview || isSurveyThemePreview) return;
    validateOTP.mutate(
      { otp, userId: email, surveyId: survey?.id },
      {
        onSuccess: (data) => {
          updateResponse({
            email: email,
            isValid: data?.isValid,
          });
        },
        onError: (e) => {
          updateResponse(null);
        },
      },
    );
  };

  let timeLeft =
    isOtpSend && !timerComplete ? (
      <CountDownTimer initialTime={120} onComplete={onTimerComplete} />
    ) : null;

  return (
    <Stack w={"100%"}>
      {isOtpSend && !response?.isValid ? (
        <Stack>
          <Text fz={"sm"}>
            {translations("An OTP has been sent to your email")}
          </Text>
          <Text fz={"sm"}>{translations("Enter OTP")}</Text>
          <PinInput
            length={6}
            oneTimeCode
            type={"number"}
            value={otp}
            onChange={setOTP}
            onComplete={handleValidateOTP}
            ariaLabel="Enter OTP"
            autoFocus={true}
            size={isMobile ? "md" : "lg"}
            color={`var(--mantine-color-${theme.primaryColor}-filled)`}
          />
          {!timerComplete ? (
            <Text
              fz={"sm"}
              c={`var(--mantine-color-${theme.primaryColor}-filled)`}
            >
              {translations(
                "Note: * The OTP expires in 10 minutes once it is sent. You can resend in",
              )}{" "}
              {timeLeft}
            </Text>
          ) : !response?.isValid ? (
            <>
              <Text
                fz={"sm"}
                c={`var(--mantine-color-${theme.primaryColor}-filled)`}
              >
                {translations(
                  "Note: * The OTP expires in 10 minutes once it is sent.",
                )}
              </Text>
              <Button
                onClick={handleGetOTP}
                loading={sendOtpMailMutation.isPending}
                w={"fit-content"}
              >
                {translations("Resend OTP")}
              </Button>
            </>
          ) : null}
        </Stack>
      ) : (
        <Stack gap={"sm"}>
          <Stack gap={1}>
            <FormPaperLayout>
              <TextInput
                placeholder="Enter email"
                value={response?.email || email}
                onChange={(e) => {
                  setError("");
                  setEmail(e.currentTarget.value);
                }}
                variant="unstyled"
                classNames={{
                  input: classes.input,
                  root: classes.textRoot,
                }}
                leftSection={<IconMail size="1.2rem" />}
                styles={{
                  section: {
                    zIndex: 0,
                  },
                }}
                onClick={handleInputScrollIntoView}
                disabled={response?.isValid}
              />
            </FormPaperLayout>
          </Stack>
          {!response?.isValid && (
            <Button
              onClick={handleGetOTP}
              loading={sendOtpMailMutation.isPending}
              disabled={isPreview || isSurveyThemePreview}
              w={"fit-content"}
            >
              {translations("Generate OTP")}
            </Button>
          )}
          {error && (
            <Text fz={"0.875rem"} c={"red"}>
              * {error}
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export const CountDownTimer = ({ initialTime, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  useEffect(() => {
    if (timeLeft === 0) {
      if (onComplete) onComplete();
      return;
    }
    const intervalId = setInterval(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft]);

  return timeLeft ? (
    <Text span>{`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`}</Text>
  ) : null;
};

export default EmailOTPForm;
