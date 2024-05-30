import { Paper, Stack } from "@mantine/core";
import { SurveyThemeContextProvider } from "../../../../components/Survey/SurveyTheme/SurveyThemeContext";
import TemplateCard from "./templateCard";

const SurveyTemplates = ({ survey, setSelectedTemplate, bgTemp, open }) => {
  const { theme: surveyTheme } = survey?.webSurveyTheme;

  return (
    <SurveyThemeContextProvider surveyTheme={surveyTheme}>
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
          <TemplateCard />
        </Paper>
      </Stack>
    </SurveyThemeContextProvider>
  );
};

export default SurveyTemplates;
