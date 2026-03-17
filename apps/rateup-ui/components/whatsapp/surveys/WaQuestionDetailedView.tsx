"use client";

import { useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ActionIcon,
  Badge,
  Box,
  Checkbox,
  Divider,
  Group,
  Image,
  Popover,
  ScrollArea,
  Stack,
  Switch,
  Textarea,
  useMantineTheme,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import {
  IconBrandGoogle,
  IconDeviceSdCard,
  IconEye,
  IconX,
} from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionType, SurveyType } from "../../../types/enums";
import {
  googleReviewSupportedTypes,
  logicSupportedTypes,
} from "../../../utils/data";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "../../../utils/questions";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { LengthTracker } from "../../input/LengthTracker";
import { LanguageCompletionView } from "../../Survey/Question/LanguageCompletionView";
import { ChoicesCreator } from "../../Survey/Question/QuestionExtraProps/ChoicesCreator";
import TestimonialExtraProps from "../../Survey/Question/QuestionExtraProps/TestimonialExtraProps";
import { WA_BODY_CHAR_LIMIT, WA_HEADER_CHAR_LIMIT } from "../whatsappConfig";
import { WhatsappChatPreview } from "./WaChatPreview";
import { QuestionTabsEnum } from "./WaEditSurvey";
import { WaListMessageItemsCreator } from "./WaListMessageItemsCreator";

interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
}
export function WaQuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyLanguages,
  setSelectedLanguage,
}: QuestionDetailedViewProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const surveyId = params.surveyId as string;
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [enableTitle, setEnableTitle] = useState(
    !!question?.title?.[selectedLanguage],
  );
  const translations = useExtracted();
  useEffect(() => {
    if (!enableTitle) {
      form.setFieldValue(
        "title",
        getInitialQuestionValues(question, surveyLanguages, SurveyType.WhatsApp)
          .title, // TODO: FIXME: this doesn't remove the title
      );
    }
  }, [enableTitle]);

  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const form = useForm({
    initialValues: getInitialQuestionValues(
      question,
      surveyLanguages,
      SurveyType.WhatsApp,
    ),
    validate: {
      description: (desc) => {
        const value = desc[selectedLanguage];
        if (value.trim().length > 4096) {
          return translations(
            "Character length exceed (Max 4096 charecters allowed)",
          );
        } else if (value.trim().length == 0) {
          return translations("message is required");
        }
      },
      title: (title) => {
        const value = title[selectedLanguage];
        if (enableTitle) {
          if (value.trim().length === 0) {
            return translations("Enter a title or disable it");
          } else if (value.trim().length > 60) {
            return translations("Max 60 charecters allowed");
          }
        }
      },
    },
  });

  // For live preview.
  // TODO: check if this operation is expensive
  useEffect(() => {
    setSelectedQ({ ...question, ...form.values });
  }, [form.values]);

  const incompleteLanguages = validateAllLanguagesArePopulated(
    form.values as Question,
    surveyLanguages,
    ["description", "choices"],
  );
  // Copy of handleSave from QuestionDetailedView.tsx
  const handleSave = () => {
    if (
      !form.values.description[selectedLanguage] ||
      form.values.description[selectedLanguage] == ""
    ) {
      toast.error("Question title is missing");
      return "error";
    } else {
      if (incompleteLanguages.length > 0) {
        setSelectedLanguage(incompleteLanguages[0]);
        return "error";
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
        toast.loading(
          translations("Hold on, your changes are getting updated.."),
          {
            id: "load-data",
          },
        );
        questionUpdateMutation.mutate({ qId: question.id, data: form.values });
      }
    }

    return "saved";
  };

  const isSaving =
    questionCreateMutation.isPending || questionUpdateMutation.isPending;
  return (
    <Stack
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      justify="space-between"
    >
      <ScrollArea h={"80%"}>
        <Group justify="space-between">
          <Switch
            label={translations("Enable Header")}
            checked={enableTitle}
            onChange={(e) => setEnableTitle(e.currentTarget.checked)}
            mb="sm"
            ml="sm"
            styles={{
              track: {
                cursor: "pointer",
              },
            }}
          />
          <Badge variant="outline" size="lg">
            {question.type}
          </Badge>
        </Group>
        <Group p={2} gap={2} pr={42}>
          {" "}
          {/* TODO: Preview button & language-complete status component are overlapping */}
          <Stack
            style={{
              height: "100%",
              overflowY: "auto",
              overflowX: "clip",
              flex: 1,
            }}
            gap={0}
            p={"sm"}
          >
            {enableTitle && (
              <Textarea
                fw={800}
                maw={"95%"}
                autosize
                maxRows={2}
                variant="unstyled"
                mx="sm"
                styles={{
                  input: {
                    fontSize: "26px",
                  },
                }}
                placeholder={translations("Enter message header here")}
                rightSection={
                  <LengthTracker
                    length={form.values.title[selectedLanguage].length}
                    maxValue={WA_HEADER_CHAR_LIMIT}
                  />
                }
                {...form.getInputProps(`title.${selectedLanguage}`)}
                value={form.values.title[selectedLanguage]}
              />
            )}
            <Textarea
              mx="sm"
              maw={"95%"}
              autosize
              maxRows={4}
              minRows={2}
              variant="unstyled"
              placeholder={translations("Enter message body here *")}
              styles={{
                input: {
                  fontSize: "24px",
                },
              }}
              rightSection={
                <LengthTracker
                  length={form.values.description[selectedLanguage].length}
                  maxValue={WA_BODY_CHAR_LIMIT}
                />
              }
              {...form.getInputProps(`description.${selectedLanguage}`)}
              value={form.values.description[selectedLanguage]}
            />
            <WaQuestionExtraProps form={form} question={question} />
          </Stack>
          <LanguageCompletionView
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            languages={surveyLanguages}
            notCompletedLanguages={incompleteLanguages}
          />
        </Group>
      </ScrollArea>
      <Stack>
        <Divider />
        <Group justify="space-between" p="xs" px={"sm"}>
          <Checkbox
            label={translations("Required")}
            fw={600}
            {...form.getInputProps("required", { type: "checkbox" })}
          />
          <Group>
            {logicSupportedTypes.includes(question?.type as QuestionType) && (
              <RateupButtonSecondary
                title={"Logic Jump"}
                leftIcon={
                  <Image
                    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
                    w={30}
                    h={30}
                    fit={"contain"}
                  />
                }
                size="sm"
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.LogicEditor);
                }}
              />
            )}
            {/* TODO: Implement Custom Validation*/}
            {googleReviewSupportedTypes.includes(
              question?.type as QuestionType,
            ) && (
              <RateupButtonSecondary
                title={translations("Google Review")}
                leftIcon={<IconBrandGoogle size={"1rem"} stroke={4} />}
                size="sm"
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.GoogleReviewEditor);
                }}
              />
            )}
          </Group>
          <RateupButtonPrimary
            title={
              incompleteLanguages.length > 1 ||
              (incompleteLanguages.length > 0 &&
                incompleteLanguages[0] !== selectedLanguage)
                ? translations("Fill Next Language")
                : translations("Save")
            }
            size="md"
            leftIcon={<IconDeviceSdCard />}
            onClick={handleSave}
            loading={isSaving}
          />
        </Group>
      </Stack>
      <Popover
        position="left"
        opened={previewOpened}
        onChange={setPreviewOpened}
        offset={{ crossAxis: 160, mainAxis: 8 }}
        closeOnClickOutside={false}
      >
        <Popover.Target>
          <ActionIcon
            style={{
              position: "absolute",
              right: "-16px",
              top: "20%",
              borderRadius: "100px",
              borderTopRightRadius: "0px",
              borderBottomRightRadius: "0px",
              height: "50px",
              width: "50px",
              zIndex: 2,
            }}
            onClick={() => setPreviewOpened((prev) => !prev)}
          >
            {previewOpened ? (
              <IconX />
            ) : (
              <IconEye style={{ width: "70%", height: "70%" }} stroke={2} />
            )}
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown
          p="0"
          style={{
            borderRadius: "16px",
          }}
        >
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              height: "600px",
              borderRadius: "16px",
              width: "300px",
            }}
            className="border border-primary"
          >
            <WhatsappChatPreview selectedQ={question} />
          </Box>
        </Popover.Dropdown>
      </Popover>
    </Stack>
  );
}

interface ExtraPropsProps {
  form: UseFormReturnType<any>;
  question: Question;
}
export function WaQuestionExtraProps({ form, question }: ExtraPropsProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
    case QuestionType.CustomNPS:
      return <ChoicesCreator qId={question.id} form={form} />;
    case QuestionType.Testimonial:
      return <TestimonialExtraProps qId={question.id} form={form} />;
    case QuestionType.WaButtons:
      return (
        <ChoicesCreator
          qId={question.id}
          form={form}
          maxChoiceCount={3}
          maxCharCount={20}
        />
      );
    case QuestionType.WaList:
      return (
        <WaListMessageItemsCreator
          initialSections={form.values.sections}
          saveSections={(sections) => {
            form.setFieldValue(`sections.${selectedLanguage}`, sections);
          }}
        />
      );
    default:
      return null;
  }
}
