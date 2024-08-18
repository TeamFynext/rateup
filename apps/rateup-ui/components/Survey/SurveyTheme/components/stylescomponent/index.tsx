import {
  Accordion,
  Box,
  Button,
  Divider,
  Group,
  MantineProvider,
  Overlay,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { IconChevronsDown, IconChevronsUp } from "@tabler/icons-react";

import { theme } from "../../../../../config/mantineTheme";
import { supportedPageEditors } from "../../SurveyTheme.constants";
import { ThemeTabEnum } from "../../SurveyTheme.enums";
import surveyThemeStyles from "../../SurveyTheme.module.css";
import {
  useOpenEditors,
  useSelectedPageTab,
  useSetOpenEditors,
} from "../../SurveyThemeContext";
import SaveButton from "../SaveButton";
import ThemeSelector from "../ThemeSelector";
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

  const editorComponents = supportedPageEditors[selectedPageTab];
  const shouldDisplayThemeSelector = selectedPageTab === ThemeTabEnum.SURVEY;

  return (
    <MantineProvider theme={theme}>
      <Stack className={styles["styles-component-root-div"]}>
        {shouldDisplayThemeSelector && (
          <ThemeSelector
            className={styles["theme-selector-div"]}
            allThemesArr={allThemesArr}
            themeSelectorState={themeSelectorState}
            setThemeSelectorState={setThemeSelectorState}
            isAllThemesFetchPending={isAllThemesFetchPending}
            survey={survey}
          />
        )}

        <Divider />
        <Group className={styles["expand-all-collapse-all-btn-container"]}>
          <Button
            leftSection={<IconChevronsDown size={"1rem"} />}
            onClick={() => {
              const editorsObjArr = supportedPageEditors[selectedPageTab];
              if (editorsObjArr) {
                setOpenEditors(editorsObjArr.map(({ value }) => value));
              }
            }}
          >
            Expand All
          </Button>
          <Button
            leftSection={<IconChevronsUp size={"1rem"} />}
            onClick={() => setOpenEditors([])}
          >
            Collapse All
          </Button>
        </Group>
        <Divider />
        <ScrollArea
          type="hover"
          className={`${styles["styles-component-div"]} styles-component-div`}
        >
          {isThemeObjBeingEditedDefaultTheme && (
            <Overlay className={surveyThemeStyles["overlay"]} zIndex={198} />
          )}

          <Accordion
            multiple
            onChange={(valuesArr) => {
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
            <Button
              className={styles["close-btn"]}
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
          </Box>

          <SaveButton
            className={styles["save-btn-div"]}
            survey={survey}
            isThemeObjBeingEditedDefaultTheme={
              isThemeObjBeingEditedDefaultTheme
            }
            themeObjBeingEdited={themeObjBeingEdited}
            onSave={onClose}
          />
        </Group>
      </Stack>
    </MantineProvider>
  );
}

export default StylesComponent;
