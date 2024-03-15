import { useContext, useRef, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useForm, UseFormReturnType } from "@mantine/form";
import {
  Checkbox,
  Group,
  Stack,
  Center,
  ScrollArea,
  Divider,
  Box,
  Badge,
  Text,
  Textarea,
  Button,
  Image,
  Menu,
} from "@mantine/core";
import { useRouter } from "next/router";
import { NPSWeightage, QuestionType, SurveyType } from "../../../types/enums";
import { IconDeviceSdCard, IconEdit, IconEye } from "@tabler/icons-react";
import { QuestionTabsEnum } from "../EditSurvey";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import QuestionTypePreview from "./Previews/QuestionTypePreview";
import {
  googleReviewSupportedTypes,
  logicSupportedTypes,
  ticketIssueSupportedTypes,
  validationSupportedTypes,
} from "../../../utils/data";
import { showErrorToast } from "../../../utils/notifications";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "../../../utils/questions";
import { CurrentResponsesContext } from "../../../context/ResponseContext";
import { IconBrandGoogle, IconTicket } from "@tabler/icons";

import { LanguageCompletionView } from "./LanguageCompletionView";

import { ChoicesCreator } from "./ChoicesCreator";
import TestimonialExtraProps from "./TestimonialExtraProps";
import { useImageStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import { deleteUploadedFiles } from "../../../utils/file-upload/upload";
import ContactExtraProps from "./ContactExtraProps";
import TncExtraProps from "./TncExtraProps";
import styles from "./QuestionDetailedView.module.css";
import { NPSQuestions, SAVE_HOTKEY } from "../../../utils/constants";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  surveyId?: string;
}
export function QuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyLanguages,
  setSelectedLanguage,
  surveyId,
}: QuestionDetailedViewProps) {
  const router = useRouter();
  surveyId = surveyId || (router.query?.surveyId as string);
  const [titleFontSize, setTitleFontSize] = useState("2rem");
  const textInputRef = useRef(null);

  const [currentResponse, updateResponse] = useState(null || []); //temp state for preview
  const [deleteFileLoading, setDeleteFileLoading] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const form = useForm({
    initialValues: getInitialQuestionValues(question, surveyLanguages),
  });
  const incompleteLanguages = validateAllLanguagesArePopulated(
    form.values as Question,
    surveyLanguages,
    ["title", "choices"],
  );
  const { imageToDelete, resetImage } = useImageStore();

  const handleSave = async () => {
    try {
      if (
        !form.values.title[selectedLanguage] ||
        form.values.title[selectedLanguage] == ""
      ) {
        showErrorToast("Question title is missing");
        return "error";
      } else {
        if (incompleteLanguages.length > 0) {
          setSelectedLanguage(incompleteLanguages[0]);
          return "error";
        }
        if (imageToDelete?.length > 0) {
          setDeleteFileLoading(true);
          await deleteUploadedFiles({ fileKeyArray: imageToDelete });
          setDeleteFileLoading(false);
          resetImage();
        }

        // Checking if its a new question
        if (!question.id) {
          // Creating new question
          questionCreateMutation.mutate(form.values, {
            onSuccess: (r) => {
              setSelectedQ(r.data);
            },
          });
        } else {
          // Updating existing question
          notifications.show({
            id: "load-data",
            loading: true,
            title: "updating question",
            message: `Hold on, your changes are getting updated...`,
            autoClose: false,
            withCloseButton: false,
          });
          questionUpdateMutation.mutate({
            qId: question.id,
            data: form.values,
          });
        }
      }

      return "saved";
    } catch (error) {
      setDeleteFileLoading(false);
      return "no saved";
    }
  };

  const isSaving =
    questionCreateMutation.isPending ||
    questionUpdateMutation.isPending ||
    deleteFileLoading;
  return (
    <form
      onSubmit={form.onSubmit(handleSave)}
      style={{ height: "100%" }}
      onKeyDown={getHotkeyHandler([
        [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSave)(event)],
      ])}
    >
      <Stack style={{ height: "100%" }}>
        <ScrollArea style={{ flex: "1 1 0", overflow: "auto" }}>
          <Badge variant="outline" size="lg" style={{ overflow: "visible" }}>
            {question.type}
          </Badge>
          <Group justify="space-between" p={2} gap={2}>
            <Stack style={{ minHeight: "150px", height: "100%", flex: 1 }}>
              <Textarea
                fw={800}
                fz="lg"
                ref={textInputRef}
                styles={{
                  input: {
                    fontSize: titleFontSize,
                    fontWeight: 700, // set custom font size for this TextInput
                  },
                }}
                style={{
                  marginBottom: "20px", // add 30px bottom margin
                }}
                variant="unstyled"
                autosize
                maxRows={3}
                placeholder={
                  question.type !== QuestionType.InfoMessage
                    ? "Enter question title here *"
                    : "Enter the title here"
                }
                {...form.getInputProps(`title.${selectedLanguage}`)}
                value={form.values.title[selectedLanguage]}
              />

              <Textarea
                variant="unstyled"
                placeholder={
                  question.type !== QuestionType.InfoMessage
                    ? "Enter question description here"
                    : "Enter description here"
                }
                {...form.getInputProps(`description.${selectedLanguage}`)}
                value={form.values.description[selectedLanguage]}
                styles={{
                  input: {
                    fontSize: "1.1rem",
                    fontWeight: 400, // set custom font size for this TextInput
                  },
                }}
              />
              <ExtraProps
                form={form}
                question={question}
                surveyType={SurveyType.Web}
              />
            </Stack>
            <LanguageCompletionView
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              languages={surveyLanguages}
              notCompletedLanguages={incompleteLanguages}
            />
          </Group>
          <Divider
            my="xs"
            variant="dashed"
            labelPosition="center"
            label={
              <>
                <IconEye size={12} />
                <Box ml={5}>Preview</Box>
              </>
            }
          />
          <Center pb="xl" mb="lg" pl="xl" ml="xl" mt="4rem">
            <CurrentResponsesContext.Provider
              value={{ response: currentResponse, updateResponse }}
            >
              <QuestionTypePreview
                type={question?.type}
                choices={form.values.choices}
                features={form.values.features}
                tnc={form.values.tnc}
              />
            </CurrentResponsesContext.Provider>
          </Center>
        </ScrollArea>

        <Divider />

        <Group mt="sm" justify="space-between" gap="sm">
          <Group justify="flex-start" gap="md">
            <Checkbox
              label="Required"
              color="var(--tertiary-color)"
              fw={600}
              mr={!NPSQuestions.includes(question?.type) && "100px"}
              {...form.getInputProps("required", { type: "checkbox" })}
              disabled={question.type === QuestionType.InfoMessage}
            />
            {NPSQuestions.includes(question?.type) && (
              <Checkbox
                label="NPS Analytics"
                color="var(--tertiary-color)"
                fw={600}
                {...form.getInputProps("enableNpsAnalytics", {
                  type: "checkbox",
                })}
              />
            )}

            <Stack px="sm">
              {question.type !== QuestionType.InfoMessage && (
                <Menu
                  position="bottom-end"
                  offset={4}
                  withArrow
                  arrowPosition="side"
                  transitionProps={{
                    transition: "rotate-right",
                    duration: 150,
                  }}
                >
                  <Menu.Target>
                    <Button
                      variant="outline"
                      color="dark.2"
                      radius="lg"
                      size="sm"
                      rightSection={<IconChevronDown size="1rem" />}
                    >
                      <Text size="sm" c="dark.5" fw="700">
                        Actions
                      </Text>
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    {logicSupportedTypes.includes(question?.type) && (
                      <Menu.Item>
                        <RateupButtonSecondary
                          title={"Logic Jump"}
                          fullWidth
                          leftIcon={
                            <Image
                              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`}
                              h={30}
                              w={30}
                              fit="contain"
                            />
                          }
                          size="sm"
                          onClick={async () => {
                            let save = await handleSave();
                            save === "saved" &&
                              setActiveTab(QuestionTabsEnum.LogicEditor);
                          }}
                        />
                      </Menu.Item>
                    )}

                    {googleReviewSupportedTypes.includes(question?.type) && (
                      <Menu.Item>
                        <RateupButtonSecondary
                          title={"Google Review"}
                          leftIcon={
                            <IconBrandGoogle stroke={4} size={"1rem"} />
                          }
                          size="sm"
                          fullWidth
                          onClick={async () => {
                            let save = await handleSave();
                            save === "saved" &&
                              setActiveTab(QuestionTabsEnum.GoogleReviewEditor);
                          }}
                        />
                      </Menu.Item>
                    )}

                    {validationSupportedTypes.includes(question?.type) && (
                      <Menu.Item>
                        <RateupButtonSecondary
                          title={"Custom Validation"}
                          leftIcon={<IconEdit />}
                          size="sm"
                          fullWidth
                          onClick={async () => {
                            let save = await handleSave();
                            save === "saved" &&
                              setActiveTab(
                                QuestionTabsEnum.ValidationRulesEditor,
                              );
                          }}
                        />
                      </Menu.Item>
                    )}
                    {ticketIssueSupportedTypes.includes(question?.type) && (
                      <Menu.Item>
                        <RateupButtonSecondary
                          title={"Create Tickets"}
                          leftIcon={<IconTicket stroke={4} size={"1rem"} />}
                          size="sm"
                          fullWidth
                          onClick={async () => {
                            let save = await handleSave();
                            save === "saved" &&
                              setActiveTab(QuestionTabsEnum.TicketIssueEditor);
                          }}
                        />
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              )}
            </Stack>
          </Group>

          <Group>
            <RateupButtonBlue
              title={
                incompleteLanguages.length > 1 ||
                (incompleteLanguages.length > 0 &&
                  incompleteLanguages[0] !== selectedLanguage)
                  ? "Fill Next Language"
                  : "Save"
              }
              size="md"
              onClick={handleSave}
              leftIcon={<IconDeviceSdCard />}
              loading={isSaving}
            />
          </Group>
        </Group>
      </Stack>
    </form>
  );
}

export function getNpsColor(npstype) {
  switch (npstype) {
    case NPSWeightage.PROMOTER:
      return "green";
    case NPSWeightage.PASSIVE:
      return "yellow";
    case NPSWeightage.DETRACTOR:
      return "red";
    default:
      return "var(--tertiary-color)";
  }
}

interface ExtraPropsProps {
  form: UseFormReturnType<any>;
  question: Question;
  surveyType: SurveyType;
}
function ExtraProps({ form, question, surveyType }: ExtraPropsProps) {
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
    case QuestionType.CustomNPS:
      return (
        <ChoicesCreator
          qId={question?.id}
          form={form}
          surveyType={surveyType}
        />
      );
    case QuestionType.PCQ:
      return <ChoicesCreator qId={question?.id} form={form} image />;
    case QuestionType.Testimonial:
      return <TestimonialExtraProps qId={question.id} form={form} />;
    case QuestionType.Contact:
    case QuestionType.Email:
    case QuestionType.Phone:
      return <ContactExtraProps form={form} />;
    case QuestionType.TnC:
      return <TncExtraProps form={form} />;
    case QuestionType.InfoMessage:
    default:
      return null;
  }
}
