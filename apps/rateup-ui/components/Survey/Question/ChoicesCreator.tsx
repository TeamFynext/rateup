import {
  Stack,
  Group,
  Checkbox,
  ActionIcon,
  Badge,
  Flex,
  Select,
  Text,
  ScrollArea,
  FileButton,
  Button,
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { useDisclosure, useHover } from "@mantine/hooks";
import { IconEdit, IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { useState, useContext, useCallback, useRef, useEffect } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { LengthTracker } from "../../input/LengthTracker";
import inputStyles from "../../input/InputStyles.module.css";
import { NPSWeightage, QuestionType } from "../../../types/enums";
import FormModalLayout from "../../Modal/FormModalLayout";
import { getNpsColor } from "./QuestionDetailedView";
import SurveyContext from "../../../context/SurveyContext";
import { useResponses } from "../../../backend/surveys/response/response.query";
import {
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
} from "../../../utils/constants";
import { showErrorToast } from "../../../utils/notifications";
import { ImageCropModal } from "../../Modal/ImageCropModal";
import { useImageStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import { uploadFile } from "../../../utils/file-upload/upload";

interface ChoicesCreatorProps {
  form: UseFormReturnType<any>;
  qId: string;
  maxChoiceCount?: number;
  maxCharCount?: number;
  image?: boolean;
}
export function ChoicesCreator({
  form,
  qId,
  maxCharCount,
  maxChoiceCount,
  image = false,
}: ChoicesCreatorProps) {
  const [newChoice, setNewChoice] = useState<string>("");
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
  const buttonRef = useRef<HTMLButtonElement>();

  const choices = form.values.choices?.[selectedLanguage] || [];

  const { surveyTeamMapId } = useContext(SurveyContext);
  const { data: responses } = useResponses(surveyTeamMapId);
  const { updateImageArray } = useImageStore();
  const [inputError, setInputError] = useState("");
  const hasResponse = responses?.length ? true : false;

  useEffect(() => {
    if (form?.values?.choices && isSubmited) {
      buttonRef?.current?.click();
      setIsSubmited(false);
    }
  }, [isSubmited]);

  const handleAddChoice = async () => {
    try {
      if (newChoice.trim().length === 0) return setInputError("Text required");
      if (choiceWeightage.trim().length === 0)
        return setInputError("Text required");
      if (
        choices.some(
          (c) =>
            (image
              ? c?.value?.value.replace(/\s+/g, "")
              : c?.value?.replace(/\s+/g, "")) ===
            newChoice.replace(/\s+/g, ""),
        )
      )
        return setInputError("Option already exist");
      let choiceObj = {
        value: newChoice,
        weightage:
          form.values.type === QuestionType.CustomNPS
            ? choiceWeightage
            : undefined,
      };
      setInputError("");
      if (image) {
        if (!selectedImageFile) return setFileError("select image");
        setFileUploadLoading(true);
        const fileKey = await uploadFile(selectedImageFile);
        setFileUploadLoading(false);
        form.setFieldValue("choices", {
          ...form.values.choices,
          [selectedLanguage]: [
            ...choices,
            { value: { value: newChoice, image: fileKey } },
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
      setNewChoice("");
      setChoiceWeightage(NPSWeightage.PROMOTER);
    } catch (error) {
      setNewChoice("");
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

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleAddChoice();
      }
    },
    [handleAddChoice],
  );
  const onChangePicture = (event: File | null) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      showErrorToast(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
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
            hasResponse={hasResponse}
            image={image}
            buttonRef={buttonRef}
          />
        ))}
      </Stack>

      {(!maxChoiceCount || choices.length < maxChoiceCount) && (
        <Group
          className={maxCharCount && inputStyles.lengthTrackerParent}
          mt={"xs"}
        >
          <ContainedTextField
            placeholder="Enter choice here"
            value={newChoice}
            onChange={(e) => {
              setInputError("");
              setNewChoice(e.currentTarget.value);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flexGrow: 1,
            }}
            rightSection={
              maxCharCount && (
                <LengthTracker string={newChoice} maxValue={maxCharCount} />
              )
            }
            error={inputError}
          />
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
                  <Button {...props}>
                    <Text fz="sm" mr={4}>
                      {selectedImageFile?.name ?? "Select Image"}
                    </Text>
                    <IconUpload size={18} />
                  </Button>
                )}
              </FileButton>
              {fileError && <Text c={"red"}>Image Is Required</Text>}
            </Stack>
          )}
          <Button type="submit" display={"none"} ref={buttonRef} />
          <RateupButtonSecondary
            title={"Add choice"}
            size="sm"
            leftIcon={<IconPlus size="1rem" />}
            onClick={handleAddChoice}
            loading={fileUploadLoading}
            mb={inputError?.length > 0 && "lg"}
          />
        </Group>
      )}
    </>
  );
}

interface ChoiceProps {
  choice: Choice;
  onDelete: () => void;
  form;
  index: number;
  hasResponse: boolean;
  image?;
  buttonRef?;
}
function Choice({
  choice,
  onDelete,
  form,
  index,
  hasResponse,
  image,
  buttonRef,
}: ChoiceProps) {
  const { hovered, ref } = useHover<HTMLInputElement>();
  const [opened, { open, close }] = useDisclosure(false);
  const [choiceValue, setChoiceValue] = useState(choice?.value);
  const [error, setError] = useState("");
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
  const resetRef = useRef<() => void>(null);
  let newWeightage = choice?.weightage;

  useEffect(() => {
    if (form?.values?.choices && isSubmited) {
      buttonRef?.current?.click();
      setIsSubmited(false);
    }
  }, [isSubmited]);

  const onChangePicture = (event: File | null) => {
    if (!event) return;
    if (event.size > MAX_FILE_SIZE_IN_BYTE) {
      showErrorToast(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
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

  const handleEditChoice = async () => {
    const isExist = form.values.choices?.[selectedLanguage]?.some((c, i) => {
      if (i === index) return;
      return (
        (image ? c.value?.value?.trim() : c.value?.trim()) ==
        choiceValue?.trim()
      );
    });
    if (isExist) {
      setError("Choice Already exist");
      return;
    } else {
      setError("");

      if (image) {
        let fileKey = "";

        if (selectedImageFile) {
          setFileUploadLoading(true);
          fileKey = await uploadFile(selectedImageFile);
          setFileUploadLoading(false);
        }
        const updatedChoices = form.values.choices?.[selectedLanguage]?.map(
          (c, i) => {
            if (i == index)
              return {
                ...c,
                value: {
                  value: choiceValue,
                  image: fileKey ? fileKey : c?.value?.image,
                },
              };
            else return c;
          },
        );
        form.setFieldValue("choices", {
          ...form.values.choices,
          [selectedLanguage]: updatedChoices,
        });
        setSelectedImageFile(null);
      } else {
        const updatedChoices = form.values.choices?.[selectedLanguage]?.map(
          (c, i) => {
            if (i == index) return { ...c, value: choiceValue };
            else return c;
          },
        );

        form.setFieldValue("choices", {
          ...form.values.choices,
          [selectedLanguage]: updatedChoices,
        });
      }
      setIsSubmited(true);
      close();
    }
  };

  return (
    <Group ref={ref}>
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
          <Text w={"85%"}>{choice.value}</Text>
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
          />
        </Flex>
      ) : (
        <Checkbox label={choice?.value} w={"85%"} checked={false} readOnly />
      )}
      <ActionIcon
        variant="transparent"
        onClick={open}
        size={"sm"}
        disabled={hasResponse}
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
        opened={opened}
        onClose={close}
        title="Edit Choice"
        centered
      >
        <Stack justify="center">
          <ContainedTextArea
            value={choiceValue}
            onChange={(event) => {
              setError("");
              setChoiceValue(event.target.value);
            }}
            error={error}
            autosize
          />
          {image && (
            <Stack gap={0} mt={fileError && "lg"}>
              <FileButton
                onChange={onChangePicture}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                key={form?.values?.images?.length}
                resetRef={resetRef}
              >
                {(props) => (
                  <Button {...props} radius={"lg"}>
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
            title="Update Choice"
            onClick={handleEditChoice}
            loading={fileUploadLoading}
          />
        </Stack>
      </FormModalLayout>
    </Group>
  );
}
