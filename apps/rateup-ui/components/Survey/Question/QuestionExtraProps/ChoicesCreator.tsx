"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  FileButton,
  Flex,
  Group,
  Image,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { getHotkeyHandler, useDisclosure, useHover } from "@mantine/hooks";
import { IconEdit, IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { z } from "zod/v4";

import { NPSWeightage, QuestionType, SurveyType } from "@/types/enums";
import { useResponses } from "@/backend/surveys/response/response.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
  RateupFileUploadButton,
} from "@/components/Button/RateupButtons";
import { useImageStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore";
import {
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { LengthTracker } from "@/components/input/LengthTracker";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { ImageCropModal } from "@/components/Modal/ImageCropModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import SelectedLanguageContext from "@/context/SelectedLanguage";
import SurveyContext from "@/context/SurveyContext";
import {
  DEFAULT_IMAGE_BASE64_START,
  MAX_DESCRIPTION_COUNT,
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
  MAX_METADATA_COUNT,
} from "@/utils/constants";
import { uploadFile } from "@/utils/file-upload/upload";

import inputStyles from "../../../input/InputStyles.module.css";
import { getNpsColor } from "../QuestionDetailedView";

interface ChoicesCreatorProps {
  form: UseFormReturnType<any>;
  qId: string;
  maxChoiceCount?: number;
  maxCharCount?: number;
  image?: boolean;
  surveyType?: SurveyType;
}
export function ChoicesCreator({
  form,
  qId,
  maxCharCount,
  maxChoiceCount,
  image = false,
  surveyType,
}: ChoicesCreatorProps) {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const [choiceWeightage, setChoiceWeightage] = useState<NPSWeightage>(
    NPSWeightage.PROMOTER,
  );
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>();
  const [selectedInputImage, setSelectedInputImage] = useState({
    url: "",
    name: "",
  });
  const [fileError, setFileError] = useState("");
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [isSubmited, setIsSubmited] = useState(false);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);
  const resetRef = useRef<() => void>(null);
  const buttonRef = useRef<HTMLButtonElement>(undefined);
  const choiceResetRef = useRef<() => void>(null);
  const choiceSchema = z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(surveyType !== SurveyType.Web ? 30 : 100)
      .refine((title) => {
        const isDuplicate = choices.some((c) => {
          const choiceValue = image
            ? c?.value?.value.replace(/\s+/g, "")
            : surveyType !== SurveyType.Web
              ? c?.value?.title?.replace(/\s+/g, "")
              : c?.value?.replace(/\s+/g, "");
          return choiceValue === title.replace(/\s+/g, "");
        });
        return !isDuplicate;
      }, "Option already exists"),
    description: z.string().trim().max(MAX_DESCRIPTION_COUNT).optional(),
    metadata: z.string().trim().max(MAX_METADATA_COUNT).optional(),
    image: z.string().optional().nullable(),
  });
  const choiceForm = useForm<z.infer<typeof choiceSchema>>({
    initialValues: {
      title: "",
      description: "",
      metadata: "",
      image: "",
    },
    validate: zod4Resolver(choiceSchema),
  });
  const translations = useExtracted();
  const choices = form.values.choices?.[selectedLanguage] || [];
  const features = form.values.features?.[selectedLanguage] || {
    other: {
      isEnabled: false,
      title: translations("Other"),
      placeholder: translations("Please enter your Other input"),
    },
  };

  const { updateImageArray } = useImageStore();
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    if (form?.values?.choices && isSubmited) {
      buttonRef?.current?.click();
      setIsSubmited(false);
    }
  }, [isSubmited]);

  const handleAddChoice = async () => {
    const { hasErrors } = choiceForm.validate();
    if (hasErrors) return;
    try {
      if (choiceWeightage.trim().length === 0)
        return choiceForm.setFieldError("title", "Text required");
      let choiceObj = {
        value:
          surveyType !== SurveyType.Web
            ? Object.fromEntries(
                Object.entries(choiceForm.getValues()).filter(
                  ([key, value]) => value?.trim() !== "",
                ),
              )
            : choiceForm.getValues().title,
        weightage:
          form.values.type === QuestionType.CustomNPS
            ? choiceWeightage
            : undefined,
      };
      if (image) {
        if (!selectedImageFile) return setFileError("select image");
        setFileUploadLoading(true);
        const fileKey = await uploadFile(selectedImageFile);
        setFileUploadLoading(false);
        form.setFieldValue("choices", {
          ...form.values.choices,
          [selectedLanguage]: [
            ...choices,
            { value: { value: choiceForm.getValues().title, image: fileKey } },
          ],
        });
        setSelectedImageFile(null);
        setIsSubmited(true);
      } else {
        form.setFieldValue("choices", {
          ...form.values.choices,
          [selectedLanguage]: [...choices, choiceObj],
        });
      }
      choiceForm.reset();
      setChoiceWeightage(NPSWeightage.PROMOTER);
    } catch (error) {
      choiceForm.reset();
      setFileUploadLoading(false);
    }
  };

  const handleRemoveChoice = (choice) => {
    if (image) updateImageArray({ Key: choice?.value?.image });
    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: choices.filter((c) => c !== choice),
    });
  };

  const onChangePicture = (event: File | null) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(
        `${translations("Max file size is")} ${MAX_FILE_SIZE_IN_MB} MB`,
      );
      return;
    }
    setSelectedInputImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    resetRef?.current?.();
  };
  const handleCropImageSave = (cropedImage: File) => {
    setSelectedImageFile(cropedImage);
    setFileError("");
  };

  const handleFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > 300000)
        return choiceForm.setFieldError("image", "max image size is 300KB");
      choiceForm.clearFieldError("image");
      const base64String = await FileConverter.fileToBase64(file);
      choiceForm.setFieldValue("image", base64String);
    } catch (error) {
      toast.error("Error converting file to Base64:" + JSON.stringify(error), {
        id: "file-converting",
      });
    }
  };
  const clearFile = () => {
    choiceForm.setFieldValue("image", null);
    choiceResetRef.current?.();
  };
  return (
    <>
      <Stack
        py="xs"
        gap={form.values.type == QuestionType.CustomNPS ? "lg" : "xs"}
      >
        <ImageCropModal
          opened={openedCropDialog}
          onclose={closeCropDialog}
          imageName={selectedInputImage.name}
          handleCropImageSave={handleCropImageSave}
          image={selectedInputImage.url}
          aspect={4 / 3}
        />
        {choices.map((choice, i) => (
          <Choice
            key={i}
            choice={image ? choice?.value : choice}
            onDelete={() => handleRemoveChoice(choice)}
            form={form}
            index={i}
            image={image}
            buttonRef={buttonRef}
            maxCharCount={maxCharCount}
            surveyType={surveyType}
          />
        ))}
      </Stack>
      {(!maxChoiceCount || choices.length < maxChoiceCount) && (
        <Group
          className={maxCharCount && inputStyles.lengthTrackerParent}
          mt={"xs"}
          onKeyDown={getHotkeyHandler([["Enter", handleAddChoice]])}
          style={{
            flexDirection: surveyType !== SurveyType.Web ? "column" : "row",
          }}
        >
          <Stack
            style={{
              width: surveyType !== SurveyType.Web ? "100%" : "auto",
              flexGrow: 1,
            }}
            gap={4}
          >
            <ContainedTextField
              placeholder={translations("Enter title here")}
              label={translations("Title")}
              withAsterisk
              rightSection={
                maxCharCount && (
                  <LengthTracker
                    length={choiceForm.getValues().title?.length}
                    maxValue={maxCharCount}
                  />
                )
              }
              {...choiceForm.getInputProps("title")}
            />
            {surveyType !== SurveyType.Web && (
              <>
                <ContainedTextField
                  placeholder={translations("Enter description here")}
                  label={translations("Description")}
                  rightSection={
                    MAX_DESCRIPTION_COUNT && (
                      <LengthTracker
                        length={choiceForm.getValues().description?.length}
                        maxValue={MAX_DESCRIPTION_COUNT}
                      />
                    )
                  }
                  {...choiceForm.getInputProps("description")}
                />
                <SimpleGrid cols={2}>
                  <ContainedTextField
                    placeholder="Enter metadata here"
                    label={"Metadata"}
                    rightSection={
                      MAX_METADATA_COUNT && (
                        <LengthTracker
                          length={choiceForm.getValues().metadata?.length}
                          maxValue={MAX_METADATA_COUNT}
                        />
                      )
                    }
                    {...choiceForm.getInputProps("metadata")}
                  />
                  <RateupFileUploadButton
                    clearFile={clearFile}
                    handleFileChange={handleFileChange}
                    resetRef={resetRef}
                    fileSrc={choiceForm.getValues().image}
                    error={choiceForm.errors.image as string}
                    style={{
                      marginTop: "20px",
                    }}
                  />
                </SimpleGrid>
              </>
            )}
          </Stack>
          {form?.values?.type === QuestionType.CustomNPS && (
            <Select
              data={Object.values(NPSWeightage)}
              value={choiceWeightage}
              onChange={setChoiceWeightage as any}
              maw={140}
              styles={{
                input: { outline: `1px solid ${getNpsColor(choiceWeightage)}` },
              }}
              radius={"md"}
              allowDeselect={false}
              comboboxProps={{
                withinPortal: false,
              }}
            />
          )}
          {image && (
            <Stack
              gap={0}
              mt={fileError && "lg"}
              mb={inputError?.length > 0 && "lg"}
            >
              <FileButton
                onChange={onChangePicture}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                key={form?.values?.images?.length}
                resetRef={resetRef}
              >
                {(props) => (
                  <Button {...props} variant="outline">
                    <Text fz="sm" mr={4}>
                      {selectedImageFile?.name ?? translations("Select Image")}
                    </Text>
                    <IconUpload size={18} />
                  </Button>
                )}
              </FileButton>
              {fileError && (
                <Text c={"red"}>{translations("Image Is Required")}</Text>
              )}
            </Stack>
          )}
          <Button type="submit" display={"none"} ref={buttonRef} />
          <RateupButtonSecondary
            title={translations("Add choice")}
            size="sm"
            variant={image ? "filled" : "outline"}
            leftIcon={<IconPlus size="1rem" />}
            onClick={handleAddChoice}
            loading={fileUploadLoading}
            mb={inputError?.length > 0 && "lg"}
          />
        </Group>
      )}
      {[QuestionType.MCQ, QuestionType.MSQ].includes(form.values.type) &&
        surveyType == SurveyType.Web && (
          <Stack>
            <PaperLayout w={"fit-content"}>
              <Switch
                label={translations("Enable Other")}
                checked={features?.other?.isEnabled}
                onChange={(e) => {
                  form.setFieldValue("features", {
                    ...form.values.features,
                    [selectedLanguage]: {
                      ...features,
                      other: {
                        ...features.other,
                        isEnabled: e.currentTarget.checked,
                      },
                    },
                  });
                }}
              />
            </PaperLayout>

            {features?.other?.isEnabled && (
              <>
                <ContainedTextArea
                  label={translations("Title for 'Other'")}
                  styles={{
                    input: {
                      border: "none",
                      borderBottom: "1px solid var(--mantine-color-gray-3)",
                      borderRadius: 0,
                    },
                  }}
                  size="sm"
                  onChange={(e) => {
                    form.setFieldValue("features", {
                      ...form.values.features,
                      [selectedLanguage]: {
                        ...features,
                        other: {
                          ...features.other,
                          title: e.currentTarget.value,
                        },
                      },
                    });
                  }}
                  value={features?.other?.title}
                />
                <ContainedTextArea
                  label={translations("Placeholder text for other input")}
                  styles={{
                    input: {
                      border: "none",
                      borderBottom: "1px solid var(--mantine-color-gray-3)",
                      borderRadius: 0,
                    },
                  }}
                  size="sm"
                  onChange={(e) => {
                    form.setFieldValue("features", {
                      ...form.values.features,
                      [selectedLanguage]: {
                        ...features,
                        other: {
                          ...features.other,
                          placeholder: e.currentTarget.value,
                        },
                      },
                    });
                  }}
                  value={features?.other?.placeholder}
                />
              </>
            )}
          </Stack>
        )}
    </>
  );
}
class FileConverter {
  public static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        let base64URL = reader.result as string;

        const base64Data = base64URL.replace(
          /^data:image\/[a-zA-Z]+;base64,/,
          "",
        );

        resolve(base64Data);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsDataURL(file); // Converts the file to base64 URL
    });
  }
}
interface ChoiceProps {
  choice: Choice;
  onDelete: () => void;
  form;
  index: number;
  image?;
  buttonRef?;
  maxCharCount?: number;
  surveyType;
}
function Choice({
  choice,
  onDelete,
  form,
  index,
  image,
  buttonRef,
  maxCharCount,
  surveyType,
}: ChoiceProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>();
  const [selectedInputImage, setSelectedInputImage] = useState({
    url: "",
    name: "",
  });
  const [fileError, setFileError] = useState("");
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [isSubmited, setIsSubmited] = useState(false);
  const [
    openedCropDialog,
    { toggle: toggleCropDialog, close: closeCropDialog },
  ] = useDisclosure(false);
  const { surveyTeamMapId } = useContext(SurveyContext);
  const { data: responses } = useResponses(surveyTeamMapId);
  const resetRef = useRef<() => void>(null);
  let newWeightage = choice?.weightage;
  const choiceResetRef = useRef<() => void>(null);
  const translations = useExtracted();
  useEffect(() => {
    if (form?.values?.choices && isSubmited) {
      buttonRef?.current?.click();
      setIsSubmited(false);
    }
  }, [isSubmited]);

  const onChangePicture = (event: File | null) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
      return;
    }
    close();
    setSelectedInputImage({
      url: URL.createObjectURL(event),
      name: event.name,
    });
    toggleCropDialog();
    resetRef?.current?.();
  };
  const handleCropImageSave = (cropedImage: File) => {
    setSelectedImageFile(cropedImage);
    setFileError("");
    open();
  };

  const handleChangeWeightage = (value) => {
    const updatedChoices = form.values.choices?.[selectedLanguage]?.map((c) => {
      if (c.value == choice?.value) return { ...c, weightage: value };
      else return c;
    });

    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: updatedChoices,
    });
  };

  let choices = form.values.choices?.[selectedLanguage];
  const handleEditChoice = async () => {
    const { hasErrors } = choiceForm.validate();
    if (hasErrors) return;
    if (image) {
      let fileKey = "";

      if (selectedImageFile) {
        setFileUploadLoading(true);
        fileKey = await uploadFile(selectedImageFile);
        setFileUploadLoading(false);
      }
      const updatedChoices = choices?.map((c, i) => {
        if (i == index)
          return {
            ...c,
            value: {
              value: choiceForm.getValues().title,
              image: fileKey ? fileKey : c?.value?.image,
            },
          };
        else return c;
      });

      form.setFieldValue("choices", {
        ...form.values.choices,
        [selectedLanguage]: updatedChoices,
      });
      setSelectedImageFile(null);
    } else {
      let choiceObj = {
        value:
          surveyType !== SurveyType.Web
            ? Object.fromEntries(
                Object.entries(choiceForm.getValues()).filter(
                  ([key, value]) => value?.trim() !== "",
                ),
              )
            : choiceForm.getValues().title,
      };
      const updatedChoices = form.values.choices?.[selectedLanguage]?.map(
        (c, i) => {
          if (i == index) return { ...c, ...choiceObj };
          else return c;
        },
      );
      form.setFieldValue("choices", {
        ...form.values.choices,
        [selectedLanguage]: updatedChoices,
      });
    }
    setIsSubmited(true);
    closeEditModal();
  };
  const choiceSchema = z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(surveyType !== SurveyType.Web ? 30 : 100)
      .refine((title) => {
        const isDuplicate = choices.some((c, i) => {
          const choiceValue = image
            ? c?.value?.value.replace(/\s+/g, "")
            : surveyType !== SurveyType.Web
              ? c?.value?.title?.replace(/\s+/g, "")
              : c?.value?.replace(/\s+/g, "");
          return i !== index && choiceValue === title.replace(/\s+/g, "");
        });

        return !isDuplicate;
      }, "Option already exists"),
    description: z.string().trim().max(MAX_DESCRIPTION_COUNT).optional(),
    metadata: z.string().trim().max(MAX_METADATA_COUNT).optional(),
    image: z.string().optional().nullable(),
  });

  const choiceForm = useForm<z.infer<typeof choiceSchema>>({
    initialValues: {
      title: "",
      description: "",
      metadata: "",
      image: "",
    },
    validate: zod4Resolver(choiceSchema),
  });
  useEffect(() => {
    if (typeof choice.value === "object") choiceForm.setValues(choice.value);
    else choiceForm.setValues({ title: choice.value });
  }, []);
  const clearFile = () => {
    choiceForm.setFieldValue("image", null);
    choiceResetRef.current?.();
  };
  const handleFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > 300000)
        return choiceForm.setFieldError("image", "max image size is 300KB");
      choiceForm.clearFieldError("image");
      const base64String = await FileConverter.fileToBase64(file);
      choiceForm.setFieldValue("image", base64String);
    } catch (error) {
      toast.error(
        translations("Error converting file to Base64:") +
          JSON.stringify(error),
        {
          id: "file-converting",
        },
      );
    }
  };
  return (
    <Group>
      <ImageCropModal
        opened={openedCropDialog}
        onclose={closeCropDialog}
        imageName={selectedInputImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedInputImage.url}
        aspect={4 / 3}
      />
      {form.values.type == QuestionType.CustomNPS ? (
        <Flex gap={"xs"} w={"85%"}>
          <Badge color={getNpsColor(choice.weightage)} mt={"5px"}></Badge>
          <Text w={"85%"}>
            {typeof choice.value !== "object" && choice.value}
          </Text>
          <Select
            data={Object.values(NPSWeightage)}
            value={newWeightage}
            onChange={handleChangeWeightage}
            maw={140}
            styles={{
              input: { outline: `1px solid ${getNpsColor(newWeightage)}` },
            }}
            radius={"md"}
            allowDeselect={false}
            comboboxProps={{
              withinPortal: false,
            }}
          />
        </Flex>
      ) : typeof choice.value === "object" ? (
        <Group
          style={{
            flexShrink: 1,
            flexGrow: 1,
          }}
        >
          <Checkbox checked={false} readOnly />
          {choice.value?.image ? (
            <Image
              src={`${DEFAULT_IMAGE_BASE64_START}${choice.value?.image}`}
              h={30}
              w={30}
            />
          ) : (
            <Box h={30} w={30} />
          )}
          <Box
            style={{
              flexGrow: 1,
            }}
          >
            <>
              <Text>
                {translations("Title: ")}
                {choice.value?.title}
              </Text>
              {choice.value?.description && (
                <Text>
                  {translations("Description: ")}
                  {choice.value?.description}
                </Text>
              )}
              {choice.value?.metadata && (
                <Text>
                  {translations("Metadata: ")}
                  {choice.value?.metadata}
                </Text>
              )}
            </>
          </Box>
        </Group>
      ) : (
        <Checkbox
          style={{
            flexShrink: 1,
            flexGrow: 1,
          }}
          label={choice?.value}
          checked={false}
          readOnly
        />
      )}
      <ActionIcon
        variant="transparent"
        onClick={responses?.length ? open : openEditModal}
        size={"sm"}
      >
        <IconEdit />
      </ActionIcon>
      <ActionIcon
        variant="transparent"
        color="red"
        onClick={onDelete}
        size={"sm"}
      >
        <IconTrash />
      </ActionIcon>
      <FormModalLayout
        opened={openedEditModal}
        onClose={closeEditModal}
        title={translations("Edit Choice")}
        centered
      >
        <Stack justify="center">
          <Stack
            style={{
              flexGrow: 1,
            }}
            gap={4}
          >
            <ContainedTextField
              placeholder={translations("Enter title here")}
              label={translations("Title")}
              withAsterisk
              rightSection={
                maxCharCount && (
                  <LengthTracker
                    length={choiceForm.getValues().title?.length}
                    maxValue={maxCharCount}
                  />
                )
              }
              {...choiceForm.getInputProps("title")}
            />
            {surveyType !== SurveyType.Web && (
              <>
                <ContainedTextField
                  placeholder={translations("Enter description here")}
                  label={translations("Description")}
                  rightSection={
                    MAX_DESCRIPTION_COUNT && (
                      <LengthTracker
                        length={choiceForm.getValues().description?.length}
                        maxValue={MAX_DESCRIPTION_COUNT}
                      />
                    )
                  }
                  {...choiceForm.getInputProps("description")}
                />
                <ContainedTextField
                  placeholder={translations("Enter metadata here")}
                  label={translations("Metadata")}
                  rightSection={
                    MAX_METADATA_COUNT && (
                      <LengthTracker
                        length={choiceForm.getValues().metadata?.length}
                        maxValue={MAX_METADATA_COUNT}
                      />
                    )
                  }
                  {...choiceForm.getInputProps("metadata")}
                />
                <RateupFileUploadButton
                  clearFile={clearFile}
                  handleFileChange={handleFileChange}
                  resetRef={resetRef}
                  fileSrc={choiceForm.getValues().image}
                  error={choiceForm.errors.image as string}
                />
              </>
            )}
          </Stack>
          {image && (
            <Stack gap={0} mt={fileError && "lg"}>
              <FileButton
                onChange={onChangePicture}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                key={form?.values?.images?.length}
                resetRef={resetRef}
              >
                {(props) => (
                  <Button {...props} radius={"lg"} variant="outline">
                    <Text fz="sm" mr={4}>
                      {selectedImageFile?.name ?? "Edit Image"}
                    </Text>
                    <IconUpload size={18} />
                  </Button>
                )}
              </FileButton>
              {fileError && <Text c={"red"}>Image Is Required</Text>}
            </Stack>
          )}
          <RateupButtonBlue
            title={translations("Update Choice")}
            onClick={handleEditChoice}
            loading={fileUploadLoading}
          />
        </Stack>
      </FormModalLayout>
      <ConfirmationModal
        opened={opened}
        confirmLabel={translations("Yes")}
        headerTitle={translations("Warning")}
        headerLabel={translations(
          "Editing the choice may affect previous result count.Do you still want to continue?",
        )}
        onClose={close}
        onConfirm={openEditModal}
      />
    </Group>
  );
}
