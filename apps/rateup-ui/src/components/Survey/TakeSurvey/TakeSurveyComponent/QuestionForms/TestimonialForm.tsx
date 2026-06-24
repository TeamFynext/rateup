import {
  Box,
  FileButton,
  Group,
  Image,
  Rating,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { fallbackImage } from "@/utils/constants.ts";
import { dataURItoBlob, getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import { RateupButtonBlue } from "../../../../Button/RateupButtons.tsx";
import WebcamCapture from "../../../../input/WebCamCapture.tsx";
import FormModalLayout from "../../../../Modal/FormModalLayout.tsx";
import { ImageCropModal } from "../../../../Modal/ImageCropModal.tsx";
import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

import classes from "../TakeSurvey.module.css";

interface TestimonialProps {
  features;
  isPreview?;
}

export function TestimonialForm({ features, isPreview }: TestimonialProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [openedCropDialog, { toggle: toggleCropDialog, close: closeCropDialog }] =
    useDisclosure(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...response, name: e.currentTarget.value });
  };
  const { t: translations } = useTranslation();
  const handleJobTitleChange = (e) => {
    updateResponse({ ...response, jobTitle: e.currentTarget.value });
  };

  const handleTestimonialChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateResponse({ ...response, testimonial: e.currentTarget.value });
  };

  useEffect(() => {
    if (capturedImg) {
      const blob = dataURItoBlob(capturedImg);
      const capturedImageFile = new File([blob], "captured-image.jpg", {
        type: blob.type,
        lastModified: new Date().getTime(),
      });
      setSelectedImage(capturedImageFile);
      toggleCropDialog();
    }
  }, [capturedImg]);

  useEffect(() => {
    if (!file) return;
    setIsUploading(true);
    uploadFile(file)
      .then((key) => {
        updateResponse({ ...response, photo: key });
        setIsUploading(false);
      })
      .catch((_err) => {
        toast.error(translations("Error uploading icon. Please try again."));
        setIsUploading(false);
      });
  }, [file]);
  const handleCropImageSave = async (cropedImage) => {
    if (!cropedImage) return;
    setFile(cropedImage);
  };

  const onChangePicture = (event: File) => {
    if (!event) return;
    setSelectedImage(event);
    toggleCropDialog();
  };
  const theme = useMantineTheme();

  return (
    <Stack miw={`min(100%,411px)`}>
      {selectedImage && (
        <ImageCropModal
          opened={openedCropDialog}
          onclose={closeCropDialog}
          imageName={selectedImage?.name}
          handleCropImageSave={handleCropImageSave}
          image={URL.createObjectURL(selectedImage)}
          aspect={4 / 3}
        />
      )}
      <Stack gap={"xs"}>
        <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
          {features?.[selectedLanguage]?.nameQn}
        </Text>
        <FormPaperLayout>
          <TextInput
            placeholder={translations("Enter name")}
            value={response?.name}
            onChange={handleNameChange}
            style={{ maxWidth: "400px" }}
            variant="unstyled"
            classNames={{
              input: classes.input,
            }}
            onClick={handleInputScrollIntoView}
          />
        </FormPaperLayout>
      </Stack>
      {features?.[selectedLanguage]?.jobTitle && (
        <Stack gap={"xs"}>
          <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
            {features?.[selectedLanguage]?.jobTitleQn}
          </Text>
          <FormPaperLayout>
            <TextInput
              placeholder={translations("Enter job title")}
              value={response?.jobTitle}
              onChange={handleJobTitleChange}
              style={{ maxWidth: "400px" }}
              variant="unstyled"
              classNames={{
                input: classes.input,
              }}
              onClick={handleInputScrollIntoView}
            />
          </FormPaperLayout>
        </Stack>
      )}
      <Stack gap={"xs"}>
        <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
          {features?.[selectedLanguage]?.testimonialQn}
        </Text>
        <FormPaperLayout>
          <Textarea
            placeholder={translations("Enter testimonial")}
            value={response?.testimonial}
            onChange={handleTestimonialChange}
            style={{ maxWidth: "400px" }}
            variant="unstyled"
            classNames={{
              input: classes.input,
            }}
            onClick={handleInputScrollIntoView}
          />
        </FormPaperLayout>
      </Stack>
      {features?.[selectedLanguage]?.rating && (
        <Stack gap={"xs"}>
          <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
            {features?.[selectedLanguage]?.ratingQn || "Give rating"}
          </Text>
          <Rating
            value={response?.rating}
            onChange={(value) => updateResponse({ ...response, rating: value })}
            size={"xl"}
            color={theme.primaryColor}
          />
        </Stack>
      )}
      {features?.[selectedLanguage]?.photo && (
        <>
          <Stack gap={"xs"}>
            <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
              {features?.[selectedLanguage]?.photoQn || translations("Upload Photo")}
            </Text>
            <Group>
              <Box style={{ border: "1px solid grey", borderRadius: "10px" }} w={200} h={150}>
                <FormModalLayout
                  title={translations("Camera")}
                  onClose={close}
                  opened={opened}
                  centered
                >
                  <Box>
                    <WebcamCapture
                      height={"100%"}
                      width={"100%"}
                      setCapturedImg={setCapturedImg}
                      close={close}
                    />
                  </Box>
                </FormModalLayout>
                <Skeleton visible={isUploading} height={"100%"} width={"100%"}>
                  <Image
                    src={getFileUrlFromKey(response?.photo)}
                    alt="Your uploaded image"
                    radius={"10px"}
                    fallbackSrc={fallbackImage}
                    h={fallbackImage ? 148 : 200}
                  />
                </Skeleton>
              </Box>
              <Stack>
                <FileButton
                  onChange={onChangePicture}
                  accept="image/png,image/jpeg"
                  disabled={isPreview}
                >
                  {(props) => (
                    <RateupButtonBlue {...props} title={translations("Browse from device")} />
                  )}
                </FileButton>
                <RateupButtonBlue
                  title={translations("Capture Photo")}
                  onClick={() => open()}
                  disabled={isPreview}
                />
              </Stack>
            </Group>
          </Stack>
        </>
      )}
    </Stack>
  );
}
