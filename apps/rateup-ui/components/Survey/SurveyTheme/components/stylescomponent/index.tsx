import {
  Box,
  Group,
  MantineProvider,
  Overlay,
  ScrollArea,
  Select,
  Tabs,
} from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";

import { theme } from "../../../../../config/mantineTheme";
import { supportedPageEditors } from "../../SurveyTheme.constants";
import { SelectedItemEnum, ThemeTabEnum } from "../../SurveyTheme.enums";
import surveyThemeStyles from "../../SurveyTheme.module.css";
import { _SurveyTheme } from "../../surveyTheme.types";
import {
  useSelectedEditor,
  useSelectedPageTab,
  useSetSelectedEditor,
} from "../../SurveyThemeContext";
import BackgroundStyles from "../BackgroundStyles";
import ButtonStyles from "../ButtonStyles";
import DescStyles from "../DescStyles";
import HeaderStyles from "../HeaderStyles";
import InputStyles from "../InputStyles";
import LogoStyles from "../LogoStyles";
import SaveButton from "../SaveButton";
import EditorSelectionTabs from "./EditorSelectionTabs";
import styles from "./StylesComponent.module.css";

function RenderOption({ option, checked }) {
  return <Box>{option.label}</Box>;
}

function StylesComponent({
  survey,
  isThemeObjBeingEditedDefaultTheme,
  themeObjBeingEdited,
  useTabsForEditorSelection = false,
  displaySaveBtn = false,
}) {
  const selectedPageTab = useSelectedPageTab();
  const selectedEditor = useSelectedEditor();
  const setSelectedEditor = useSetSelectedEditor();

  const isWelcomePageEnabled = survey?.welcomePageEnabled;

  return (
    <MantineProvider theme={theme}>
      <ScrollArea
        type="hover"
        className={`${styles["styles-component-div"]} styles-component-div`}
      >
        {isThemeObjBeingEditedDefaultTheme && (
          <Overlay className={surveyThemeStyles["overlay"]} />
        )}

        {useTabsForEditorSelection ? (
          <Group className={styles["tabs-list-tabs-comp-container"]}>
            <EditorSelectionTabs
              data={supportedPageEditors[selectedPageTab]}
              value={selectedEditor}
              onChange={setSelectedEditor}
            />
            {displaySaveBtn && (
              <SaveButton
                survey={survey}
                isThemeObjBeingEditedDefaultTheme={
                  isThemeObjBeingEditedDefaultTheme
                }
                themeObjBeingEdited={themeObjBeingEdited}
              />
            )}
          </Group>
        ) : (
          <Select
            className={styles["editor-select-dropdown"]}
            value={selectedEditor}
            data={supportedPageEditors[selectedPageTab]}
            onChange={setSelectedEditor}
            leftSection={<IconEdit width={"1rem"} />}
            renderOption={RenderOption}
            classNames={{
              option: styles["editor-select-dropdown-option"],
              input: styles["editor-selector-dropdown-input"],
            }}
            allowDeselect={false}
          />
        )}

        <Tabs value={selectedEditor}>
          {supportedPageEditors[selectedPageTab].includes(
            SelectedItemEnum.BACKGROUND,
          ) && (
            <Tabs.Panel value={SelectedItemEnum.BACKGROUND}>
              <BackgroundStyles />
            </Tabs.Panel>
          )}

          {supportedPageEditors[selectedPageTab].includes(
            SelectedItemEnum.TITLE,
          ) && (
            <Tabs.Panel value={SelectedItemEnum.TITLE}>
              <HeaderStyles />
            </Tabs.Panel>
          )}

          {supportedPageEditors[selectedPageTab].includes(
            SelectedItemEnum.SUBTITLE,
          ) && (
            <Tabs.Panel value={SelectedItemEnum.SUBTITLE}>
              <DescStyles />
            </Tabs.Panel>
          )}

          {supportedPageEditors[selectedPageTab].includes(
            SelectedItemEnum.BUTTON,
          ) && (
            <Tabs.Panel value={SelectedItemEnum.BUTTON}>
              <ButtonStyles />
            </Tabs.Panel>
          )}

          {supportedPageEditors[selectedPageTab].includes(
            SelectedItemEnum.INPUT,
          ) && (
            <Tabs.Panel value={SelectedItemEnum.INPUT}>
              <InputStyles />
            </Tabs.Panel>
          )}

          {supportedPageEditors[selectedPageTab].includes(
            SelectedItemEnum.LOGO,
          ) && (
            <Tabs.Panel value={SelectedItemEnum.LOGO}>
              <LogoStyles />
            </Tabs.Panel>
          )}
        </Tabs>
      </ScrollArea>
    </MantineProvider>
  );
}

export default StylesComponent;
