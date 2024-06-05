import {
  PinInput,
  Stack,
  TextInput,
  Text,
  Button,
  useMantineTheme,
} from "@mantine/core";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useContext, useEffect, useState } from "react";
import { IconMail } from "@tabler/icons-react";
import classes from "../TakeSurvey.module.css";
import { handleInputScrollIntoView } from "../util";
import {
  useSendOTPEmail,
  useValidateOtp,
} from "../../../../../backend/surveys/surveys.query";
import { showErrorToast } from "../../../../../utils/notifications";
import { emailPattern } from "../../../../../utils/constants";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { useSurveyContext } from "../../../../../context/SurveyObjContext";

const EmailOTPForm = ({ isPreview }: { isPreview?: boolean }) => {
  const survey = !isPreview ? useSurveyContext() : null;
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
  const allowedEmailIDs =
    selectedQ?.features?.[selectedLanguage]?.allowedEmails || [];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

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
    if (isPreview) {
      setIsOtpSend(true);
      setTimerComplete(false);
      return;
    }
    if (!survey) return;
    if (
      !email ||
      !emailPattern.test(email) ||
      !allowedEmailIDs.includes(email)
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
      onError: () => {
        showErrorToast("Something went wrong. please retry");
      },
    });
  };

  const handleValidateOTP = () => {
    if (!otp || otp.length !== 6 || isPreview) return;
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
          <Text>An OTP has been sent to your email</Text>
          <Text>Enter OTP</Text>
          <PinInput
            length={6}
            oneTimeCode
            type={"number"}
            value={otp}
            onChange={setOTP}
            onComplete={handleValidateOTP}
            ariaLabel="Enter OTP"
            autoFocus={true}
            size="lg"
            color={`var(--mantine-color-${theme.primaryColor}-filled)`}
          />
          {!timerComplete ? (
            <Text c={`var(--mantine-color-${theme.primaryColor}-filled)`}>
              Resend in {timeLeft}
            </Text>
          ) : !response?.isValid ? (
            <Button
              onClick={handleGetOTP}
              loading={sendOtpMailMutation.isPending}
              w={"fit-content"}
            >
              Resend OTP
            </Button>
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
              disabled={isPreview}
              w={"fit-content"}
            >
              Generate OTP
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
