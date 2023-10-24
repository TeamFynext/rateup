import {
  Stack,
  Flex,
  ColorPicker,
  Radio,
  FileInput,
  Button,
  FileButton,
  Tabs,
  SimpleGrid,
  ColorInput,
} from "@mantine/core";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import React, { useState, useRef, useEffect } from "react";
import { RateupButtonSecondary } from "../../../Button/RateupButtons";
function BackgroundStyles({
  saveStyles,
  currentStyles,
  setCurrentstyles,
  saveLoading,
  setbgImage,
}) {
  const fileInputRef = useRef(null);

  const [backgroundStyles, setbackgroundStyles] = useState({
    name: "background",
    bgType: "bgcolor",
    bgStyles: currentStyles.bgStyles,
    bgUrl: ``,
    borderRadius: 18,
  });

  const [isFileLoading, setisFileLoading] = useState(false);
  useEffect(() => {
    setCurrentstyles({ ...currentStyles, bgStyles: backgroundStyles.bgStyles });
  }, [backgroundStyles]);

  //----------onsubmit form -------------
  const onSubmit = (e) => {
    e.preventDefault();
    saveStyles(backgroundStyles);
  };

  const handleFileChange = (value) => {
    setisFileLoading(true);
    setCurrentstyles({ ...currentStyles, bgUrlNotUploaded: value });
    let url = URL.createObjectURL(value);

    setbgImage(url);
    setisFileLoading(false);
  };

  const removeBg = () => {
    setCurrentstyles({ ...currentStyles, bgUrlNotUploaded: "", bgUrl: "" });
    setbgImage("");
  };

  const handleTabChange = (newValue) => {
    setCurrentstyles({ ...currentStyles, bgType: newValue });
  };

  return (
    <Stack>
      <Stack mt={10}>
        {/* //-------------tabs ------------ */}
        <Tabs
          defaultValue={currentStyles?.bgType}
          radius="lg"
          onChange={handleTabChange}
        >
          <Radio.Group
            name="bgType"
            withAsterisk
            mt="md"
            ml="xl"
            value={currentStyles?.bgType}
          >
            <Tabs.List grow>
              <Tabs.Tab value="bgcolor">
                <Radio value="bgcolor" label="Color" />
              </Tabs.Tab>
              <Tabs.Tab value="bgimage">
                <Radio value="bgimage" label="Image" />
              </Tabs.Tab>
            </Tabs.List>
          </Radio.Group>

          {/* //-------------BG COLOR----------------- */}
          <Tabs.Panel value="bgcolor" pt="xs">
            <ColorPicker
              format="rgba"
              fullWidth
              value={backgroundStyles?.bgStyles?.backgroundColor}
              onChange={(value) =>
                setbackgroundStyles({
                  ...backgroundStyles,
                  bgStyles: {
                    ...backgroundStyles.bgStyles,
                    backgroundColor: value,
                  },
                })
              }
              mt={10}
            />
            <ColorInput
              mt="sm"
              value={backgroundStyles?.bgStyles?.backgroundColor}
              onChange={(value) =>
                setbackgroundStyles({
                  ...backgroundStyles,
                  bgStyles: {
                    ...backgroundStyles.bgStyles,
                    backgroundColor: value,
                  },
                })
              }
              placeholder="Input placeholder"
            />
            {/* <Text>{backgroundStyles?.bgStyles?.backgroundColor}</Text> */}
          </Tabs.Panel>

          {/* //------------BGIMAGE------------ */}
          <Tabs.Panel value="bgimage" pt="xs">
            <FileInput
              ref={fileInputRef}
              mt={10}
              display={"none"}
              accept="image/*"
              placeholder="Choose background image"
              leftSection={<IconUpload size={14} />} //VERIFY MANTINE
              onChange={handleFileChange}
            />

            <SimpleGrid cols={2} mt="lg">
              <RateupButtonSecondary
                onClick={removeBg}
                title="Remove Image"
                size="md"
                disabled={
                  currentStyles.bgUrlNotUploaded === "" ||
                  (!currentStyles.bgUrlNotUploaded &&
                    currentStyles.bgUrl === "")
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
                    size="md"
                    radius="18px"
                    {...props}
                    loading={isFileLoading}
                  >
                    Upload Image
                  </Button>
                )}
              </FileButton>
            </SimpleGrid>
          </Tabs.Panel>
        </Tabs>

        {/* //----------end tabs------------- */}

        <Flex justify={"center"}>
          <Button
            radius={48}
            size={"sm"}
            pl={40}
            pr={40}
            mt={20}
            onClick={onSubmit}
            loading={saveLoading}
          >
            Save
          </Button>
        </Flex>
      </Stack>
    </Stack>
  );
}

export default BackgroundStyles;
