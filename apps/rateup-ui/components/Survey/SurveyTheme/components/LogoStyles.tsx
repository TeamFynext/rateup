import React, { useEffect, useState } from "react";
import {
  Stack,
  Flex,
  NumberInput,
  Button,
  FileButton,
  SimpleGrid,
} from "@mantine/core";
import { createFormContext } from "@mantine/form";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { RateupButtonSecondary } from "../../../Button/RateupButtons";

const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
interface FormValues {
  name: string;
  logoUrl: string;

  logoStyles: {
    height: number;
    width: number;
  };
}
function LogoStyles({
  saveStyles,
  currentStyles,
  setCurrentstyles,
  saveLoading,
}) {
  const form = useForm({
    initialValues: {
      name: "logo",
      logoUrl: currentStyles?.logoUrl,
      logoStyles: currentStyles?.logoStyles,
    },
  });

  const [isFileLoading, setisFileLoading] = useState(false);

  useEffect(() => {
    setCurrentstyles({
      ...currentStyles,
      logoStyles: form?.values?.logoStyles,
    });
  }, [form.values]);

  const onSubmit = (e) => {
    e.preventDefault();
    saveStyles(form.values);
  };

  const handleFileChange = (value) => {
    setisFileLoading(true);

    setCurrentstyles({ ...currentStyles, logoUrlNotUploaded: value });
    setisFileLoading(false);
  };

  const removeImage = () => {
    setCurrentstyles({ ...currentStyles, logoUrlNotUploaded: "", logoUrl: "" });
    // form.setValues({ logoUrl: ""})

    //TODO : removed logo not able re-upload as the next
  };

  return (
    <Flex>
      <Stack w={"100%"} justify={"center"}>
        <form style={{ width: "100%", justifyContent: "center" }}>
          <NumberInput
            min={10}
            max={100}
            placeholder="height"
            label="Height (px)"
            name="height"
            mt={"xs"}
            {...form.getInputProps("logoStyles.height")}
          />
          <NumberInput
            min={10}
            max={100}
            mt={"xs"}
            placeholder="Width"
            label="Width (px)"
            name="Width"
            {...form.getInputProps("logoStyles.width")}
          />

          <SimpleGrid cols={2} mt="lg">
            <RateupButtonSecondary
              onClick={removeImage}
              title="Remove Image"
              size="xs"
              disabled={
                form?.values?.logoUrl === "" ||
                (!currentStyles?.logoUrlNotUploaded &&
                  currentStyles?.logoUrl === "")
              }
              leftIcon={<IconTrash size={16} />}
            />
            <FileButton
              onChange={handleFileChange}
              accept="image/png,image/jpeg"
            >
              {(props) => (
                <Button
                  leftSection={<IconUpload size={16} />}
                  radius="18px"
                  size="xs"
                  {...props}
                  loading={isFileLoading}
                >
                  Upload Image
                </Button>
              )}
            </FileButton>
          </SimpleGrid>

          <Flex justify={"center"} mt="xl">
            <Button
              radius={48}
              size={"sm"}
              pl={40}
              pr={40}
              mt={20}
              onClick={onSubmit}
              loading={saveLoading}
            >
              {" "}
              Save
            </Button>
          </Flex>
        </form>
      </Stack>
    </Flex>
  );
}

export default LogoStyles;
