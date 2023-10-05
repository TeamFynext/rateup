import { useDisclosure } from "@mantine/hooks";
import { LeftPanel } from "./Sidebar";
import { Flex, Paper, Tabs } from "@mantine/core";
import { PromotionTab } from "../../types/enums";
import { useContext, useState } from "react";
import SelectedTeamContext from "../../context/SelectedTeam";
import { IndividualMainWindow } from "./RightPanel/IndividualChat";
import { GroupMainWindow } from "./RightPanel/GroupChat";
import { useWaCustomers } from "../../backend/whatsapp/customer/waCustomer/waCustomer.query";
import { useWaCustomerGroups } from "../../backend/whatsapp/customer/waCustomerGroup/waCustomerGroup.query";

export default function PromotionRootPanel({ activeTab, setActiveTab }) {
  const [importModalIsOpen, { open, close }] = useDisclosure(false);
  const { selectedTeamId } = useContext(SelectedTeamContext);

  const {
    isLoading: groupsLoading,
    error: groupsError,
    data: rgroups,
  } = useWaCustomerGroups(selectedTeamId, activeTab === PromotionTab.Groups);
  const {
    isLoading: waCustomersLoading,
    data: waCustomers,
    error: waCustomersError,
  } = useWaCustomers(selectedTeamId, activeTab === PromotionTab.Individuals);

  const [selected, setSelected] = useState(0);

  // TODO: handle loading ui
  const items = activeTab === PromotionTab.Groups ? rgroups : waCustomers;

  return (
    <Flex
      style={{
        height: "--webkit-fill-available",
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
          boxShadow: "2px 4px 7px 0px rgba(0, 0, 0, 0.06)",
          borderRadius: "8px",
        }}
        importModalIsOpen={importModalIsOpen}
        openImport={open}
        closeImport={close}
      ></LeftPanel>
      <RightPanel
        activeTab={activeTab}
        selected={selected}
        items={items}
        openImport={open}
      />
    </Flex>
  );
}

function RightPanel({ activeTab, selected, items, openImport }) {
  return (
    <Paper
      style={{
        flex: 7,
        boxShadow: "2px 4px 7px 0px rgba(0, 0, 0, 0.06)",
        borderRadius: "8px",
        overflow: "clip",
      }}
    >
      <Tabs.Panel
        value={PromotionTab.Groups}
        style={{ flexGrow: 1, height: "100%" }}
      >
        <GroupMainWindow
          openCreateGroup={openImport}
          rgroup={items?.find(({ id }) => id === selected)}
        />
      </Tabs.Panel>
      <Tabs.Panel
        value={PromotionTab.Individuals}
        style={{ flexGrow: 1, height: "100%" }}
      >
        <IndividualMainWindow
          openImport={openImport}
          waCustomer={items?.find(({ id }) => id === selected)}
        />
      </Tabs.Panel>
    </Paper>
  );
}
