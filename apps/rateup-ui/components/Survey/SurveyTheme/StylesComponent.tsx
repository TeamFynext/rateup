import React from "react";
import BackgroundStyles from "./components/BackgroundStyles";
import HeaderStyles from "./components/HeaderStyles";
import DescStyles from "./components/DescStyles";
import ButtonStyles from "./components/ButtonStyles";
import { Title, Divider } from "@mantine/core";
import LogoStyles from "./components/LogoStyles";

function StylesComponent({
  selectedType,
  saveStyles,
  currentStyles,
  setCurrentstyles,
  loadFont,
  saveLoading,
  setbgImage,
}) {
  return (
    <div>
      <Title order={4} style={{ textTransform: "uppercase" }}>
        {selectedType === "header" ? "Heading" : selectedType}
      </Title>
      <Divider mt="sm" mb={15} />
      {selectedType == "logo" && (
        <div>
          <LogoStyles
            saveStyles={saveStyles}
            currentStyles={currentStyles}
            setCurrentstyles={setCurrentstyles}
            saveLoading={saveLoading}
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
            setbgImage={setbgImage}
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
