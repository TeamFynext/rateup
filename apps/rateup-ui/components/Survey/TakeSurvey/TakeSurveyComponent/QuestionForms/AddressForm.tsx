import { Input, Stack } from "@mantine/core";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import classes from "../TakeSurvey.module.css";

const AddressForm = () => {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Stack w={"100%"} gap={"sm"}>
      <FormPaperLayout>
        <Input
          placeholder="Address 1"
          value={response?.address1 || ""}
          onChange={(e) =>
            updateResponse({ ...response, address1: e.currentTarget.value })
          }
          variant="unstyled"
          classNames={{
            input: classes.input,
          }}
        />
      </FormPaperLayout>
      <FormPaperLayout>
        <Input
          placeholder="Address 2"
          value={response?.address2 || ""}
          onChange={(e) =>
            updateResponse({ ...response, address2: e.currentTarget.value })
          }
          classNames={{
            input: classes.input,
          }}
          variant="unstyled"
        />
      </FormPaperLayout>
      <FormPaperLayout>
        <Input
          placeholder="City"
          value={response?.city || ""}
          onChange={(e) =>
            updateResponse({ ...response, city: e.currentTarget.value })
          }
          classNames={{
            input: classes.input,
          }}
          variant="unstyled"
        />
      </FormPaperLayout>
      <FormPaperLayout>
        <Input
          placeholder="Postal Code"
          value={response?.postalCode || ""}
          onChange={(e) =>
            updateResponse({ ...response, postalCode: e.currentTarget.value })
          }
          classNames={{
            input: classes.input,
          }}
          variant="unstyled"
          minLength={5}
        />
      </FormPaperLayout>
      <FormPaperLayout>
        <Input
          placeholder="Country"
          value={response?.country || ""}
          onChange={(e) =>
            updateResponse({ ...response, country: e.currentTarget.value })
          }
          classNames={{
            input: classes.input,
          }}
          variant="unstyled"
        />
      </FormPaperLayout>
    </Stack>
  );
};

export default AddressForm;
