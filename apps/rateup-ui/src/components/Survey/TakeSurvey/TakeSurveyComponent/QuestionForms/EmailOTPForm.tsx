import { IconMail } from "@tabler/icons-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSendOTPEmail, useValidateOtp } from "@/backend/surveys/surveys.query";
import { Button } from "@/components/ui/button.tsx";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { emailPattern } from "@/utils/constants.ts";
import { asAnswer } from "@/utils/response.ts";

import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { handleInputScrollIntoView } from "../util.tsx";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

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
  const themePrimaryColor = useThemePrimaryColor();
  const [timerComplete, setTimerComplete] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = selectedQ?.features?.[selectedLanguage];
  const allowedEmailIDs = features ? features?.allowedEmails : [];
  const isMobile = useIsMobile();

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (response) {
      setEmail(asAnswer(response).email ?? "");
      setTimerComplete(asAnswer(response).isValid ?? false);
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
        toast.error(error?.message || translations("Something went wrong. please retry"));
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
        onError: (_e) => {
          updateResponse(null);
        },
      },
    );
  };

  const timeLeft =
    isOtpSend && !timerComplete ? (
      <CountDownTimer initialTime={120} onComplete={onTimerComplete} />
    ) : null;

  return (
    <div className="flex w-full flex-col gap-4">
      {isOtpSend && !asAnswer(response).isValid ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">{translations("An OTP has been sent to your email")}</p>
          <p className="text-sm">{translations("Enter OTP")}</p>
          <InputOTP
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={otp}
            onChange={setOTP}
            onComplete={handleValidateOTP}
            aria-label="Enter OTP"
            autoFocus
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} className={isMobile ? "size-9" : "size-11"} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {!timerComplete ? (
            <p className="text-sm" style={{ color: themePrimaryColor }}>
              {translations(
                "Note: * The OTP expires in 10 minutes once it is sent. You can resend in",
              )}
              {""}
              {timeLeft}
            </p>
          ) : !asAnswer(response).isValid ? (
            <>
              <p className="text-sm" style={{ color: themePrimaryColor }}>
                {translations("Note: * The OTP expires in 10 minutes once it is sent.")}
              </p>
              <Button
                onClick={handleGetOTP}
                loading={sendOtpMailMutation.isPending}
                className="w-fit"
              >
                {translations("Resend OTP")}
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="h-fit w-full max-w-[500px] rounded-[var(--input-border-radius,8px)] border bg-[var(--input-background-color,white)] px-[var(--input-padding,12px)] py-1.5 shadow-sm transition-colors duration-100 border-primary">
            <div className="flex items-center gap-2">
              <IconMail size="1.2rem" className="shrink-0 text-muted-foreground" />
              <Input
                placeholder="Enter email"
                value={asAnswer(response).email || email}
                onChange={(e) => {
                  setError("");
                  setEmail(e.target.value);
                }}
                className="h-auto w-full border-none bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                onClick={handleInputScrollIntoView}
                disabled={asAnswer(response).isValid}
              />
            </div>
          </div>
          {!asAnswer(response).isValid && (
            <Button
              onClick={handleGetOTP}
              disabled={sendOtpMailMutation.isPending || isPreview || isSurveyThemePreview}
              className="w-fit"
            >
              {sendOtpMailMutation.isPending && <Spinner data-icon="inline-start" />}
              {translations("Generate OTP")}
            </Button>
          )}
          {error && <p className="text-sm text-destructive">* {error}</p>}
        </div>
      )}
    </div>
  );
};

const CountDownTimer = ({
  initialTime,
  onComplete,
}: {
  initialTime: number;
  onComplete: () => void;
}) => {
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

  return timeLeft ? <span>{`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`}</span> : null;
};

export default EmailOTPForm;
