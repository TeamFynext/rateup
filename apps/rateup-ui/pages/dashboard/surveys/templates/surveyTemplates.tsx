import { Stack, Paper, Text, Center, Skeleton } from "@mantine/core";
import SurveyThemeContextProvider from "../../../../components/Survey/SurveyTheme/SurveyThemeContext";
import WelcomePageThemeView from "../../../../components/Survey/SurveyTheme/components/previewcomponents/welcomepage";
import { useState } from "react";
import { useSurveyTheme } from "../../../../backend/surveyTheme/surveyTheme.query";
import {
  PreviewTypeEnum,
  SelectedItemEnum,
} from "../../../../components/Survey/SurveyTheme/SurveyTheme.enums";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import TestTemplate from "./templateCard";
import TemplateCard from "./templateCard";

const SurveyTemplates = ({ survey, setSelectedTemplate, bgTemp, open }) => {
  const { data: surveyTheme, isLoading: isThemeloading } = useSurveyTheme(
    survey?.webSurveyThemeId,
  );

  const [selectedPreview, setSelectedPreview] = useState(
    PreviewTypeEnum.DESKTOP,
  );
  const [selectedType, setSelectedType] = useState<SelectedItemEnum>(
    SelectedItemEnum.BACKGROUND,
  );
  if (isThemeloading) {
    return (
      <Stack>
        <Paper
          radius={"lg"}
          shadow="md"
          mr="md"
          style={{
            width: "300px",
            minHeight: "150px",
            marginTop: "2rem",
            overflow: "hidden",
            objectFit: "cover",
          }}
        >
          <Skeleton height={150} />
        </Paper>
      </Stack>
    );
  }

  return (
    <SurveyThemeContextProvider
      surveyTheme={surveyTheme}
      mobileOrDesktop={selectedPreview}
      setMobileOrDesktop={setSelectedPreview}
    >
      <Stack>
        <Paper
          radius={"lg"}
          shadow="md"
          mr="md"
          onClick={() => {
            setSelectedTemplate(survey);
            open();
          }}
          style={{
            ...(survey?.WelcomeTheme?.bgType === "bgcolor"
              ? survey?.WelcomeTheme?.bgStyles
              : bgTemp),
            width: "300px",
            minHeight: "150px",
            cursor: "pointer",
            marginTop: "2rem",
            overflow: "hidden",
            objectFit: "cover",
          }}
        >
          <TemplateCard {...{ selectedType, setSelectedType }} />
        </Paper>
      </Stack>
    </SurveyThemeContextProvider>
  );
};

export default SurveyTemplates;
