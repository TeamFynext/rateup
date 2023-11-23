import React, { useEffect, useRef, useState } from "react";
import {
  Stack,
  Flex,
  NumberInput,
  Button,
  FileButton,
  SimpleGrid,
  ActionIcon,
  Group,
  Text,
} from "@mantine/core";
import { createFormContext } from "@mantine/form";
import { IconEye, IconTrash, IconUpload } from "@tabler/icons-react";
import { RateupButtonSecondary } from "../../../Button/RateupButtons";
import { getFileName } from "./BackgroundStyles";

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
  const [logoFileName, setLogoFileName] = useState(null);
  const resetLogoRef = useRef<() => void>(null);

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
    setLogoFileName(value?.name);
    setCurrentstyles({ ...currentStyles, logoUrlNotUploaded: value });
    setisFileLoading(false);
  };

  const removeImage = () => {
    setLogoFileName("");
    setCurrentstyles({ ...currentStyles, logoUrlNotUploaded: "", logoUrl: "" });
    resetLogoRef.current?.();
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

          <Group mt="xl">
            <ActionIcon variant="filled" aria-label="Settings">
              <IconEye style={{ width: "70%", height: "70%" }} stroke={1.5} />
            </ActionIcon>
            <Text fw={600}>Logo : </Text>
            <Text ml="md">
              {getFileName(
                currentStyles?.logoUrl || logoFileName,
                !currentStyles?.logoUrl,
              )}
            </Text>
          </Group>

          <SimpleGrid cols={2} mt="lg">
            <RateupButtonSecondary
              onClick={removeImage}
              title="Remove Image"
              size="xs"
              disabled={!currentStyles?.logoUrl && !logoFileName}
              leftIcon={<IconTrash size={16} />}
            />
            <FileButton
              onChange={handleFileChange}
              accept="image/png,image/jpeg"
              resetRef={resetLogoRef}
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
