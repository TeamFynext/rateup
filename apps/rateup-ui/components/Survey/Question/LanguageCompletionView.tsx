"use client";

import { Badge, Stack } from "@mantine/core";
import { useHover } from "@mantine/hooks";

import PaperLayout from "../../styled/Layouts/PaperLayout";

export const LanguageCompletionView = ({
  languages,
  notCompletedLanguages,
  selectedLanguage,
  setSelectedLanguage,
}: {
  languages: string[];
  notCompletedLanguages: string[];
  selectedLanguage?: string;
  setSelectedLanguage?: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
    <PaperLayout w={"fit-content"} p={10} radius={"md"}>
      <Stack gap={5}>
        {languages?.map((language, i) => {
          const { hovered, ref } = useHover();
          return (
            <Badge
              key={i}
              id={language}
              ref={ref}
              style={{ cursor: "pointer" }}
              color={
                !notCompletedLanguages.includes(language) ? "green" : "red"
              }
              variant={
                selectedLanguage === language || hovered ? "filled" : "light"
              }
              onClick={() => setSelectedLanguage(language)}
            >
              {language}
            </Badge>
          );
        })}
      </Stack>
    </PaperLayout>
  );
};
