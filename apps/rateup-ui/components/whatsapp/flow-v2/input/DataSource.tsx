import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Box,
  Card,
  Checkbox,
  Flex,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import { z } from "zod/v4";

import { QuestionType2 } from "@/types/enums";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
  RateupFileUploadButton,
} from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { LengthTracker } from "@/components/input/LengthTracker";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import {
  DEFAULT_IMAGE_BASE64_START,
  MAX_DESCRIPTION_COUNT,
  MAX_METADATA_COUNT,
  WaNPSQuestions2,
} from "@/utils/constants";
import { showErrorToast } from "@/utils/notifications";

import { PopoverEmojiPicker } from "../../templates/Details/TextFormateToolBar";
import inputStyles from "../EditFlow.module.css";

interface Choice {
  id: string;
  title: string;
  description: string;
  metadata: string;
  image: string;
}

const generateId = () => "_" + Math.random().toString(36).substr(2, 9);

export function DataSourceInput(props) {
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const resetRef = useRef<() => void>(null);
  const choiceResetRef = useRef<() => void>(null);
  let choices = props.value ?? [];
  let maxCharCount = props.maxCharCount ?? 30;
  let maxChoiceCount = props.maxChoice ?? 20;
  const choiceSchema = props?.onlyTitle
    ? z.object({
        title: z
          .string()
          .trim()
          .min(1)
          .max(30)
          .refine((title) => {
            const isDuplicate = choices.some((c) => {
              const choiceValue = c?.title?.replace(/\s+/g, "");
              return choiceValue === title.replace(/\s+/g, "");
            });
            return !isDuplicate;
          }, "Option already exists"),
      })
    : z.object({
        title: z
          .string()
          .trim()
          .min(1)
          .max(30)
          .refine((title) => {
            const isDuplicate = choices.some((c) => {
              const choiceValue = c?.title?.replace(/\s+/g, "");
              return choiceValue === title.replace(/\s+/g, "");
            });
            return !isDuplicate;
          }, "Option already exists"),
        description: z.string().trim().max(MAX_DESCRIPTION_COUNT).optional(),
        metadata: z.string().trim().max(MAX_METADATA_COUNT).optional(),
        image: z.string().optional().nullable(),
      });
  const choiceForm = useForm({
    initialValues: props?.onlyTitle
      ? { title: "" }
      : {
          title: "",
          description: "",
          metadata: "",
          image: "",
        },
    validate: zod4Resolver(choiceSchema),
  });
  const translations = useTranslations();
  const handleAddChoice = async () => {
    const { hasErrors } = choiceForm.validate();
    if (hasErrors) return;
    try {
      let choiceObj = {
        id: generateId(),
        ...Object.fromEntries(
          Object.entries(choiceForm.getValues()).filter(
            ([key, value]) => typeof value === "string" && value.trim() !== "",
          ),
        ),
      };
      props.insertListItem("data-source", choiceObj);
      choiceForm.reset();
    } catch (error) {
      choiceForm.reset();
      setFileUploadLoading(false);
    }
  };

  const handleRemoveChoice = (index: string) => {
    props.removeListItem("data-source", index);
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
      showErrorToast(
        "Error converting file to Base64:" + JSON.stringify(error),
        "file-converting",
      );
    }
  };

  const clearFile = () => {
    choiceForm.setFieldValue("image", null);
    choiceResetRef.current?.();
  };
  let disabled =
    Object.values(WaNPSQuestions2).includes(props?.metaType) || props.disabled;

  return (
    <Card bg={"var(--bg-grey-color)"} radius={"lg"}>
      <Text td={"underline"}>CHOICES</Text>
      <Text fz={"xs"} c={"red"}>
        {props.error}
      </Text>
      <Stack gap={"xs"}>
        {choices?.map((choice, i) => (
          <Choice
            key={choice.id}
            choice={choice}
            choices={choices}
            setChoices={props.onChange}
            onDelete={() => handleRemoveChoice(i)}
            index={i}
            maxCharCount={maxCharCount}
            disabled={disabled}
            onlyTitle={props?.onlyTitle ?? false}
          />
        ))}
      </Stack>

      {(!maxChoiceCount || choices?.length < maxChoiceCount) && (
        <Group
          className={maxCharCount && inputStyles.lengthTrackerParent}
          mt={"xs"}
          onKeyDown={getHotkeyHandler([["Enter", handleAddChoice]])}
          style={{ flexDirection: "column" }}
          display={disabled ? "none" : "flex"}
        >
          <Stack style={{ width: "100%", flexGrow: 1 }} gap={4}>
            <Group>
              <ContainedTextField
                placeholder={translations("Enter title here")}
                label={translations("Title")}
                withAsterisk
                w={"92%"}
                rightSection={
                  maxCharCount && (
                    <LengthTracker
                      length={(choiceForm.getValues().title as string)?.length}
                      maxValue={maxCharCount}
                    />
                  )
                }
                {...choiceForm.getInputProps("title")}
              />
              <Box mt={24}>
                <PopoverEmojiPicker
                  onEmojiClick={(e) =>
                    choiceForm.setFieldValue(
                      "title",
                      choiceForm.getValues().title + e,
                    )
                  }
                  size="lg"
                />
              </Box>
            </Group>
            {!props?.onlyTitle && (
              <>
                <ContainedTextField
                  placeholder={translations("Enter description here")}
                  label={translations("Description")}
                  rightSection={
                    MAX_DESCRIPTION_COUNT && (
                      <LengthTracker
                        length={
                          (choiceForm.getValues().description as string)?.length
                        }
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
                          length={
                            (choiceForm.getValues().metadata as string)?.length
                          }
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
                    fileSrc={choiceForm.getValues().image as string}
                    error={choiceForm.errors.image as string}
                    style={{ marginTop: "20px" }}
                  />
                </SimpleGrid>
              </>
            )}
          </Stack>
          <RateupButtonSecondary
            title={translations("Add choice")}
            size="sm"
            variant={"outline"}
            leftIcon={<IconPlus size="1rem" />}
            onClick={handleAddChoice}
            loading={fileUploadLoading}
          />
        </Group>
      )}
    </Card>
  );
}

export class FileConverter {
  public static async fileToBase64(
    file: File,
    withStart: boolean = false,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        let base64URL = reader.result as string;
        if (withStart) {
          resolve(base64URL);
          return;
        }
        const base64Data = base64URL.replace(
          /^data:image\/[a-zA-Z]+;base64,/,
          "",
        );
        resolve(base64Data);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }
}

interface ChoiceProps {
  choices: Choice[];
  choice: Choice;
  setChoices: Dispatch<SetStateAction<Choice[]>>;
  onDelete: () => void;
  index: number;
  maxCharCount?: number;
  disabled: boolean;
  onlyTitle: boolean;
}

function Choice({
  choices,
  choice,
  setChoices,
  onDelete,
  index,
  maxCharCount,
  disabled,
  onlyTitle,
}: ChoiceProps) {
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const resetRef = useRef<() => void>(null);
  const choiceResetRef = useRef<() => void>(null);
  const translations = useTranslations();
  const choiceSchema = z.object(
    onlyTitle
      ? { title: z.string() }
      : {
          title: z
            .string()
            .trim()
            .min(1)
            .max(30)
            .refine((title) => {
              const isDuplicate = choices.some((c, i) => {
                const choiceValue = c?.title?.replace(/\s+/g, "");
                return i !== index && choiceValue === title.replace(/\s+/g, "");
              });
              return !isDuplicate;
            }, "Option already exists"),
          description: z.string().trim().max(MAX_DESCRIPTION_COUNT).optional(),
          metadata: z.string().trim().max(MAX_METADATA_COUNT).optional(),
          image: z.string().optional().nullable(),
        },
  );

  const choiceForm = useForm<z.infer<typeof choiceSchema>>({
    initialValues: onlyTitle
      ? { title: "" }
      : {
          title: "",
          description: "",
          metadata: "",
          image: "",
        },
    validate: zod4Resolver(choiceSchema),
  });

  useEffect(() => {
    if (choice) {
      choiceForm.setValues(choice);
    }
  }, [choice]);

  const handleEditChoice = async () => {
    const { hasErrors } = choiceForm.validate();
    if (hasErrors) return;

    let choiceObj = Object.fromEntries(
      Object.entries(choiceForm.getValues()).filter(
        ([key, value]) => typeof value === "string" && value.trim() !== "",
      ),
    );
    const updatedChoices = choices.map((c, i) =>
      i === index ? { ...c, ...choiceObj } : c,
    );
    setChoices(updatedChoices);
    closeEditModal();
  };

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
      showErrorToast(
        translations("Error converting file to Base64:") +
          JSON.stringify(error),
        "file-converting",
      );
    }
  };

  return (
    <Group>
      <Group style={{ flexShrink: 1, flexGrow: 1 }}>
        <Checkbox checked={false} readOnly />
        {choice?.image ? (
          <Image
            src={`${DEFAULT_IMAGE_BASE64_START}${choice?.image}`}
            h={30}
            w={30}
            alt={choice?.title}
          />
        ) : (
          <Box h={30} w={30} />
        )}
        <Box style={{ flexGrow: 1 }}>
          <>
            <Text>
              {translations("Title: ")}
              {choice?.title}
            </Text>
            {choice?.description && (
              <Text>
                {translations("Description: ")}
                {choice?.description}
              </Text>
            )}
            {choice?.metadata && (
              <Text>
                {translations("Metadata: ")}
                {choice?.metadata}
              </Text>
            )}
          </>
        </Box>
      </Group>

      <ActionIcon
        variant="transparent"
        onClick={openEditModal}
        size={"sm"}
        disabled={disabled}
      >
        <IconEdit />
      </ActionIcon>
      <ActionIcon
        variant="transparent"
        color="red"
        onClick={onDelete}
        size={"sm"}
        disabled={disabled}
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
          <Stack style={{ flexGrow: 1 }} gap={4}>
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
            {!onlyTitle && (
              <>
                {" "}
                <ContainedTextField
                  placeholder={translations("Enter description here")}
                  label={translations("Description")}
                  rightSection={
                    MAX_DESCRIPTION_COUNT && (
                      <LengthTracker
                        length={
                          (choiceForm.getValues().description as string)?.length
                        }
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
                        length={
                          (choiceForm.getValues().metadata as string)?.length
                        }
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
                  fileSrc={choiceForm.getValues().image as string}
                  error={choiceForm.errors.image as string}
                />
              </>
            )}
          </Stack>
          <RateupButtonBlue
            title={translations("Update Choice")}
            onClick={handleEditChoice}
          />
        </Stack>
      </FormModalLayout>
    </Group>
  );
}
