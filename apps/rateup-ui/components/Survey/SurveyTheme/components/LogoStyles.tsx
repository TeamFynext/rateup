import React, { useRef, useState } from "react";
import {
  Stack,
  NumberInput,
  Button,
  FileButton,
  SimpleGrid,
  ActionIcon,
  Group,
  Text,
  ScrollArea,
  Divider,
} from "@mantine/core";
import { IconEye, IconTrash, IconUpload } from "@tabler/icons-react";
import { RateupButtonSecondary } from "../../../Button/RateupButtons";
import { getFileName } from "./BackgroundStyles";
import { ImageCropModal } from "../../../Modal/ImageCropModal";
import { useDisclosure } from "@mantine/hooks";
import { Logo } from "../surveyTheme.types";

function LogoStyles({
  currentStyles,
  setCurrentstyles,
}: {
  currentStyles: Logo;
  setCurrentstyles: (key: string, value: any) => void;
}) {
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
    setCurrentstyles("logo", { ...currentStyles, logo: "" });
    resetLogoRef.current?.();
  };

  const handleCropImageSave = (cropedImage) => {
    setisFileLoading(true);
    setLogoFileName(cropedImage?.name);
    setCurrentstyles("logo", { ...currentStyles, logo: cropedImage });
    setisFileLoading(false);
  };
  return (
    <ScrollArea h={"40vh"} w={"100%"}>
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedImage.url}
        aspect={4 / 3}
      />
      <Stack align="center" w={"100%"}>
        <Divider label="Styles" variant="dashed" w={"100%"} />
        <NumberInput
          min={10}
          max={100}
          placeholder="height"
          label="Height (px)"
          name="height"
          mt={"xs"}
          value={currentStyles?.styles?.height}
          onChange={(e) => {
            setCurrentstyles("logo", {
              ...currentStyles,
              styles: { ...currentStyles.styles, height: e },
            });
          }}
        />
        <NumberInput
          min={10}
          max={100}
          mt={"xs"}
          placeholder="Width"
          label="Width (px)"
          name="Width"
          value={currentStyles?.styles?.width}
          onChange={(e) => {
            setCurrentstyles("logo", {
              ...currentStyles,
              styles: { ...currentStyles.styles, width: e },
            });
          }}
        />
        <Divider label="Upload Logo" variant="dashed" w={"100%"} />
        <Group w={"100%"}>
          <ActionIcon variant="filled" aria-label="Settings">
            <IconEye style={{ width: "70%", height: "70%" }} stroke={1.5} />
          </ActionIcon>
          <Text fw={100} c={"dark"} size="xs">
            Logo :{" "}
          </Text>
          <Text ml="md">
            {getFileName(
              currentStyles?.logo || logoFileName,
              !currentStyles?.logo,
            )}
          </Text>
        </Group>

        <SimpleGrid cols={2} mt="lg">
          <RateupButtonSecondary
            onClick={removeImage}
            title="Remove Image"
            size="xs"
            disabled={!currentStyles?.logo && !logoFileName}
            leftIcon={<IconTrash size={16} />}
          />
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
        </SimpleGrid>
      </Stack>
    </ScrollArea>
  );
}

export default LogoStyles;
