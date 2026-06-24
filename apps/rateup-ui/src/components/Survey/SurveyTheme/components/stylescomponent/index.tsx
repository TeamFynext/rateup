import {
  Accordion,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  Flex,
  Group,
  Overlay,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { produce } from "immer";
import { difference } from "lodash";
import { useCallback } from "react";

import { useSurveyUpdateMutation } from "@/backend/surveys/surveys.query";

import { getSurveyThemeKeyOf, supportedPageEditors } from "../../SurveyTheme.constants";
import { ThemeTabEnum } from "../../SurveyTheme.enums";
import {
  useOpenEditors,
  useSelectedPageTab,
  useSetOpenEditors,
} from "../../SurveyThemeContext.tsx";
import PageThemeSaveBtn from "../PageThemeSaveButton/indext.tsx";
import SaveButton from "../SaveButton/index.tsx";
import ThemeSelector from "../ThemeSelector/index.tsx";

import surveyThemeStyles from "../../SurveyTheme.module.css";
import styles from "./StylesComponent.module.css";

function StylesComponent({
  survey,
  isThemeObjBeingEditedDefaultTheme,
  themeObjBeingEdited,
  onClose,
  allThemesArr,
  themeSelectorState,
  setThemeSelectorState,
  isAllThemesFetchPending,
}) {
  const selectedPageTab = useSelectedPageTab();
  const openEditors = useOpenEditors();
  const setOpenEditors = useSetOpenEditors();

  const surveyThemeKey = getSurveyThemeKeyOf(selectedPageTab);
  const isSurveyPageTab = selectedPageTab === "surveyPage";
  const selectedPageUseSurveyThemeValue =
    survey?.webSurveyPagesTheme?.[surveyThemeKey]?.["useSurveyTheme"];
  const shouldUseSurveyTheme = selectedPageUseSurveyThemeValue && !isSurveyPageTab;

  const editorComponents = supportedPageEditors[selectedPageTab];
  const shouldDisplayThemeSelector = selectedPageTab === ThemeTabEnum.SURVEY;

  const surveyUpdateMutation = useSurveyUpdateMutation(survey?.id);

  const handleUseSurveyThemeCheckboxChange = useCallback(
    async (event) => {
      const value = event.target.checked;
      const webSurveyPagesTheme = survey?.webSurveyPagesTheme;
      const newWebSurveyPagesTheme = produce(webSurveyPagesTheme, (draft) => {
        draft[surveyThemeKey]["useSurveyTheme"] = value;
      });

      await surveyUpdateMutation.mutateAsync({
        surveyId: survey?.id,
        data: {
          webSurveyPagesTheme: newWebSurveyPagesTheme,
        },
      });
    },
    [survey],
  );

  return (
    <Stack className={styles["styles-component-root-div"]}>
      {shouldDisplayThemeSelector && (
        <>
          <ThemeSelector
            className={styles["theme-selector-div"]}
            allThemesArr={allThemesArr}
            themeSelectorState={themeSelectorState}
            setThemeSelectorState={setThemeSelectorState}
            isAllThemesFetchPending={isAllThemesFetchPending}
            survey={survey}
          />
          <Divider />
        </>
      )}

      {!isSurveyPageTab && (
        <>
          <Box className={styles["use-survey-theme-checkbox-container"]}>
            <Checkbox
              className={styles["use-survey-theme-checkbox"]}
              checked={selectedPageUseSurveyThemeValue}
              label="Use Survey Theme"
              size="1.25rem"
              onChange={handleUseSurveyThemeCheckboxChange}
            />
          </Box>
          <Divider />
        </>
      )}

      <ScrollArea
        type="hover"
        className={`${styles["styles-component-div"]} styles-component-div`}
        scrollbarSize={10}
      >
        {((isSurveyPageTab && isThemeObjBeingEditedDefaultTheme) || shouldUseSurveyTheme) && (
          <Overlay className={surveyThemeStyles["overlay"]} zIndex={198}>
            {isSurveyPageTab && isThemeObjBeingEditedDefaultTheme && (
              <Center
                className={styles["default-theme-not-editable-overlay-message-container-root-div"]}
              >
                <Flex className={styles["overlay-message-container"]}>
                  <p className={styles["overlay-message-p"]}>
                    Default themes are not editable. Choose another theme or create a new one.
                  </p>
                </Flex>
              </Center>
            )}
          </Overlay>
        )}
        <Accordion
          className={styles["accordion-root-div"]}
          multiple
          onChange={(valuesArr) => {
            if (openEditors?.length === supportedPageEditors[selectedPageTab]?.length) {
              const editorsObjArr = supportedPageEditors[selectedPageTab];
              const allValues = editorsObjArr?.map(({ value }) => value);
              const diff = difference(allValues, valuesArr);
              setOpenEditors(diff);
              return;
            }
            const lastEleIndex = valuesArr.length - 1;
            if (lastEleIndex > 0) {
              setOpenEditors(valuesArr.splice(lastEleIndex, 1));
              return;
            }
            setOpenEditors(valuesArr);
          }}
          value={openEditors}
        >
          {editorComponents?.map(({ id, Component, value, label }) => {
            if (Component) {
              return (
                <Accordion.Item key={selectedPageTab + id} value={value}>
                  <Accordion.Control>{label}</Accordion.Control>
                  <Accordion.Panel>
                    <Component />
                  </Accordion.Panel>
                </Accordion.Item>
              );
            }
          })}
        </Accordion>
      </ScrollArea>
      <Divider />
      <Group className={styles["close-save-btns-container"]}>
        <Box className={styles["close-btn-div"]}>
          <Button className={styles["close-btn"]} onClick={onClose} variant="outline">
            Close
          </Button>
        </Box>

        {isSurveyPageTab && (
          <SaveButton
            className={styles["save-btn-div"]}
            survey={survey}
            isThemeObjBeingEditedDefaultTheme={isThemeObjBeingEditedDefaultTheme}
            themeObjBeingEdited={themeObjBeingEdited}
            onSave={onClose}
          />
        )}

        {!isSurveyPageTab && (
          <PageThemeSaveBtn
            className={styles["page-theme-save-btn"]}
            disabled={shouldUseSurveyTheme}
            survey={survey}
            selectedPageTab={selectedPageTab}
          />
        )}
      </Group>
    </Stack>
  );
}

export default StylesComponent;
