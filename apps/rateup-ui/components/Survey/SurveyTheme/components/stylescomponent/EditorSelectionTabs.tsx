import { Tabs, TabsList, TabsTab } from "@mantine/core";

import tabsStyles from "@/components/Survey/SurveyTheme/components/PageSelector/PageSelector.module.css";

import styles from "./StylesComponent.module.css";

function EditorSelectionTabs({ data, value, onChange, className }) {
  return (
    <Tabs
      value={value}
      onChange={onChange}
      classNames={tabsStyles}
      className={className}
    >
      <TabsList>
        {data.map((value) => {
          return (
            <TabsTab key={value} value={value}>
              {value}
            </TabsTab>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

export default EditorSelectionTabs;
