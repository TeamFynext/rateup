import LanguagePageThemeView from "./components/previewcomponents/languagePage/index.tsx";
import SurveyThemeView from "./components/previewcomponents/surveytheme/index.tsx";
import ThankyouPageThemeView from "./components/previewcomponents/thankyoupage/index.tsx";
import WelcomePageThemeView from "./components/previewcomponents/welcomepage/index.tsx";
import { PreviewTypeEnum, ThemeTabEnum } from "./SurveyTheme.enums";
import { useSelectedPageTab, useSelectedPreview } from "./SurveyThemeContext.tsx";

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

  const isMobile = selectedPreview === PreviewTypeEnum.MOBILE;

  return (
    <div className="survey-theme-preview-layout-div h-full w-full">
      <div className="flex h-full justify-center">
        <div className="h-full" style={{ width: isMobile ? 380 : "100%" }}>
          <div className="h-full overflow-hidden rounded-2xl">
            {selectedPageTab === ThemeTabEnum.LANGUAGE && <LanguagePageThemeView survey={survey} />}
            {selectedPageTab === ThemeTabEnum.WELCOME && <WelcomePageThemeView survey={survey} />}
            {selectedPageTab === ThemeTabEnum.SURVEY && (
              <SurveyThemeView
                previewId={previewId}
                survey={survey}
                isSurveyThemeEditView={isSurveyThemeEditView}
              />
            )}
            {selectedPageTab === ThemeTabEnum.THANKYOU && <ThankyouPageThemeView survey={survey} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SurveyThemePreviewLayout;
