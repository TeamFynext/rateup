import { Flex, MantineProvider, Tabs } from "@mantine/core";
import SelectedTeamContext from "../../../../context/SelectedTeam";
import { PromotionTab } from "../../../../types/enums";
import PromotionRootPanel from "../../../../components/Promotion/RootPanel";
import { whatsappTheme } from "../../../../components/Promotion/promotion.config";
import { useState } from "react";
import { TeamSelector } from "../../../../components/input/TeamSelector";

export default function Promotion() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [activeTab, setActiveTab] = useState(PromotionTab.Groups);

  return (
    <MantineProvider theme={whatsappTheme}>
      <Flex
        justify={"end"}
        direction={"column"}
        gap={10}
        wrap="wrap"
        h={"100%"}
      >
        <TeamSelector
          value={selectedTeamId}
          onChange={(value) => setSelectedTeamId(value)}
        />
        <Tabs
          keepMounted={false}
          value={activeTab}
          style={{ flexGrow: 1 }}
          orientation="horizontal"
        >
          <SelectedTeamContext.Provider value={{ selectedTeamId }}>
            <PromotionRootPanel
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </SelectedTeamContext.Provider>
        </Tabs>
      </Flex>
    </MantineProvider>
  );
}
