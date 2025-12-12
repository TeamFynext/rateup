"use client";

import { Tabs, TabsContent } from "@/components/ui/tabs";

import LanguagePageThemeView from "./components/previewcomponents/languagePage";
import SurveyThemeView from "./components/previewcomponents/surveytheme";
import ThankyouPageThemeView from "./components/previewcomponents/thankyoupage";
import WelcomePageThemeView from "./components/previewcomponents/welcomepage";
import { PreviewTypeEnum, ThemeTabEnum } from "./SurveyTheme.enums";
import { useSelectedPageTab, useSelectedPreview } from "./SurveyThemeContext";

function SurveyThemePreviewLayout({
  survey,
  previewId,
  isSurveyThemeEditView,
  isSurveyThemePreview,
}) {
  let selectedPageTab = useSelectedPageTab();
  const selectedPreview = useSelectedPreview();

  if (isSurveyThemePreview) {
    selectedPageTab = ThemeTabEnum.SURVEY;
  }

  return (
    <div className="h-full w-full">
      <div className="flex justify-center h-full">
        <div
          className={`${selectedPreview === PreviewTypeEnum.MOBILE ? "w-[380px]" : "w-[100%]"} h-full`}
        >
          <Tabs value={selectedPageTab} className="h-full">
            <TabsContent value={ThemeTabEnum.LANGUAGE}>
              <LanguagePageThemeView survey={survey} />
            </TabsContent>

            <TabsContent value={ThemeTabEnum.WELCOME}>
              <WelcomePageThemeView survey={survey} />
            </TabsContent>

            <TabsContent value={ThemeTabEnum.SURVEY}>
              <SurveyThemeView
                previewId={previewId}
                survey={survey}
                isSurveyThemeEditView={isSurveyThemeEditView}
              />
            </TabsContent>

            <TabsContent value={ThemeTabEnum.THANKYOU}>
              <ThankyouPageThemeView survey={survey} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default SurveyThemePreviewLayout;
