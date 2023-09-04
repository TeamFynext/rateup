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
          />
        </div>
      )}
    </div>
  );
}

export default StylesComponent;
