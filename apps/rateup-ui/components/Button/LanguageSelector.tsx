import React, { useState } from "react";
import { useRouter } from "next/router";

import { Grid, Menu, Text } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";

import { useUpdateUserLanguageMutation } from "../../backend/user/user.query";

const LanguageSelector = () => {
  const router = useRouter();
  const [language, setLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updateUserLanguageMutation =
    useUpdateUserLanguageMutation(setIsLoading);

  const handleLanguageChange = (selectedLanguage) => {
    setLanguage(selectedLanguage);

    // Construct the new path based on the selected language
    const newPath = `/${selectedLanguage}/dashboard`;

    updateUserLanguageMutation.mutate(
      { prefLanguage: selectedLanguage },
      {
        onSuccess: () => {
          router.push(newPath, newPath, {
            locale: selectedLanguage,
          });
        },
      },
    );
  };

  return (
    <Menu width={200}>
      <Menu.Target>
        <Grid
          align="center" // Align items vertically in the center
          style={{
            cursor: "pointer",
            padding: "15px",
            border: "1px solid lightgrey",
            borderRadius: "4px",
          }}
        >
          <IconLanguage style={{ width: 20, height: 20, marginRight: 8 }} />
          <Text size="sm" fw={500} c="dimmed">
            {language || "Select Language"}
          </Text>
        </Grid>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection="🇺🇸" onClick={() => handleLanguageChange("en")}>
          English
        </Menu.Item>
        <Menu.Item leftSection="🇩🇪" onClick={() => handleLanguageChange("de")}>
          Deutsch
        </Menu.Item>
        <Menu.Item leftSection="🇮🇳" onClick={() => handleLanguageChange("hi")}>
          Hindi
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default LanguageSelector;
