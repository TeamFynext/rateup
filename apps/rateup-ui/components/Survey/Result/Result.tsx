import React from "react";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import { Tabs } from "@mantine/core";
import Responses from "../Response/Responses";
import SurveyStats from "./SurveyStats";
import SurveySummary from "./SurveySummary";
import ResultsOverview from "./ResultsOverview";

const Result = ({ survey }) => {
  return (
    <StyledTabs
      defaultValue="overview"
      placement="left"
      orientation="vertical"
      styles={{
        root: {
          flexDirection: "row",
          flexWrap: "wrap",
        },
        list: {
          position: "sticky",
          display: "flex",
          flexDirection: "column",
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
          height: "fit-content",
          minWidth: 200,
          border: "1px solid var(--mantine-color-gray-3)",
        },
        panel: {
          minWidth: "300px",
          padding: "10px",
          height: "100%",
          overflow: "scroll",
        },
      }}
    >
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
        <Tabs.Tab value="responses">Responses</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">
        <SurveyStats survey={survey} />
        <SurveySummary />
      </Tabs.Panel>
      <Tabs.Panel value="analytics">
        <ResultsOverview />
      </Tabs.Panel>
      <Tabs.Panel value="responses">
        <Responses survey={survey} />
      </Tabs.Panel>
    </StyledTabs>
  );
};

export default Result;
