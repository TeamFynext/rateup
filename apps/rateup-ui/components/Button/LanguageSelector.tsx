"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Grid, Menu, Text } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { useUpdateUserLanguageMutation } from "../../backend/user/user.query";

const LanguageSelector = () => {
  const router = useRouter();
  const [language, setLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const translations = useExtracted();
  const updateUserLanguageMutation =
    useUpdateUserLanguageMutation(setIsLoading);

  useEffect(() => {
    // Load the selected language from localStorage on component mount
    const savedLanguage = localStorage.getItem("selectedLanguage");
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleLanguageChange = (selectedLanguage) => {
    setLanguage(selectedLanguage);
    localStorage.setItem("selectedLanguage", selectedLanguage); // Save to localStorage

    // Preserve the current pathname and query parameters
    // Todo: convert this to next-intl
    // const { pathname, asPath, query } = router;

    // updateUserLanguageMutation.mutate(
    //   { prefLanguage: selectedLanguage },
    //   {
    //     onSuccess: () => {
    //       // Change only the locale while keeping the user on the same page
    //       router.push({ pathname, query }, asPath, {
    //         locale: selectedLanguage,
    //       });
    //     },
    //   },
    // );
  };

  return (
    <Menu width={200}>
      <Menu.Target>
        <Grid
          align="center"
          style={{
            cursor: "pointer",
            padding: "15px",
            border: "1px solid lightgrey",
            borderRadius: "4px",
          }}
        >
          <IconLanguage style={{ width: 20, height: 20, marginRight: 8 }} />
          <Text size="sm" c="dimmed">
            {language || "Select Language"}
          </Text>
        </Grid>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection="🇺🇸" onClick={() => handleLanguageChange("en")}>
          {translations("English")}
        </Menu.Item>
        <Menu.Item leftSection="🇩🇪" onClick={() => handleLanguageChange("de")}>
          {translations("German")}
        </Menu.Item>
        <Menu.Item leftSection="🇮🇳" onClick={() => handleLanguageChange("hi")}>
          {translations("Hindi")}
        </Menu.Item>
        <Menu.Item leftSection="🇫🇷" onClick={() => handleLanguageChange("fr")}>
          {translations("French")}
        </Menu.Item>
        <Menu.Item leftSection="🇸🇦" onClick={() => handleLanguageChange("ar")}>
          {translations("Arabic")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default LanguageSelector;
