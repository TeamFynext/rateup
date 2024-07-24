import React, { useState } from "react";
import { useRouter } from "next/router";

import { Select } from "@mantine/core";

import { useUpdateUserLanguageMutation } from "../../backend/user/user.query";

const LanguageSelector = () => {
  const [language, setLanguage] = useState("");
  const router = useRouter();
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
          router.push(router.asPath, router.asPath, {
            locale: selectedLanguage,
          });
        },
      },
    );
  };

  return (
    <Select
      data={[
        { value: "en", label: "English" },
        { value: "de", label: "Deutsch" },
        { value: "hi", label: "Hindi" }, //not yet started
        { value: "ar", label: "Arabic" }, // not yet started
      ]}
      value={language}
      onChange={handleLanguageChange}
      placeholder="Select Language"
      sx={{
        width: 80,
        marginRight: "10px",
      }}
      disabled={isLoading}
    />
  );
};

export default LanguageSelector;
