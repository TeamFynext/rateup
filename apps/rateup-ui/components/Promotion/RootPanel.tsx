import { useDisclosure } from "@mantine/hooks";
import ImportRespondents, { ImportRespondentsModal } from "./ImportRespondents";
import { ListItem, LeftPanel } from "./Sidebar";
import { Box, Flex, Paper, Tabs, Text } from "@mantine/core";
import { PromotionTab } from "../../types/enums";
import { useRespondents } from "../../backend/respondent/respondent/respondent.query";
import CenteredSpinner from "../Loaders/CenteredSpinner";
import { useContext, useState } from "react";
import SelectedTeamContext from "../../context/SelectedTeam";
import { useRGroups } from "../../backend/respondent/rgroup/rgroup.query";
import { IndividualMainWindow } from "./RightPanel/IndividualChat";
import { GroupMainWindow } from "./RightPanel/GroupChat";

export default function PromotionRootPanel({ activeTab, setActiveTab }) {
  const [importModalIsOpen, { open, close }] = useDisclosure(false)
  const { selectedTeamId } = useContext(SelectedTeamContext)

  const {
    isLoading: groupsLoading,
    error: groupsError,
    data: rgroups
  } = useRGroups(selectedTeamId, activeTab === PromotionTab.Groups)
  const {
    isLoading: respondentsLoading,
    data: respondents,
    error: respondentsError
  } = useRespondents(selectedTeamId, activeTab === PromotionTab.Individuals)

  const [selected, setSelected] = useState(0)

  // TODO: handle loading ui
  const items = activeTab === PromotionTab.Groups ? rgroups : respondents;

  return (
    <Flex
      style={{
        width: "100%",
        height: "100%",
      }}
      gap={"md"}
    >
      <LeftPanel
        selected={selected}
        setSelected={setSelected}
        items={items}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sx={{
          flex: 3,
          boxShadow: "2px 4px 7px 0px rgba(0, 0, 0, 0.06);",
          borderRadius: "8px"
        }}
        importModalIsOpen={importModalIsOpen}
        openImport={open}
        closeImport={close}
      >
      </LeftPanel>
      <RightPanel
        activeTab={activeTab}
        selected={selected}
        items={items}
        openImport={open}
      />
    </Flex>
  )
}

function RightPanel({
  activeTab,
  selected,
  items,
  openImport
}) {
  return <Paper
    style={{
      flex: 7,
      boxShadow: "2px 4px 7px 0px rgba(0, 0, 0, 0.06);",
      borderRadius: "8px",
      overflow: "clip"
    }}
  >
    <Tabs.Panel value={PromotionTab.Groups} style={{ flexGrow: 1, height: "100%" }}>
      <GroupMainWindow
        openCreateGroup={openImport}
        rgroup={items?.find(({ id }) => id === selected)}
      />
    </Tabs.Panel>
    <Tabs.Panel value={PromotionTab.Individuals} style={{ flexGrow: 1, height: "100%" }}>
      <IndividualMainWindow
        openImport={openImport}
        respondent={items?.find(({ id }) => id === selected)}
      />
    </Tabs.Panel>
  </Paper>;
}
