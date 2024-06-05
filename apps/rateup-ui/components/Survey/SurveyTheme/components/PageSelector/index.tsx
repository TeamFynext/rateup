import { Tabs } from "@mantine/core";
import { ThemeTabEnum } from "../../SurveyTheme.enums";
import styles from "./PageSelector.module.css";
import {
  useSelectedPageTab,
  useSurveyThemeStateDispatch,
} from "../../SurveyThemeContext";
import { useCallback } from "react";

function PageSelector({ survey }) {
  const selectedPageTab = useSelectedPageTab();
  const stateDispatch = useSurveyThemeStateDispatch();

  const handleChange = useCallback((value) => {
    stateDispatch({
      type: "selected-page-tab-change",
      payload: value,
    });
  }, []);

  const shouldDispalyLanguagePageTab = survey?.languages?.length > 1;

  return (
    <Tabs
      classNames={styles}
      onChange={handleChange}
      defaultValue={ThemeTabEnum.SURVEY}
      value={selectedPageTab}
    >
      <Tabs.List>
        <Tabs.Tab value={ThemeTabEnum.SURVEY}>Survey Page</Tabs.Tab>
        <Tabs.Tab value={ThemeTabEnum.WELCOME}>Welcome Page</Tabs.Tab>
        <Tabs.Tab value={ThemeTabEnum.THANKYOU}>Thankyou Page</Tabs.Tab>
        {shouldDispalyLanguagePageTab && (
          <Tabs.Tab value={ThemeTabEnum.LANGUAGE}>Language Page</Tabs.Tab>
        )}
      </Tabs.List>
    </Tabs>
  );
}

export default PageSelector;
