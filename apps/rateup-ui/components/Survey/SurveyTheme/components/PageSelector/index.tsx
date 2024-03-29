import { Tabs } from "@mantine/core";
import { ThemeTabEnum } from "../../SurveyTheme.enums";
import styles from "./PageSelector.module.css";

function PageSelector({ onChange, value }) {
  return (
    <Tabs
      classNames={styles}
      onChange={onChange}
      defaultValue={ThemeTabEnum.SURVEY}
      value={value}
    >
      <Tabs.List>
        <Tabs.Tab value={ThemeTabEnum.SURVEY}>Survey</Tabs.Tab>
        <Tabs.Tab value={ThemeTabEnum.WELCOME}>Welcome Page</Tabs.Tab>
        <Tabs.Tab value={ThemeTabEnum.THANKYOU}>Thankyou Page</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}

export default PageSelector;
