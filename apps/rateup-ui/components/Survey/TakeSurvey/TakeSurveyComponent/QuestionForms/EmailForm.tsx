import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { TextInput, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { IconMail } from "@tabler/icons-react";
import { returnColorsForTheme } from "../../../SurveyTheme/SurveyTheme.utils";
import { styleAttributeTypesEnum } from "../../../SurveyTheme/SurveyTheme.enums";
import FormPaperLayout from "./layout/FormPaperLayout";

export function EmailForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  return (
    <FormPaperLayout>
      <TextInput
        placeholder="Enter email address"
        value={response || ""}
        onChange={(e) => updateResponse(e.currentTarget.value)}
        style={{ maxWidth: "400px" }}
        leftSection={
          <IconMail
            size="1.2rem"
            color={returnColorsForTheme(styleAttributeTypesEnum.TEXT, theme)}
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
