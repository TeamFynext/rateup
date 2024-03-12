import { Flex, Group, Stack, TextInput } from "@mantine/core";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";

const AddressForm = () => {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Stack w={"100%"}>
      <FormPaperLayout>
        <TextInput
          placeholder="Address 1"
          value={response?.address1 || ""}
          onChange={(e) =>
            updateResponse({ ...response, address1: e.currentTarget.value })
          }
          variant="unstyled"
        />
      </FormPaperLayout>
      <FormPaperLayout>
        <TextInput
          placeholder="Address 2"
          value={response?.address2 || ""}
          onChange={(e) =>
            updateResponse({ ...response, address2: e.currentTarget.value })
          }
          variant="unstyled"
        />
      </FormPaperLayout>
      <Flex justify="space-between" gap={"md"} maw={500}>
        <FormPaperLayout>
          <TextInput
            placeholder="City"
            value={response?.city || ""}
            onChange={(e) =>
              updateResponse({ ...response, city: e.currentTarget.value })
            }
            variant="unstyled"
          />
        </FormPaperLayout>
        <FormPaperLayout>
          <TextInput
            placeholder="Postal Code"
            value={response?.postalCode || ""}
            onChange={(e) =>
              updateResponse({ ...response, postalCode: e.currentTarget.value })
            }
            variant="unstyled"
            minLength={5}
          />
        </FormPaperLayout>
      </Flex>
      <FormPaperLayout>
        <TextInput
          placeholder="Country"
          value={response?.country || ""}
          onChange={(e) =>
            updateResponse({ ...response, country: e.currentTarget.value })
          }
          variant="unstyled"
        />
      </FormPaperLayout>
    </Stack>
  );
};

export default AddressForm;
