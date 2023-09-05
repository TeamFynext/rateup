import React from "react";
import BackgroundStyles from "./components/BackgroundStyles";
import HeaderStyles from "./components/HeaderStyles";
import DescStyles from "./components/DescStyles";
import ButtonStyles from "./components/ButtonStyles";
import { Divider, Text } from "@mantine/core";
import LogoStyles from "./components/LogoStyles";

function StylesComponent({
  selectedType,
  saveStyles,
  currentStyles,
  setCurrentstyles,
  loadFont,
  saveLoading
}) {
  return (
    <div>
      <Text size={"md"} fw={500} tt={"capitalize"} mb={20}>
        {" "}
        {selectedType}
      </Text>

      {selectedType == "logo" && (
        <div>
          <LogoStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
          />
        </div>
      )}

      {selectedType == "background" && (
        <div>
          <BackgroundStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            saveLoading={saveLoading}
          />
        </div>
      )}
      {selectedType == "header" && (
        <div>
          <HeaderStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            loadFont={loadFont}
            saveLoading={saveLoading}
          />
        </div>
      )}
      {selectedType == "description" && (
        <div>
          <DescStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            loadFont={loadFont}
            saveLoading={saveLoading}
          />
        </div>
      )}
      {selectedType == "button" && (
        <div>
          <ButtonStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            loadFont={loadFont}
            saveLoading={saveLoading}
          />
        </div>
      )}
    </div>
  );
}

export default StylesComponent;
