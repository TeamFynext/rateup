"use client";

import { useContext } from "react";

import { Box, MultiSelect, Tabs } from "@mantine/core";
import { useTranslations } from "next-intl";

import SurveyContext from "../../../../../context/SurveyContext";
import StyledTabs from "../../../../styled/StyledTabs/StyledTabs";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
import styles from "./FlowPageHeader.module.css";

export enum FlowTabEnum {
  Edit = "Edit",
  Settings = "Settings",
  Share = "Share",
  Result = "Result",
}
function FlowPageHeader({ name, tab, setTabState }) {
  const { survey } = useContext(EditFlowContext);
  const { filterTeams, setFilterTeams } = useContext(SurveyContext);
  const multiSelectOptions = survey?.teams?.map((team) => {
    return { value: team?.mapId, label: team?.name };
  });
  const translations = useTranslations();
  return (
    <Box className={styles["flow-page-header"]}>
      <Box className={styles["heading-container"]}>
        <h1 className={styles["flow-page-heading-h1"]}>{name}</h1>
      </Box>
      <StyledTabs
        keepMounted={false}
        value={tab}
        defaultValue={FlowTabEnum.Edit}
        onChange={setTabState}
        h={"100%"}
      >
        <Tabs.List>
          {Object.values(FlowTabEnum).map((tabNameString) => {
            return (
              <Tabs.Tab key={tabNameString} value={tabNameString}>
                {tabNameString}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </StyledTabs>
      <Box
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        {tab === FlowTabEnum.Result ? (
          <MultiSelect
            w={"75%"}
            radius={"10px"}
            searchable
            clearable
            data={multiSelectOptions}
            value={filterTeams}
            onChange={setFilterTeams}
            placeholder={
              filterTeams.length > 0 ? "" : translations("All Teams")
            }
          />
        ) : null}
      </Box>
    </Box>
  );
}

export default FlowPageHeader;
