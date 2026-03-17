"use client";

import { useContext } from "react";

import { TextInput, useMantineTheme } from "@mantine/core";
import { IconMail } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";

export function EmailForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const translations = useExtracted();
  return (
    <FormPaperLayout>
      <TextInput
        placeholder={translations("Enter email address")}
        value={response || ""}
        onChange={(e) => updateResponse(e.currentTarget.value)}
        style={{ maxWidth: "400px" }}
        leftSection={
          <IconMail
            size="1.2rem"
            color={`var(--mantine-color-${theme.primaryColor}-outline)`}
          />
        }
        variant="unstyled"
        classNames={{
          input: classes.input,
        }}
      />
    </FormPaperLayout>
  );
}
