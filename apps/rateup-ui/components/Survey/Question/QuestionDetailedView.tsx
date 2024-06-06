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

import { getHotkeyHandler } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconChevronDown } from "@tabler/icons-react";
import { useBeforeUnload, useClickAway } from "react-use";
import { NPSQuestions, SAVE_HOTKEY } from "../../../utils/constants";
import { getQuestionTypeLabel } from "../../../utils/enums";
import { deleteUploadedFiles } from "../../../utils/file-upload/upload";
import { useImageStore } from "../../HomePage/pages/Pricing/store/RouteAndCartStore";
import TextEditor from "../../RichTextEditor/TextEditor";
import { ChoicesCreator } from "./QuestionExtraProps/ChoicesCreator";
import ContactExtraProps from "./QuestionExtraProps/ContactExtraProps";
import TestimonialExtraProps from "./QuestionExtraProps/TestimonialExtraProps";
import TncExtraProps from "./QuestionExtraProps/TncExtraProps";
import { useSubscription } from "../../../backend/subscription/subscription.query";
import { hasFeature } from "../../../utils/subscription/subscription";
import ImportChoices from "./ImportChoices";
import MultiTextInputExtraProps from "./QuestionExtraProps/MultiTextInputExtraProps";
import MCQGridExtraProps from "./QuestionExtraProps/MCQGridExtraProps";
import EmailOtpExtraProps from "./QuestionExtraProps/EmailOtpExtraProps";

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
  const [isTicketFeatureActive, setIsTicketFeatureActive] = useState(false);

  useEffect(() => {
    setIsGoogleReviewFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.GoogleReview),
    );

    setIsTicketFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    );
  }, [subscription]);

  const form = useForm({
    initialValues: getInitialQuestionValues(question, surveyLanguages),
  });

  form.watch("choices", ({ previousValue, value, touched, dirty }) => {
    if (!getIncompleteLanguages()?.length) {
      handleSave();
    }
  });

  useEffect(() => {
    form.setInitialValues(getInitialQuestionValues(question, surveyLanguages));
    form.reset();
  }, [question, surveyLanguages]);

  function getIncompleteLanguages() {
    return validateAllLanguagesArePopulated(
      form.getValues() as Question,
      surveyLanguages,
      ["title", "choices"],
    );
  }

  const { imageToDelete, resetImage } = useImageStore();
  const formRef = useRef<HTMLDivElement | null>(null);

  const handleSave = async () => {
    try {
      if (
        !form.values.title[selectedLanguage] ||
        form.values.title[selectedLanguage] == ""
      ) {
        showErrorToast("Question title is missing");
        return "error";
      } else {
        if (getIncompleteLanguages().length > 0) {
          setSelectedLanguage(getIncompleteLanguages()[0]);
          showErrorToast(
            "Please Enter heading and choices for all languages before saving.",
          );
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
            data: form.getValues(),
          });
        }
      }

      return "saved";
    } catch (error) {
      setDeleteFileLoading(false);
      return "no saved";
    }
  };

  useEffect(() => {
    if (form.isDirty()) handleSave();
  }, [form.values.required, form.values.enableNpsAnalytics]);

  const isSaving =
    questionCreateMutation.isPending ||
    questionUpdateMutation.isPending ||
    deleteFileLoading;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      style={{ height: "100%" }}
      onKeyDown={getHotkeyHandler([
        [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSave)(event)],
      ])}
    >
      <Stack style={{ height: "100%" }} ref={formRef}>
        <ScrollArea style={{ flex: "1 1 0" }}>
          <Badge
            variant={getQuestionTypeLabel(question.type) ? "outline" : "light"}
            size="lg"
            style={{ overflow: "visible" }}
            color={
              getQuestionTypeLabel(question.type)
                ? "var(--tertiary-color)"
                : "red"
            }
          >
            {getQuestionTypeLabel(question.type)
              ? getQuestionTypeLabel(question.type)
              : "Not Available"}
          </Badge>
          <Group justify="space-between" p={2} gap={2} align="start" mt={"xs"}>
            <Stack
              style={{ minHeight: "150px", height: "100%", flex: 1 }}
              mr={"xs"}
            >
              <Group
                onBlur={async (e) => {
                  const currentTarget = e.currentTarget;
                  const relatedTarget = e.relatedTarget;
                  if (
                    !currentTarget.contains(relatedTarget) &&
                    getIncompleteLanguages()?.length === 0
                  ) {
                    if (form.isDirty()) await handleSave();
                  }
                }}
              >
                <TextEditor form={form} selectedLanguage={selectedLanguage} />
              </Group>

              <ExtraProps
                form={form}
                question={question}
                surveyType={SurveyType.Web}
                surveyLanguages={surveyLanguages}
                handleSave={handleSave}
              />
            </Stack>
            <LanguageCompletionView
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              languages={surveyLanguages}
              notCompletedLanguages={getIncompleteLanguages()}
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
              checked={form.values.required}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                form.setFieldValue("required", checked);
              }}
              disabled={question.type === QuestionType.InfoMessage}
            />
            {NPSQuestions.includes(question?.type) && (
              <Checkbox
                label="NPS Analytics"
                color="var(--tertiary-color)"
                fw={600}
                checked={form.values.enableNpsAnalytics}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  form.setFieldValue("enableNpsAnalytics", checked);
                }}
              />
            )}

            <Stack px="sm">
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
                  <Menu.Item>
                    <RateupButtonSecondary
                      title={"Variables"}
                      fullWidth
                      size="sm"
                      onClick={() =>
                        setActiveTab(QuestionTabsEnum.VariableEditor)
                      }
                    />
                  </Menu.Item>
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
                              setActiveTab(QuestionTabsEnum.GoogleReviewEditor);
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
                      {isTicketFeatureActive ? (
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
                      ) : (
                        <Tooltip
                          label="Upgrade your Plan for this feature."
                          disabled={isTicketFeatureActive}
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
                            Create Tickets
                          </Button>
                        </Tooltip>
                      )}
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            </Stack>
          </Group>

          <Group>
            <RateupButtonBlue
              title={
                getIncompleteLanguages().length > 1 ||
                (getIncompleteLanguages().length > 0 &&
                  getIncompleteLanguages()[0] !== selectedLanguage)
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
  surveyLanguages: string[];
  handleSave: () => void;
}
function ExtraProps({
  form,
  question,
  surveyType,
  surveyLanguages,
  handleSave,
}: ExtraPropsProps) {
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
    case QuestionType.CustomNPS:
      return (
        <>
          <ImportChoices
            mantineFormObj={form}
            surveyLanguagesArr={surveyLanguages}
            questionObj={question}
            handleSave={handleSave}
          />

          <ChoicesCreator
            qId={question?.id}
            form={form}
            surveyType={surveyType}
          />
        </>
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
    case QuestionType.MultiTextInput:
      return <MultiTextInputExtraProps form={form} />;
    case QuestionType.MCQGrid:
      return <MCQGridExtraProps form={form} qId={question.id} />;
    case QuestionType.EmailOtp:
      return (
        <EmailOtpExtraProps
          form={form}
          qId={question.id}
          surveyLanguages={surveyLanguages}
        />
      );
    default:
      return null;
  }
}
