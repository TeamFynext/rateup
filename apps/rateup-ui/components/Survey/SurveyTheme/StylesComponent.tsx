import React, { useEffect, useState } from "react";
import BackgroundStyles from "./components/BackgroundStyles";
import HeaderStyles from "./components/HeaderStyles";
import DescStyles from "./components/DescStyles";
import ButtonStyles from "./components/ButtonStyles";
import { Box, Tabs, Divider } from "@mantine/core";
import LogoStyles from "./components/LogoStyles";
import TabsCommon from "../../menu/landingPage/Tabs/TabsCommon";

function StylesComponent({
  selectedType,
  saveStyles,
  currentStyles,
  setCurrentstyles,
  saveLoading,
  setbgImage,
  setbgMobileImage,
  setSelectedTab,
  selectedTab,
}) {
  const [tabState, setTabState] = useState<string>("Bg");

  useEffect(() => {
    switch (selectedType) {
      case "logo":
        setTabState("Logo");
        break;
      case "header":
        setTabState("Title");
        break;
      case "description":
        setTabState("Desc");
        break;
      case "button":
        setTabState("Btn");
        break;
      case "background":
        setTabState("Bg");
        break;
      default:
        setTabState("Bg");
        break;
    }
  }, [selectedType]);

  function getDividerLabel(tabState) {
    switch (tabState) {
      case "Logo":
        return "Logo";
      case "Title":
        return "Title";
      case "Desc":
        return "Description";
      case "Btn":
        return "Button";
      case "Bg":
        return "Background";
      default:
        return "Background";
    }
  }

  return (
    <Box mt="-10px">
      <TabsCommon
        tabHeading={["Bg", "Logo", "Title", "Desc", "Btn"]}
        value={tabState}
        radius={"xl"}
        onChange={(value: string) => setTabState(value)}
      >
        <Divider
          label={`${getDividerLabel(tabState)} Settings`}
          labelPosition="center"
          mt="sm"
          mb="md"
        />
        <Tabs.Panel value="Bg">
          <BackgroundStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            saveLoading={saveLoading}
            setbgImage={setbgImage}
            setbgMobileImage={setbgMobileImage}
            setSelectedTab={setSelectedTab}
            selectedTab={selectedTab}
          />
        </Tabs.Panel>

        <Tabs.Panel value="Logo">
          <LogoStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            saveLoading={saveLoading}
          />
        </Tabs.Panel>

        <Tabs.Panel value="Title">
          <HeaderStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            saveLoading={saveLoading}
          />
        </Tabs.Panel>

        <Tabs.Panel value="Desc">
          <DescStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            saveLoading={saveLoading}
          />
        </Tabs.Panel>

        <Tabs.Panel value="Btn">
          <ButtonStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            saveLoading={saveLoading}
          />
        </Tabs.Panel>
      </TabsCommon>
    </Box>
  );
}

export default StylesComponent;
