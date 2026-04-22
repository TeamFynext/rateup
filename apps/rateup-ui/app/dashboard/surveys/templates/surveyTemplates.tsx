import { Paper, Stack } from "@mantine/core";

import TemplateCard from "./templateCard";

const SurveyTemplates = ({ survey, setSelectedTemplate, bgTemp, open }) => {
  const { theme: surveyTheme } = survey?.webSurveyTheme;

  return (
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
        <TemplateCard survey={survey} />
      </Paper>
    </Stack>
  );
};

export default SurveyTemplates;
