import React, { useState, useEffect } from "react";
import {
  Stack,
  Button,
  Group,
  Radio,
  Text,
  FileButton,
  Title,
  Tabs,
  ColorInput,
  Slider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { RateupButtonSecondary } from "../../../Button/RateupButtons";
import { IconCheck } from "@tabler/icons-react";

const StyleTab = ({
  backgroundColor,
  setBackgroundColor,
  qrSize,
  setQRSize,
  qrBgColor,
  setQRBgColor,
  gradient,
  setGradient,
  bgImage,
  setBgImage,
  bgTransparency,
  setBgTransparency,
  activeBgStyle,
  setActiveBgStyle,
}) => {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    //For server upload - template setup

    // const uploadAndUpdate = async () => {
    //   if (file) {
    //     notifications.show({
    //       id: "load-data",
    //       loading: true,
    //       title: "Uploading Background",
    //       message: `Hold on, uploading your background in progress`,
    //       autoClose: false,
    //       withCloseButton: false,
    //     });
    //     const fileKey = await uploadFile(file);
    //     if (typeof fileKey === "string") {
    //       setBgImage(fileKey)
    //       notifications.update({
    //         id: "load-data",
    //         title: "Uploaded Background!",
    //         color: "teal",
    //         message: `Success updating the Background`,
    //         withCloseButton: false,
    //         icon: <IconCheck size="1rem" />,
    //         autoClose: 2000,
    //       });
    //     }
    //   }
    // };

    if (file) {
      const url = URL.createObjectURL(file);
      setBgImage(url);
    } else {
      console.error("No file selected");
    }
  }, [file]);

  function removeBgImage() {
    setBgImage(null);
  }

  return (
    <Stack>
      <Tabs defaultValue="Color">
        <Group mb="xl">
          <Title
            order={3}
            mt="xl"
            style={{ minWidth: "140px", maxWidth: "140px" }}
          >
            {" "}
            Background
          </Title>
          <Radio.Group
            name="background"
            withAsterisk
            mt="md"
            ml="xl"
            value={activeBgStyle}
          >
            <Group mt="xs">
              <Tabs.List>
                <Tabs.Tab
                  value="Color"
                  onClick={() => setActiveBgStyle("Color")}
                >
                  <Radio value="Color" label="Color" />
                </Tabs.Tab>
                <Tabs.Tab
                  value="Gradient"
                  onClick={() => setActiveBgStyle("Gradient")}
                >
                  <Radio value="Gradient" label="Gradient" />
                </Tabs.Tab>
                <Tabs.Tab
                  value="Image"
                  onClick={() => setActiveBgStyle("Image")}
                >
                  <Radio value="Image" label="Image" />
                </Tabs.Tab>
                <Tabs.Tab
                  value="Transparent"
                  onClick={() => setActiveBgStyle("Transparent")}
                >
                  <Radio value="Transparent" label="Transparent" />
                </Tabs.Tab>
              </Tabs.List>
            </Group>
          </Radio.Group>
        </Group>

        <Tabs.Panel value="Color" style={{ minHeight: "70px" }}>
          <Stack style={{ maxWidth: "300px" }} ml="xl">
            <ColorInput
              placeholder="Select color"
              label="Select Color"
              value={backgroundColor}
              onChange={setBackgroundColor}
            />
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="Gradient" style={{ minHeight: "70px" }}>
          <Group>
            <ColorInput
              placeholder="Select color"
              label="Start Color"
              value={gradient.start}
              onChange={(e) => setGradient({ ...gradient, start: e })}
            />
            <ColorInput
              placeholder="Select color"
              label="End Color"
              value={gradient.end}
              onChange={(e) => setGradient({ ...gradient, end: e })}
            />
          </Group>
        </Tabs.Panel>
        <Tabs.Panel value="Image" style={{ minHeight: "70px" }}>
          <Stack justify="center" style={{ maxWidth: "200px" }}>
            <FileButton onChange={setFile} accept="image/png,image/jpeg">
              {(props) => (
                <Button fullWidth size="lg" radius="lg" {...props}>
                  Upload Image
                </Button>
              )}
            </FileButton>

            <RateupButtonSecondary
              title="Remove Image"
              size="sm"
              onClick={removeBgImage}
            />
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="Transparent" style={{ minHeight: "70px" }} ml="lg">
          <Text mb="md">Transparency:</Text>
          <div className="tab-panel">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={bgTransparency}
              onChange={(e) => setBgTransparency(e.target.value)}
            />
          </div>
        </Tabs.Panel>
      </Tabs>

      <Group align="center" mt="sm">
        <Title order={3} mt="xl" style={{ maxWidth: "150px" }}>
          {" "}
          QR Styles
        </Title>
        <Radio.Group name="background" withAsterisk mt="md" ml="xl">
          {/* <Group mt="xs">
                  <Radio value="Color" label="Color" />
                  <Radio value="Gradient" label="Gradient" />
                </Group> */}
        </Radio.Group>
      </Group>
      <Stack style={{ maxWidth: "300px" }} ml="xl">
        <Text>QR Size</Text>
        <Slider
          label={(value) => value}
          value={qrSize}
          onChange={setQRSize}
          defaultValue={195}
          min={195}
          max={250}
        />
        <ColorInput
          placeholder="Select color"
          label="QR Background Color"
          value={qrBgColor}
          onChange={setQRBgColor}
        />
      </Stack>
    </Stack>
  );
};

export default StyleTab;
