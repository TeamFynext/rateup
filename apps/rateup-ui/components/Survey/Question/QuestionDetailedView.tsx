import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  Group,
  Image,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { UseFormReturnType, useForm } from "@mantine/form";
import { IconBrandGoogle, IconTicket } from "@tabler/icons-react";
import { IconDeviceSdCard, IconEdit, IconEye } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useRef, useState } from "react";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import { CurrentResponsesContext } from "../../../context/ResponseContext";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {
  NPSWeightage,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
} from "../../../types/enums";
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
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { QuestionTabsEnum } from "../EditSurvey";
import QuestionTypePreview from "./Previews/QuestionTypePreview";

import { LanguageCompletionView } from "./LanguageCompletionView";

import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconChevronDown } from "@tabler/icons-react";
import { useBeforeUnload, useClickAway } from "react-use";
import { NPSQuestions, SAVE_HOTKEY } from "../../../utils/constants";
import { getQuestionTypeLabel } from "../../../utils/enums";
import { deleteUploadedFiles } from "../../../utils/file-upload/upload";
import { useImageStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import TextEditor from "../../RichTextEditor/TextEditor";
import { ChoicesCreator } from "./ChoicesCreator";
import ContactExtraProps from "./ContactExtraProps";
import TestimonialExtraProps from "./TestimonialExtraProps";
import TncExtraProps from "./TncExtraProps";
import { useSubscription } from "../../../backend/subscription/subscription.query";
import { hasFeature } from "../../../utils/subscription/subscription";

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

  const [currentResponse, updateResponse] = useState(null || []); //temp state for preview
  const [deleteFileLoading, setDeleteFileLoading] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const { data: subscription } = useSubscription();
  const [isGoogleReviewFeatureActive, setIsGoogleReviewFeatureActive] =
    useState(false);

  useEffect(() => {
    setIsGoogleReviewFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.GoogleReview),
    );
  }, [subscription]);

  const form = useForm({
    initialValues: getInitialQuestionValues(question, surveyLanguages),
  });

  useEffect(() => {
    form.setInitialValues(getInitialQuestionValues(question, surveyLanguages));
    form.reset();
  }, [question, surveyLanguages]);

  const incompleteLanguages = validateAllLanguagesArePopulated(
    form.values as Question,
    surveyLanguages,
    ["title", "choices"],
  );
  const { imageToDelete, resetImage } = useImageStore();
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  useClickAway(formRef, () => {
    !dialogOpened && form.isDirty() && toggle();
  });
  useDisableClickOutside(formRef, form.isDirty(), toggle, dialogOpened);
  useBeforeUnload(form.isDirty(), "You have unsaved changes, are you sure?");

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
          showErrorToast("The choice count does not match across languages");
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
      <ConfirmationModal
        opened={dialogOpened}
        onClose={() => {
          form.reset();
          closeDialog();
        }}
        headerLabel="If you don't Save, Your changes will be lost."
        headerTitle="Do you want to save your changes?"
        confirmLabel="Save Changes"
        closeLabel="Discard Changes"
        onConfirm={async () => {
          await handleSave();
        }}
      />

      <Stack style={{ height: "100%" }} ref={formRef}>
        <ScrollArea style={{ flex: "1 1 0" }}>
          <Badge variant="outline" size="lg" style={{ overflow: "visible" }}>
            {getQuestionTypeLabel(question.type)}
          </Badge>
          <Group justify="space-between" p={2} gap={2} align="start" mt={"xs"}>
            <Stack
              style={{ minHeight: "150px", height: "100%", flex: 1 }}
              mr={"xs"}
            >
              <TextEditor form={form} selectedLanguage={selectedLanguage} />
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
                      <Text size="sm" c={"var(--text-color-sp)"} fw="700">
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
                              alt="icon of login jump"
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
                        {isGoogleReviewFeatureActive ? (
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
                                setActiveTab(
                                  QuestionTabsEnum.GoogleReviewEditor,
                                );
                            }}
                          />
                        ) : (
                          <Tooltip
                            label="Upgrade your Plan for this feature."
                            disabled={isGoogleReviewFeatureActive}
                            color="yellow"
                          >
                            <Button
                              data-disabled
                              radius="lg"
                              onClick={(event) => event.preventDefault()}
                              leftSection={
                                <IconBrandGoogle stroke={4} size={"1rem"} />
                              }
                            >
                              Google Review
                            </Button>
                          </Tooltip>
                        )}
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

const useDisableClickOutside = (ref, isDirty, toggle, dialogOpened) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDirty && ref.current && !ref.current.contains(event.target)) {
        event.stopPropagation();
      }
    };

    // Add event listener when the form is dirty
    if (isDirty && !dialogOpened) {
      document.addEventListener("click", handleClickOutside, true);
    }

    // Remove event listener when the form is not dirty
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [isDirty, ref, toggle]);
};
