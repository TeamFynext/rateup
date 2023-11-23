import {
  Stack,
  Flex,
  ColorPicker,
  Radio,
  Button,
  FileButton,
  Tabs,
  SimpleGrid,
  ColorInput,
  Text,
  Group,
  ActionIcon,
} from "@mantine/core";
import { IconEye, IconTrash, IconUpload } from "@tabler/icons-react";
import React, { useState, useRef, useEffect } from "react";
import { RateupButtonSecondary } from "../../../Button/RateupButtons";
function BackgroundStyles({
  saveStyles,
  currentStyles,
  setCurrentstyles,
  saveLoading,
  setbgImage,
  setbgMobileImage,
  setSelectedTab,
  selectedTab,
}) {
  const isMobileView = selectedTab !== "Web";
  const resetBgRef = useRef<() => void>(null);
  const resetMobileBgRef = useRef<() => void>(null);

  const [bgFileName, setBgFileName] = useState(null);
  const [mobileBgFileName, setMobileBgFileName] = useState(null);

  const [backgroundStyles, setbackgroundStyles] = useState({
    name: "background",
    bgType: "bgcolor",
    bgStyles: currentStyles.bgStyles,
    bgUrl: ``,
    mobileBgUrl: ``,
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
    setSelectedTab("Web");
    setbgImage(url);
    setBgFileName(value.name);
    setisFileLoading(false);
  };

  const handleMobileBgFileChange = (value) => {
    setisFileLoading(true);
    setCurrentstyles({ ...currentStyles, mobileBgUrlNotUploaded: value });
    let url = URL.createObjectURL(value);
    setSelectedTab("Mobile");
    setbgMobileImage(url);
    setMobileBgFileName(value.name);
    setisFileLoading(false);
  };

  const removeBg = () => {
    setCurrentstyles({ ...currentStyles, bgUrlNotUploaded: "", bgUrl: "" });
    setSelectedTab("Web");
    setbgImage("");
    setBgFileName("");
    resetBgRef.current?.();
  };

  const removeMobileBg = () => {
    setCurrentstyles({
      ...currentStyles,
      mobileBgUrlNotUploaded: "",
      mobileBgUrl: "",
    });
    setSelectedTab("Mobile");
    setbgMobileImage("");
    setMobileBgFileName("");
    resetMobileBgRef.current?.();
  };

  const handleTabChange = (newValue) => {
    setCurrentstyles({ ...currentStyles, bgType: newValue });
  };

  const handleMouseOverBg = () => {
    isMobileView && setSelectedTab("Web");
  };

  const handleMouseOverMobileBg = () => {
    !isMobileView && setSelectedTab("Mobile");
  };

  return (
    <Stack>
      <Stack mt={10}>
        {/* //-------------tabs ------------ */}
        <Tabs
          value={currentStyles?.bgType}
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
            <Stack mt="xl" onMouseOver={handleMouseOverBg}>
              <Group>
                <ActionIcon
                  variant={isMobileView ? "light" : "filled"}
                  aria-label="Settings"
                >
                  <IconEye
                    style={{ width: "70%", height: "70%" }}
                    stroke={1.5}
                  />
                </ActionIcon>
                <Text fw={600}>Web Background : </Text>
                <Text ml="md">
                  {getFileName(
                    currentStyles?.bgUrl || bgFileName,
                    !currentStyles?.bgUrl,
                  )}
                </Text>
              </Group>
              <SimpleGrid cols={2}>
                <RateupButtonSecondary
                  onClick={removeBg}
                  title="Remove Image"
                  size="xs"
                  disabled={
                    currentStyles.bgUrlNotUploaded === "" ||
                    (!currentStyles.bgUrlNotUploaded &&
                      currentStyles.bgUrl === "")
                  }
                  leftIcon={<IconTrash size={16} />}
                />
                <FileButton
                  resetRef={resetBgRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg"
                >
                  {(props) => (
                    <Button
                      leftSection={<IconUpload size={16} />}
                      size="xs"
                      radius="18px"
                      {...props}
                      loading={isFileLoading}
                    >
                      Upload Image
                    </Button>
                  )}
                </FileButton>
              </SimpleGrid>
            </Stack>

            <Stack mt="50" onMouseOver={handleMouseOverMobileBg}>
              <Group>
                <ActionIcon
                  variant={!isMobileView ? "light" : "filled"}
                  aria-label="Settings"
                >
                  <IconEye
                    style={{ width: "70%", height: "70%" }}
                    stroke={1.5}
                  />
                </ActionIcon>
                <Text fw={600}>Mobile Background : </Text>
                <Text ml="md">
                  {getFileName(
                    currentStyles?.mobileBgUrl || mobileBgFileName,
                    !currentStyles?.mobileBgUrl,
                  )}
                </Text>
              </Group>
              <SimpleGrid cols={2}>
                <RateupButtonSecondary
                  onClick={removeMobileBg}
                  title="Remove Image"
                  size="xs"
                  disabled={
                    currentStyles.mobileBgUrlNotUploaded === "" ||
                    (!currentStyles.mobileBgUrlNotUploaded &&
                      currentStyles.mobileBgUrl === "")
                  }
                  leftIcon={<IconTrash size={16} />}
                />
                <FileButton
                  resetRef={resetMobileBgRef}
                  onChange={handleMobileBgFileChange}
                  accept="image/png,image/jpeg"
                >
                  {(props) => (
                    <Button
                      leftSection={<IconUpload size={16} />}
                      size="xs"
                      radius="18px"
                      {...props}
                      loading={isFileLoading}
                    >
                      Upload Image
                    </Button>
                  )}
                </FileButton>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* //----------end tabs------------- */}

        <Flex justify={"center"}>
          <Button
            radius={48}
            size={"sm"}
            pl={40}
            pr={40}
            mt={50}
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

export function getFileName(url: string, isNewFile: boolean) {
  if (isNewFile) return url;
  const pattern = /^[^-]+-/;
  const name = url?.replace(pattern, "");
  return name;
}
