import {
  Stack,
  Button,
  FileButton,
  Text,
  Group,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { IconEye, IconTrash, IconUpload } from "@tabler/icons-react";
import React, { useState, useRef, ReactNode } from "react";
import { RateupButtonSecondary } from "../../../Button/RateupButtons";
import { UnsplashModal } from "../../../Modal/UnsplashModal";
import { ImageCropModal } from "../../../Modal/ImageCropModal";
import { ImageUploadMethodModal } from "../../../Modal/ImageUploadMethodModal";
import { useDisclosure } from "@mantine/hooks";
import { Bg } from "../surveyTheme.types";
import CustomColorPicker from "./customelements/CustomColorPicker";
import CustomColorInput from "./customelements/CustomColorInput";
import { BgTab } from "../SurveyTheme.enums";

interface BackgroundStylesProps {
  currentStyles: Bg;
  setCurrentstyles: (key: string, value: any) => void;
}
function BackgroundStyles({
  currentStyles,
  setCurrentstyles,
}: BackgroundStylesProps) {
  const resetBgRef = useRef<() => void>(null);
  const resetMobileBgRef = useRef<() => void>(null);

  const [bgFileName, setBgFileName] = useState(null);
  const [mobileBgFileName, setMobileBgFileName] = useState(null);

  const [isFileLoading, setisFileLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [imageType, setImageType] = useState("");
  const [selectedImage, setSelectedImage] = useState({
    url: "",
    name: "",
  });
  const [
    openedUnsplashDialog,
    { toggle: toggleUnsplashDialog, close: closeUnsplashDialog },
  ] = useDisclosure(false);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);
  const [
    openedMethodSelectionDialog,
    { toggle: toggleMethodSelectionDialog, close: closeMethodSelectionDialog },
  ] = useDisclosure(false);
  const bgFileUploadBtnRef = useRef(null);
  const mobileBgFileUploadBtnRef = useRef(null);

  //----------onsubmit form -------------

  const handleFileChange = (value) => {
    if (!value) return;
    setAspectRatio(16 / 9);
    toggleMethodSelectionDialog();
    setImageType("backgroundImage");
  };

  const handleMobileBgFileChange = (value) => {
    if (!value) return;
    setAspectRatio(9 / 16);
    toggleMethodSelectionDialog();
    setImageType("mobileBackgroundImage");
  };

  const removeBg = () => {
    setCurrentstyles("bg", { ...currentStyles, desktopbg: "" });
    setBgFileName("");
    resetBgRef.current?.();
  };

  const removeMobileBg = () => {
    setCurrentstyles("bg", { ...currentStyles, mobilebg: "" });
    setMobileBgFileName("");
    resetMobileBgRef.current?.();
  };
  const handleUploadMethod = (type: string) => {
    if (type === "unsplash") {
      toggleUnsplashDialog();
    } else {
      if (imageType === "backgroundImage") bgFileUploadBtnRef?.current?.click();
      else mobileBgFileUploadBtnRef?.current?.click();
    }
  };
  const handleUnsplashImageSave = (
    unsplashImage: string,
    imageName: string,
  ) => {
    setSelectedImage({
      url: unsplashImage,
      name: imageName,
    });
    toggleCropDialog();
  };
  const handleCropImageSave = (cropedImage) => {
    if (imageType === "backgroundImage") {
      setisFileLoading(true);
      setCurrentstyles("bg", { ...currentStyles, desktopbg: cropedImage });
      let url = URL.createObjectURL(cropedImage);
      setBgFileName(cropedImage?.name);
      setisFileLoading(false);
    } else if (imageType === "mobileBackgroundImage") {
      setisFileLoading(true);
      setCurrentstyles("bg", { ...currentStyles, mobilebg: cropedImage });
      let url = URL.createObjectURL(cropedImage);
      setMobileBgFileName(cropedImage?.name);
      setisFileLoading(false);
    }
  };

  const [bgTab, setBgTab] = useState<BgTab>(BgTab.BGCOLOR);
  return (
    <>
      <Stack align="center" w={"100%"}>
        <UnsplashModal
          handleUnsplashImageSave={handleUnsplashImageSave}
          opened={openedUnsplashDialog}
          onclose={closeUnsplashDialog}
        />
        <ImageCropModal
          opened={openedCropDialog}
          onclose={closeCropDialog}
          imageName={selectedImage.name}
          handleCropImageSave={handleCropImageSave}
          image={selectedImage.url}
          aspect={aspectRatio}
        />
        <ImageUploadMethodModal
          onClose={closeMethodSelectionDialog}
          opened={openedMethodSelectionDialog}
          handleUploadMethod={handleUploadMethod}
        />
        {/* //-------------BG COLOR----------------- */}
        <Divider label="Background Color" w={"100%"} variant="dashed" />
        <CustomColorPicker
          value={currentStyles?.styles?.backgroundColor}
          onChange={(value) =>
            setCurrentstyles("bg", {
              ...currentStyles,
              styles: { ...currentStyles.styles, backgroundColor: value },
            })
          }
        />
        <CustomColorInput
          value={currentStyles?.styles?.backgroundColor}
          onChange={(value) =>
            setCurrentstyles("bg", {
              ...currentStyles,
              styles: { ...currentStyles.styles, backgroundColor: value },
            })
          }
        />
        {/* //------------BGIMAGE------------ */}
        <Divider label="Background Image" variant="dashed" w={"100%"} />
        <Stack w={"100%"}>
          <Group>
            <ActionIcon aria-label="Settings" bg={"var(--tertiary-color)"}>
              <IconEye style={{ width: "70%", height: "70%" }} stroke={1.5} />
            </ActionIcon>
            <Text fw={100} c={"dark"} size="xs">
              Desktop :{" "}
            </Text>
            <Text ml="md" fz={10}>
              {getFileName(
                currentStyles?.desktopbg || bgFileName,
                !currentStyles?.desktopbg,
              )}
            </Text>
          </Group>
          <Stack>
            <Button
              leftSection={<IconUpload size={16} />}
              size="xs"
              radius="18px"
              type="button"
              onClick={handleFileChange}
              loading={isFileLoading}
              bg={"var(--tertiary-color)"}
            >
              Upload Image
            </Button>
            <RateupButtonSecondary
              onClick={removeBg}
              title="Remove Image"
              size="xs"
              disabled={currentStyles?.desktopbg === ""}
              leftIcon={<IconTrash size={16} />}
            />
            <FileButton
              resetRef={resetBgRef}
              onChange={(e) => {
                if (!e) return;
                handleUnsplashImageSave(URL.createObjectURL(e), e.name);
                resetBgRef?.current?.();
              }}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
            >
              {(props) => (
                <Button ref={bgFileUploadBtnRef} display={"none"} {...props}>
                  Upload Image
                </Button>
              )}
            </FileButton>
          </Stack>
        </Stack>

        <Stack w={"100%"}>
          <Group>
            <ActionIcon aria-label="Settings" bg={"var(--tertiary-color)"}>
              <IconEye style={{ width: "70%", height: "70%" }} stroke={1.5} />
            </ActionIcon>
            <Text fw={100} c={"dark"} size="xs">
              Mobile :{" "}
            </Text>
            <Text fz={10}>
              {getFileName(
                currentStyles?.mobilebg || mobileBgFileName,
                !currentStyles?.mobilebg,
              )}
            </Text>
          </Group>
          <Stack>
            <Button
              leftSection={<IconUpload size={15} />}
              size="xs"
              radius="18px"
              onClick={handleMobileBgFileChange}
              loading={isFileLoading}
              bg={"var(--tertiary-color)"}
            >
              Upload Image
            </Button>
            <Button
              leftSection={<IconTrash size={15} />}
              disabled={currentStyles?.mobilebg === ""}
              size="xs"
              p={0}
              radius="18px"
              onClick={removeMobileBg}
            >
              Remove Image
            </Button>
            <FileButton
              resetRef={resetMobileBgRef}
              onChange={(e) => {
                if (!e) return;
                handleUnsplashImageSave(URL.createObjectURL(e), e.name);
                resetMobileBgRef?.current?.();
              }}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
            >
              {(props) => (
                <Button
                  ref={mobileBgFileUploadBtnRef}
                  display={"none"}
                  {...props}
                >
                  Upload Image
                </Button>
              )}
            </FileButton>
          </Stack>
        </Stack>
      </Stack>
    </>
  );
}

export default BackgroundStyles;

export function getFileName(url: string | File, isNewFile: boolean): ReactNode {
  if (isNewFile || typeof url === "string") return <>{url}</>;
  const pattern = /^[^-]+-/;
  return url.name.replace(pattern, "");
}
