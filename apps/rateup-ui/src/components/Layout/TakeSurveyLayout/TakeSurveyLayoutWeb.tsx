import { useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
  useVerifySurveyPwdMutation,
} from "@/backend/surveys/surveys.query";
import { getQuestionsLength } from "@/components/Survey/TakeSurvey/TakeSurveyComponent/util.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { PageType } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import { CreditsCard } from "../../Card/CreditsCard.tsx";
import {
  useIsSurveyThemeEditView,
  useIsSurveyThemePreview,
} from "../../Survey/SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { useSelectedPreview } from "../../Survey/SurveyTheme/SurveyThemeContext.tsx";
import { Button } from "../../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "../../ui/field.tsx";
import { Input } from "../../ui/input.tsx";
import LanguageSelectionPage from "../LanguageSelectionPage/index.tsx";
import WelcomePage from "../WelcomePage/WelcomePage.tsx";
import { getBgImgAndBgColor } from "./utils.ts";

export const TakeSurveyLayoutWeb = ({
  survey,
  children,
}: {
  survey: Survey | null;
  children: ReactNode;
}) => {
  const { theme: surveyThemeData } = survey?.webSurveyTheme ?? {};
  const pagesThemeData = survey?.webSurveyPagesTheme;

  const isSurveyThemePreview = useIsSurveyThemePreview();
  const isSurveyThemeEditView = useIsSurveyThemeEditView();

  const orgLogoSrc = surveyThemeData?.surveyTheme?.logo?.logo;
  const orgLogoStyles = surveyThemeData?.surveyTheme?.logo?.styles;

  // This one is being used for preview in surveyTheme editor
  // (TakeSurveyLayoutWeb and TakeSurvey component is also being used in surveyTheme editor).
  const selectedPreview = useSelectedPreview();

  const surveyTeamMapId = survey?.surveyTeamMapId;
  const searchParams = useSearch({ strict: false });
  const start = searchParams?.start === "true";

  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile = useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";

  const [isWelcomePageEnabled, setIsWelcomePageEnabled] = useState(
    survey?.questions?.some((q) => q.type === PageType.Welcome) || false,
  );
  const [startClicked, setStartClicked] = useState<boolean>(start || false);

  const [selectedLanguage, setSelectedLanguage] = useState("");

  const updateVisited = useUpdateVisitedMutation(survey?.id ?? "");
  const updateStarted = useUpdateStartedMutation(survey?.id ?? "");

  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  useEffect(() => {
    const isLoginInputModalRequired =
      survey?.isPublished &&
      survey?.active &&
      survey?.isProtected &&
      !isPasswordVerified &&
      !isSurveyThemePreview;
    if (isLoginInputModalRequired) {
      if (!opened) open();
    }
  }, [opened, isSurveyThemePreview]);

  useEffect(() => {
    if (start === true) setStartClicked(true);
  }, [start]);

  useEffect(() => {
    if (isWelcomePageEnabled) {
      setStartClicked(false);
      if (surveyTeamMapId) updateVisited.mutate(surveyTeamMapId);
    } else {
      setStartClicked(true);
      if (surveyTeamMapId) {
        updateVisited.mutate(surveyTeamMapId, {
          onSuccess: () => {
            updateStarted.mutate(surveyTeamMapId);
          },
        });
      }
    }
  }, [isWelcomePageEnabled]);

  useEffect(() => {
    setIsWelcomePageEnabled(!!survey?.questions?.some((q) => q.type === PageType.Welcome));
  }, [survey?.questions]);

  const handleStartClick = () => {
    if (surveyTeamMapId) updateStarted.mutate(surveyTeamMapId);
    setStartClicked(true);
  };

  const verifySurveyPassword = useVerifySurveyPwdMutation(
    survey?.id ?? "",
    passwordInput,
    close,
    setIsPasswordVerified,
  );

  /**
   * The hotkey path submits without going through the form, so the empty check lives here rather
   * than relying on the input's `required` attribute alone.
   */
  const submitSurveyPassword = () => {
    if (!passwordInput.trim()) {
      setPasswordError("Enter the survey password to continue.");
      return;
    }
    setPasswordError("");
    toast.loading(`Hold on, your access is getting verified.`, { id: "load-data" });
    verifySurveyPassword.mutate();
  };

  if (!selectedLanguage && (survey?.languages?.length ?? 0) <= 1) {
    setSelectedLanguage(survey?.languages[0] ?? "");
  }

  if (!selectedLanguage && isSurveyThemeEditView) {
    setSelectedLanguage("English");
  }

  const isLanguagePageActive =
    !selectedLanguage && (survey?.languages?.length ?? 0) > 1 && !isSurveyThemeEditView;
  const isWelcomePageActive = !startClicked && isWelcomePageEnabled;
  const useSurveyBackground = isWelcomePageActive && pagesThemeData["welcomeTheme"]?.useSurveyTheme;
  let requiredSurveyThemeObjKey = "surveyTheme";
  let requiredThemeData = surveyThemeData;
  if (isWelcomePageActive && !useSurveyBackground) {
    requiredSurveyThemeObjKey = "welcomeTheme";
    requiredThemeData = pagesThemeData;
  }

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    requiredThemeData,
    requiredSurveyThemeObjKey,
    isMobile,
  );

  const isUnsplashImage = backgroundImageSrc?.startsWith("https://images.unsplash.com");

  const questionsArr = survey?.questions;

  if (!getQuestionsLength(survey!)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-medium">No Questions found!</p>
      </div>
    );
  }

  return (
    <>
      <Dialog
        open={opened}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) close();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-125">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-semibold">Survey Login</DialogTitle>
          </DialogHeader>
          <form
            className="p-5"
            onSubmit={(event) => {
              event.preventDefault();
              submitSurveyPassword();
            }}
            onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, submitSurveyPassword]])}
          >
            <p className="mt-5 text-sm text-gray-500">
              Hey Welcome , <br /> You need to enter password to continue.
            </p>
            <div className="h-5" />
            <Field className="my-5" data-invalid={!!passwordError}>
              <FieldLabel htmlFor="survey-password">
                Password
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <Input
                id="survey-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter survey password"
                value={passwordInput}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "survey-password-error" : undefined}
                onChange={(event) => {
                  setPasswordInput(event.target.value);
                  if (passwordError) setPasswordError("");
                }}
              />
              {passwordError && <FieldError id="survey-password-error">{passwordError}</FieldError>}
            </Field>
            <DialogFooter className="mt-4 sm:justify-center">
              <Button type="submit">Login</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <div
        className="take-survey-layout-web-root-div flex h-dvh w-full flex-col gap-0
          [&_.search-input-and-options-container]:absolute [&_.search-input-and-options-container]:z-100"
        style={{ position: "relative", backgroundColor }}
      >
        <CreditsCard
          enableCredits={!!isUnsplashImage && !isLanguagePageActive}
          url={backgroundImageSrc}
        >
          <div
            className="flex h-full flex-1 flex-col justify-between"
            style={{
              backgroundImage: backgroundImageSrc ? `url(${backgroundImageSrc})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* .........Survey Header Section.......... */}
            {!isLanguagePageActive && startClicked && (
              <div className="my-4 flex justify-center">
                {orgLogoSrc && (
                  <img
                    src={orgLogoSrc}
                    alt="Logo"
                    style={{ ...orgLogoStyles }}
                    className="max-h-[200px] max-w-[200px] object-contain"
                  />
                )}
              </div>
            )}

            <div className="m-0 flex flex-1 p-0">
              {(survey?.isPublished && survey?.active) || isSurveyThemePreview ? (
                survey?.isProtected && !isPasswordVerified && !isSurveyThemePreview ? null : (
                  <div className="w-full overflow-hidden">
                    {startClicked &&
                      (isLanguagePageActive ? (
                        <LanguageSelectionPage
                          languages={survey?.languages ?? []}
                          setSelectedLanguage={setSelectedLanguage}
                          pagesThemeData={pagesThemeData}
                          surveyThemeData={surveyThemeData}
                          questionsArr={questionsArr}
                        />
                      ) : (
                        selectedLanguage && (
                          <SelectedLanguageContext.Provider
                            value={{
                              selectedLanguage,
                              defaultLanguage: survey?.languages[0],
                            }}
                          >
                            {children}
                          </SelectedLanguageContext.Provider>
                        )
                      ))}

                    {isWelcomePageEnabled && !startClicked && (
                      <WelcomePage
                        surveyThemeData={surveyThemeData}
                        pagesThemeData={pagesThemeData}
                        onStart={handleStartClick}
                        largeScreen={largeScreen}
                        orgLogoSrc={orgLogoSrc}
                        orgLogoStyles={orgLogoStyles}
                        questionsArr={questionsArr}
                        isMobile={isMobile}
                      />
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  {(survey?.isPublished !== true || !survey?.active) && (
                    <div className="flex items-center justify-center gap-4">
                      <img
                        src={`${import.meta.env.VITE_FRONTEND_URL}/images/bw-logo.png`}
                        alt="Logo"
                        style={{ width: isMobile ? 70 : 80, height: isMobile ? 70 : 80 }}
                        className="object-contain"
                      />
                      <p className="text-[28px] font-bold" style={{ color: "#CDCDCD" }}>
                        Survey is not available..!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CreditsCard>
      </div>
    </>
  );
};
