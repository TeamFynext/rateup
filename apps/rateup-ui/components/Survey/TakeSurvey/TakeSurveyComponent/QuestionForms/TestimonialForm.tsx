import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  Box,
  FileButton,
  Group,
  Image,
  Skeleton,
  Stack,
  TextInput,
  Textarea,
  Text,
  Rating,
  useMantineTheme,
} from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import {
  dataURItoBlob,
  getFileUrlFromKey,
  uploadFile,
} from "../../../../../utils/file-upload/upload";
import { showErrorToast } from "../../../../../utils/notifications";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import WebcamCapture from "../../../../input/WebCamCapture";
import { RateupButtonBlue } from "../../../../Button/RateupButtons";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../../../Modal/FormModalLayout";
import { ImageCropModal } from "../../../../Modal/ImageCropModal";
import { fallbackImage } from "../../../../../utils/constants";
import FormPaperLayout from "./layout/FormPaperLayout";

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
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...response, name: e.currentTarget.value });
  };

  const handleJobTitleChange = (e) => {
    updateResponse({ ...response, jobTitle: e.currentTarget.value });
  };

  const handleTestimonialChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
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
      .catch((err) => {
        showErrorToast("Error uploading icon. Please try again.");
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
  console.log(features);
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
      <FormPaperLayout>
        <TextInput
          placeholder="Enter your name"
          value={response?.name}
          onChange={handleNameChange}
          style={{ maxWidth: "400px" }}
          variant="unstyled"
          classNames={{
            input: classes.input,
          }}
        />
      </FormPaperLayout>
      {features?.[selectedLanguage]?.hasJobTitle && (
        <FormPaperLayout>
          <TextInput
            placeholder="Enter your job title"
            value={response?.jobTitle}
            onChange={handleJobTitleChange}
            style={{ maxWidth: "400px" }}
            variant="unstyled"
            classNames={{
              input: classes.input,
            }}
          />
        </FormPaperLayout>
      )}
      <FormPaperLayout>
        <Textarea
          placeholder="Enter your testimonial"
          value={response?.testimonial}
          onChange={handleTestimonialChange}
          style={{ maxWidth: "400px" }}
          variant="unstyled"
          classNames={{
            input: classes.input,
          }}
        />
      </FormPaperLayout>
      {features?.[selectedLanguage]?.hasRating && (
        <>
          <Text>Rate Us Now</Text>
          <Rating
            value={response?.rating}
            onChange={(value) => updateResponse({ ...response, rating: value })}
            size={"xl"}
            color={theme.primaryColor}
          />
        </>
      )}
      {features?.[selectedLanguage]?.hasPhoto && (
        <>
          <Stack>
            <Text>Upload your Image</Text>
            <Group>
              <Box
                style={{ border: "1px solid grey", borderRadius: "10px" }}
                w={200}
                h={150}
              >
                <FormModalLayout
                  title="Camera"
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
                    <RateupButtonBlue {...props} title="Browse from device" />
                  )}
                </FileButton>
                <RateupButtonBlue
                  title="Capture Photo"
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
