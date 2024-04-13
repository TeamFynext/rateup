import React, { useRef, useState } from "react";
import {
  Stack,
  NumberInput,
  Button,
  FileButton,
  ActionIcon,
  Group,
  Text,
  Divider,
  ThemeIcon,
  Box,
} from "@mantine/core";
import { IconEye, IconStar, IconTrash, IconUpload } from "@tabler/icons-react";
import { ImageCropModal } from "../../../Modal/ImageCropModal";
import { useDisclosure } from "@mantine/hooks";
import { Logo } from "../surveyTheme.types";
import styles from "./stylescomponent/StylesComponent.module.css";

function LogoStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Logo;
  setCurrentstyles: (key: string, value: any) => void;
}) {
  const currentStylesObj = currentStyles
    ? currentStyles
    : {
        logo: "",
        styles: {
          width: 50,
          height: 50,
        },
      };

  const [isFileLoading, setisFileLoading] = useState(false);
  const [logoFileName, setLogoFileName] = useState(null);
  const resetLogoRef = useRef<() => void>(null);
  const [selectedImage, setSelectedImage] = useState({
    url: "",
    name: "",
  });
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);
  const handleFileChange = (value) => {
    if (!value) return;
    setSelectedImage({
      url: URL.createObjectURL(value),
      name: value.name,
    });
    toggleCropDialog();
    resetLogoRef?.current?.();
  };

  const removeImage = () => {
    setLogoFileName("");
    setCurrentstyles("logo", { ...currentStylesObj, logo: "" });
    resetLogoRef.current?.();
  };

  const handleCropImageSave = (croppedImage) => {
    setisFileLoading(true);
    setLogoFileName(croppedImage?.name);
    setCurrentstyles("logo", { ...currentStylesObj, logo: croppedImage });
    setisFileLoading(false);
  };
  return (
    <>
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedImage.url}
        aspect={4 / 3}
      />
      <Stack align="center" w={"100%"} gap={"1.5rem"}>
        <Group wrap="nowrap" gap="xs" w={"100%"}>
          <NumberInput
            min={10}
            max={100}
            placeholder="height"
            label="Height (px)"
            name="height"
            style={{ flex: 1 }}
            classNames={{ label: styles["label"] }}
            value={currentStylesObj?.styles?.height}
            onChange={(e) => {
              setCurrentstyles("logo", {
                ...currentStylesObj,
                styles: { ...currentStylesObj.styles, height: e },
              });
            }}
          />
          <NumberInput
            min={10}
            max={100}
            placeholder="Width"
            label="Width (px)"
            name="Width"
            style={{ flex: 1 }}
            classNames={{ label: styles["label"] }}
            value={currentStylesObj?.styles?.width}
            onChange={(e) => {
              setCurrentstyles("logo", {
                ...currentStylesObj,
                styles: { ...currentStylesObj.styles, width: e },
              });
            }}
          />
        </Group>

        <Stack>
          <Divider label="Upload Logo" variant="dashed" w={"100%"} />
          <Group justify="space-between" w={"100%"}>
            <Group gap={"xs"}>
              <ThemeIcon>
                <IconStar size={15} />
              </ThemeIcon>
              <Text fw={100} c={"dark"} size="xs">
                Logo :{" "}
              </Text>
            </Group>
            <Group>
              <FileButton
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
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
              <ActionIcon
                color="red"
                size={"md"}
                radius={"xl"}
                disabled={!currentStylesObj?.logo && !logoFileName}
                onClick={removeImage}
              >
                <IconTrash size={15} />
              </ActionIcon>
            </Group>
          </Group>
        </Stack>
      </Stack>
    </>
  );
}

export default LogoStyles;
