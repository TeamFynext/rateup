import { useContext } from "react";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import FormPaperLayout from "./layout/FormPaperLayout";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Input, Stack } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { ContainedTextField } from "../../../../input/ContainedInput/ContainedInput";

type CustomInputFields = {
  fieldKey: string;
  placeholderText: string;
};
const MultiTextInputForm = ({ features }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const fields: CustomInputFields[] = features?.[selectedLanguage].fields;
  return (
    <Stack w={"100%"} gap={"xs"}>
      {fields?.map((field, index) => (
        <FormPaperLayout key={index}>
          <ContainedTextField
            placeholder={field.placeholderText}
            value={response?.[field.fieldKey]}
            variant="unstyled"
            onChange={(e) =>
              updateResponse({
                ...response,
                [field.fieldKey]: e.currentTarget.value,
              })
            }
            classNames={{
              input: classes.input,
            }}
          />
        </FormPaperLayout>
      ))}
    </Stack>
  );
};

export default MultiTextInputForm;
