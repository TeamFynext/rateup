import { Input, Stack } from "@mantine/core";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import classes from "../TakeSurvey.module.css";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";

const AddressForm = ({ features }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const fields = features?.[selectedLanguage]?.fields;

  return (
    <Stack w={"100%"} gap={"xs"}>
      {fields?.map((field, index) => (
        <FormPaperLayout key={index}>
          <Input
            placeholder={field?.placeholderText}
            value={response?.[field?.fieldKey] || ""}
            onChange={(e) =>
              updateResponse({
                ...response,
                [field?.fieldKey]: e.currentTarget.value,
              })
            }
            variant="unstyled"
            classNames={{
              input: classes.input,
            }}
          />
        </FormPaperLayout>
      ))}
    </Stack>
  );
};

export default AddressForm;
