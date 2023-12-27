import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  Box,
  FileButton,
  Group,
  Image,
  Paper,
  Skeleton,
  Stack,
  TextInput,
  Textarea,
  Title,
  Text,
  Rating,
  closeOnEscape,
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
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import FormModalLayout from "../../../../Modal/FormModalLayout";

interface TestimonialProps {
  features;
  isPreview?;
}

export function TestimonialForm({ features, isPreview }: TestimonialProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [rating, setRating] = useState(0);
  const [opened, { open, close }] = useDisclosure(false);
  const [capturedImg, setCapturedImg] = useState(null);

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
    updateResponse({ ...response, rating: rating });
  }, [rating]);

  useEffect(() => {
    if (capturedImg) {
      const blob = dataURItoBlob(capturedImg);
      const capturedImageFile = new File([blob], "captured-image.jpg", {
        type: blob.type,
        lastModified: new Date().getTime(),
      });
      setFile(capturedImageFile);
    }
  }, [capturedImg]);

  useEffect(() => {
    if (!file) return;
    setIsUploading(true);
    uploadFile(file)
      .then((key) => {
        updateResponse({ ...response, pfp: key });
        setIsUploading(false);
        console.log("response", response);
      })
      .catch((err) => {
        showErrorToast("Error uploading icon. Please try again.");
        setIsUploading(false);
      });
  }, [file]);

  return (
    <Stack>
      <Paper shadow="sm" className={classes.inputBox}>
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
      </Paper>
      {features?.[selectedLanguage]?.hasJobTitle && (
        <Paper shadow="sm" className={classes.inputBox}>
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
        </Paper>
      )}
      <Paper shadow="sm" className={classes.inputBox}>
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
      </Paper>
      {features?.[selectedLanguage]?.hasRating && (
        <>
          <Text>Rate Us Now</Text>
          <Rating
            value={rating}
            onChange={setRating}
            size={"xl"}
            color="var(--tertiary-color)"
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
                h={200}
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
                {file ? (
                  <Skeleton
                    visible={isUploading}
                    height={"100%"}
                    width={"100%"}
                  >
                    <Image
                      src={getFileUrlFromKey(response?.pfp)}
                      alt="Your uploaded image"
                      radius={"10px"}
                    />
                  </Skeleton>
                ) : null}
              </Box>
              <Stack>
                <FileButton
                  onChange={setFile}
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
