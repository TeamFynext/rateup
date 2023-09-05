import React, { useEffect, useState } from "react";
import { Stack, Flex, NumberInput, Button, FileButton } from "@mantine/core";
import { createFormContext } from "@mantine/form";
import { IconUpload } from "@tabler/icons-react";
import { uploadFile } from "../../../../utils/file-upload/upload";

const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
interface FormValues {
  name: string;
  logoUrl: string;

  logoStyles: {
    height: number;
    width: number;
  };
}
function LogoStyles({ saveStyles, currentStyles, setCurrentstyles }) {
  const form = useForm({
    initialValues: {
      name: "logo",
      logoUrl: currentStyles?.logoUrl,
      logoStyles: currentStyles.logoStyles,
    },
  });

  const [isFileLoading, setisFileLoading] = useState(false);

  useEffect(() => {
    setCurrentstyles({ ...currentStyles, logoStyles: form.values.logoStyles });
  }, [form.values]);

  const onSubmit = (e) => {
    e.preventDefault();
    saveStyles(form.values);
  };

  const handleFileChange = async (value) => {
    setisFileLoading(true);
    const fileKey = await uploadFile(value);
    if (typeof fileKey === "string") {
      setisFileLoading(false);
      setCurrentstyles({ ...currentStyles, logoUrl: fileKey });
    }
  };
  return (
    <Flex>
      <Stack w={"100%"} justify={"center"}>
        <form style={{ width: "100%", justifyContent: "center" }}>
          <NumberInput
            min={10}
            max={100}
            // defaultValue={18}
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
            // defaultValue={18}
            placeholder="Width"
            label="Width (px)"
            name="Width"
            {...form.getInputProps("logoStyles.width")}
          />

          <FileButton onChange={handleFileChange} accept="image/png,image/jpeg">
            {(props) => (
              <Button
                leftIcon={<IconUpload size={16} />}
                fullWidth
              
                radius="18px"
                h={50}
                size="md"
                mt={"xs"}
                style={{ border: "1px solid #D3D3D3" }}
                variant="white"
                color="dark"
                // w={"lg"}
                // p={20}
                // gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
                {...props}
                loading={isFileLoading}
              >
                Upload image
              </Button>
            )}
          </FileButton>

          <Flex justify={"center"}>
            <Button
              bg="black"
              radius={48}
              size={"sm"}
              pl={40}
              pr={40}
              mt={20}
              onClick={onSubmit}
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
