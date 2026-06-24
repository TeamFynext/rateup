import { Grid, Stack } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { produce } from "immer";
import { useCallback } from "react";

import { useSurveyUpdateMutation } from "@/backend/surveys/surveys.query";
import AutosaveInput from "@/components/input/AutosaveInput/index.tsx";

import styles from "./EditTranslations.module.css";

function EditTranslations({ survey, element, uiTextTranslations, languages }) {
  const { name, label } = element;

  const translatedValues = uiTextTranslations(name) || {};

  const surveyUpdateMutation = useSurveyUpdateMutation(survey?.id);

  // value means input value of autosaveinput, name is name prop we have passed to autosaveinput.
  const handleSave = useCallback(
    async (value, language) => {
      const newUiTextTranslationsObj = produce(uiTextTranslations, (draft) => {
        if (!draft[name]) {
          draft[name] = {};
        }
        draft[name][language.toLowerCase()] = value;
      });
      await surveyUpdateMutation.mutateAsync({
        surveyId: survey.id,
        data: {
          uiTextTranslations: newUiTextTranslationsObj,
        },
      });
    },
    [uiTextTranslations, name, survey],
  );

  return (
    <Stack>
      <h2 className={styles["heading"]}>{label}</h2>
      <Stack>
        {languages.map((language) => {
          const value = translatedValues[language.toLowerCase()];
          return (
            <Grid
              className={styles["edit-translation-grid"]}
              key={language}
              align="center"
              justify="center"
            >
              <Grid.Col span={4}>
                <p>{language}</p>
              </Grid.Col>
              <Grid.Col span={1}>
                <IconArrowRight />
              </Grid.Col>
              <Grid.Col span={4}>
                <AutosaveInput
                  name={language}
                  value={value}
                  onSave={handleSave}
                  showToasts={false}
                />
              </Grid.Col>
            </Grid>
          );
        })}
      </Stack>
    </Stack>
  );
}

export default EditTranslations;
