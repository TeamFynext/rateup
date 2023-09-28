import {
  Box,
  Group,
  Loader,
  Select,
  Stack,
  Title,
  Space,
  Paper,
  Flex,
  Text,
  TextInput,
  Card,
  ColorPicker,
  Radio,
  FileInput,
  Button,
  FileButton,
  Tabs,
} from "@mantine/core";
import { IconColorPicker, IconUpload } from "@tabler/icons-react";
import React, { useState, useRef, useEffect } from "react";
import { uploadFile } from "../../../../utils/file-upload/upload";
import {
  IconPhoto,
  IconMessageCircle,
  IconSettings,
} from "@tabler/icons-react";
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
    bgUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/sample.png`,
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

  const handleChange = (newValue) => {
    setCurrentstyles({ ...currentStyles, bgType: newValue });
  };
  const handleOpenFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange =  (value) => {
    setisFileLoading(true);
    setCurrentstyles({ ...currentStyles, bgUrlNotUploaded: value });
    let url = URL.createObjectURL(value);

    setbgImage(url)
    setisFileLoading(false);

    // }
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
              leftSection={<IconUpload size={14} />}  //VERIFY MANTINE
              onChange={handleFileChange}
            />

            <FileButton
              onChange={handleFileChange}
              accept="image/png,image/jpeg"
            >
              {(props) => (
                <Button
                  leftSection={<IconUpload size={16} />}
                  fullWidth
                  size="lg"
                  radius="18px"
                  h={50}
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
          </Tabs.Panel>
        </Tabs>

        {/* //----------end tabs------------- */}

        <Flex justify={"center"}>
          <Button
            bg="black"
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
      </Stack>
    </Stack>
  );
}

export default BackgroundStyles;
