import { Box, Overlay, Tooltip, useMantineColorScheme } from "@mantine/core";
import { IconLockSquareRounded } from "@tabler/icons-react";
import React from "react";
import { useTranslation } from "react-i18next";

const PremiumFeature = ({ isSubscribed, children }) => {
  const { colorScheme } = useMantineColorScheme();
  const { t: translations } = useTranslation();
  const isDark = colorScheme === "dark";
  return (
    <Tooltip.Floating
      label={translations("Upgrade Your Plan")}
      disabled={isSubscribed}
      color="yellow"
    >
      <Box p="md" style={{ position: "relative", borderRadius: "2px" }}>
        {children}

        {!isSubscribed && (
          <Overlay
            blur={1}
            color={isDark ? "#333" : "#fff"}
            opacity={0.9}
            zIndex={5}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
            }}
          >
            <IconLockSquareRounded size={50} stroke={1.5} color="#FFBF00" />
          </Overlay>
        )}
      </Box>
    </Tooltip.Floating>
  );
};

export default PremiumFeature;
