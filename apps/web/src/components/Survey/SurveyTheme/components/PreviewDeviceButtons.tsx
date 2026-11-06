import { ThemeTabEnum } from "../SurveyTheme.enums";
import {
  useSelectedPageTab,
  useSelectedPreview,
  useSetSelectedPreview,
} from "../SurveyThemeContext.tsx";
import PreviewDeviceSelector from "./PreviewDeviceSelector/index.tsx";

function PreviewDeviceButtons() {
  const selectedPageTab = useSelectedPageTab();
  const selectedPreview = useSelectedPreview();
  const setSelectedPreview = useSetSelectedPreview();

  return (
    <PreviewDeviceSelector
      value={selectedPreview}
      onChange={setSelectedPreview}
      withLabel={false}
      className={`preview-device-selector ${selectedPageTab === ThemeTabEnum.WELCOME ? "welcome-tab-preview-device-selector" : ""}`}
    />
  );
}

export default PreviewDeviceButtons;
