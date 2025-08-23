import { useCallback } from "react";

import { Tabs } from "@mantine/core";
import { useTranslations } from "next-intl";

import { ThemeTabEnum } from "../../SurveyTheme.enums";
import {
  useSelectedPageTab,
  useSurveyThemeStateDispatch,
} from "../../SurveyThemeContext";
import styles from "./PageSelector.module.css";

function PageSelector({ survey }) {
  const selectedPageTab = useSelectedPageTab();
  const stateDispatch = useSurveyThemeStateDispatch();
  const translations = useTranslations();
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
        <Tabs.Tab value={ThemeTabEnum.SURVEY}>
          {translations("Survey Page")}
        </Tabs.Tab>
        <Tabs.Tab value={ThemeTabEnum.WELCOME}>
          {translations("Welcome Page")}
        </Tabs.Tab>
        <Tabs.Tab value={ThemeTabEnum.THANKYOU}>
          {translations("Thankyou Page")}
        </Tabs.Tab>
        {shouldDispalyLanguagePageTab && (
          <Tabs.Tab value={ThemeTabEnum.LANGUAGE}>
            {translations("Language Page")}
          </Tabs.Tab>
        )}
      </Tabs.List>
    </Tabs>
  );
}

export default PageSelector;
