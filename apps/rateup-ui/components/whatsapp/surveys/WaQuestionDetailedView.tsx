import {
  Stack,
  TextInput,
  Divider,
  Group,
  Checkbox,
  Textarea,
  Popover,
  ActionIcon,
  Text,
  Box,
  Center,
  Overlay,
  Title,
  Transition,
  useMantineTheme,
  Switch,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconX,
  IconDeviceSdCard,
  IconEdit,
  IconEye,
  IconChevronLeft,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useState, useContext, useEffect } from "react";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionType } from "../../../types/enums";
import { logicSupportedTypes } from "../../../utils/data";
import {
  RateupButtonSecondary,
  RateupButtonOutline,
  RateupButtonPrimary,
} from "../../Button/RateupButtons";
import { QuestionTabsEnum } from "./WaEditSurvey";
import { LengthTracker } from "../../input/LengthTracker";
import { WA_BODY_CHAR_LIMIT, WA_HEADER_CHAR_LIMIT } from "../whatsappConfig";
import { WaListMessageItemsCreator } from "./WaListMessageItemsCreator";
import { ChoicesCreator } from "../../Survey/Question/ChoicesCreator";
import { useDisclosure } from "@mantine/hooks";
import { SendMessageMock } from "../MessageComponents";
import { WaQuestionPreview } from "./WaQuestionPreview";
import whatsappStyles from "../../Promotion/RightPanel/style.module.css";

interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  setQuestionState: React.Dispatch<React.SetStateAction<Question>>;
}
export function WaQuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyLanguages,
  setSelectedLanguage,
  setQuestionState,
}: QuestionDetailedViewProps) {
  const router = useRouter();
  const theme = useMantineTheme();
  const { surveyId } = router.query as { surveyId: string };
  const [isSaving, setIsSaving] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [enableTitle, setEnableTitle] = useState(
    !!question?.title?.[selectedLanguage],
  );

  useEffect(() => {
    if (!enableTitle) {
      form.setFieldValue("title", "");
    }
  }, [enableTitle]);

  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
    setIsSaving,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
    setIsSaving,
  });

  const form = useForm({
    initialValues: {
      title: question?.title[selectedLanguage] || "",
      description: question?.description[selectedLanguage] || "",
      required: question?.required,
      type: question?.type,
      choices: question?.choices,
      sections: question?.sections || {},
    },
    validate: {
      description: (value) => {
        //-----------whatsapp text message support only 4096 charecters only----------
        if (value.trim().length > 4096) {
          return "Charecter length exceed (Max 4096 charecters allowed)";
        } else if (value.trim().length == 0) {
          return "message is required";
        }
      },
      title: (value) => {
        if (enableTitle) {
          if (value.trim().length === 0) {
            return "Enter a title or disable it";
          } else if (value.trim().length > 60) {
            return "Max 60 charecters allowed";
          }
        }
      },
    },
  });

  useEffect(() => {
    setQuestionState((prevQ) => {
      let updatedQ = { ...prevQ };
      updatedQ.title[selectedLanguage] = form.values.title;
      updatedQ.description[selectedLanguage] = form.values.description;
      if (form.values.choices) {
        updatedQ.choices = form.values.choices;
      } else if (form.values.sections) {
        updatedQ.sections = form.values.sections as any;
      }
      return updatedQ;
    });
  }, [
    form.values.title,
    form.values.description,
    form.values.choices,
    form.values.sections,
  ]);

  const handleSave = () => {
    setIsSaving(true);
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      setIsSaving(false);
      return "error";
    } else {
      // converting to expected format
      const { title, description, ...restOfTheData } = form.values;
      const formattedTitle = { ...question.title, [selectedLanguage]: title };
      const formattedDescription = {
        ...question.description,
        [selectedLanguage]: description,
      };

      // TODO: only send modified fields
      const data = {
        title: formattedTitle,
        description: formattedDescription,
        ...restOfTheData,
      };
      // Checking if its a new question
      if (!question.id) {
        // Creating new question
        questionCreateMutation.mutateAsync(data).then((r) => {
          const newQ: Question = r.data;
          setSelectedQ(newQ);
        });
      } else {
        // Updating existing question
        questionUpdateMutation.mutate({ qId: question.id, data: data });
      }

      let langList: string[] = surveyLanguages;
      const missingLangs = [];

      langList.forEach((language: string) => {
        if (language == selectedLanguage) {
          return;
        }
        if (
          !question.description[language] ||
          question.description[language] == ""
        ) {
          missingLangs.push(language);
        }
      });

      if (missingLangs.length > 0) {
        setIsSaving(false);
        setSelectedLanguage(missingLangs[0]);
        form.setFieldValue(title, "");
        form.validate();
        notifications.show({
          id: "errorn",
          color: "red",
          title: `"${missingLangs[0]}" Question is missing`,
          message: `Add question in ${missingLangs[0]} language  also`,
          icon: <IconX size="1rem" />,
          //autoClose: 5000,
          // position: "bottom-center"
        });
        return "error";
      }
    }

    //setIsSaving(false);
    return "saved";
  };

  // TODO: show question type somewhere
  return (
    <Stack
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      gap={"xs"}
    >
      <Stack
        style={{
          height: "100%",
          overflowY: "auto",
          overflowX: "clip",
        }}
        gap={0}
      >
        <Switch
          label="Enable Header"
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
        {enableTitle && (
          <TextInput
            fw={800}
            maw={"95%"}
            variant="unstyled"
            mx="sm"
            style={{
              fontSize: "28px",
            }}
            placeholder="Enter message header here"
            rightSection={
              <LengthTracker
                string={form.values.title}
                maxValue={WA_HEADER_CHAR_LIMIT}
              />
            }
            {...form.getInputProps("title")}
          />
        )}
        <Textarea
          mx="sm"
          maw={"95%"}
          autosize
          maxRows={4}
          variant="unstyled"
          placeholder="Enter message body here *"
          style={{
            fontSize: "22px",
          }}
          rightSection={
            <LengthTracker
              string={form.values.description}
              maxValue={WA_BODY_CHAR_LIMIT}
            />
          }
          {...form.getInputProps("description")}
        />
        <ExtraProps form={form} question={question} />
      </Stack>

      <Divider />

      <Stack
        pt="sm"
        style={{ height: "40px", position: "sticky", bottom: "0" }}
      >
        <Group justify="space-between" gap="sm">
          <Group>
            <Checkbox
              label="Required"
              fw={600}
              {...form.getInputProps("required", { type: "checkbox" })}
            />
            {logicSupportedTypes.includes(question?.type) && (
              <RateupButtonOutline
                title={"Logic Jump"}
                leftIcon={<IconEdit />}
                size="sm"
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.LogicEditor);
                }}
              />
            )}
            {/* TODO: Implement Google review & Custom Validation*/}
          </Group>
          <RateupButtonPrimary
            title={"Save"}
            size="md"
            onClick={handleSave}
            loading={isSaving}
          />
        </Group>
        <Group justify="flex-start" gap="md"></Group>
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
              border: "2px solid",
              borderColor: theme.colors["whatsapp-green"][6],
            }}
          >
            <WhatsappChatPreview selectedQ={question} />
          </Box>
        </Popover.Dropdown>
      </Popover>
    </Stack>
  );
}

const WhatsappChatPreview = ({ selectedQ }) => {
  const [listOpened, { open, close }] = useDisclosure(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const theme = useMantineTheme();
  const sections = selectedQ?.sections?.[selectedLanguage];
  return (
    <>
      <Title
        p="sm"
        style={{
          backgroundColor: theme.colors["whatsapp-green"][7],
          textAlign: "center",
        }}
        order={3}
        c={"white"}
      >
        Preview
      </Title>
      <Stack className={whatsappStyles.chatBg} px="xs" py="sm" justify="end">
        {selectedQ && (
          <WaQuestionPreview question={selectedQ} openList={open} />
        )}
      </Stack>
      <SendMessageMock />
      <Transition mounted={listOpened}>
        {(ts) => (
          <Overlay
            style={{
              ...ts,
            }}
          />
        )}
      </Transition>
      <Transition mounted={listOpened} transition={"slide-up"}>
        {(transitionStyle1) => (
          <Overlay
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "end",
            }}
          >
            <Stack
              style={{
                backgroundColor: "white",
                ...transitionStyle1,
              }}
              pt="4px"
              p={0}
              mah={"70%"}
            >
              <Center>
                <Box
                  h="5px"
                  w="25px"
                  style={{
                    backgroundColor: "gray",
                    borderRadius: "1000px",
                  }}
                />
              </Center>
              <Group
                p="0"
                style={{
                  position: "relative",
                }}
                justify="center"
              >
                <ActionIcon
                  variant="transparent"
                  c="dark"
                  size={"sm"}
                  style={{
                    position: "absolute",
                    left: "4px",
                  }}
                  onClick={close}
                >
                  <IconX />
                </ActionIcon>
                <Text
                  style={{
                    justifySelf: "center",
                  }}
                >
                  View Options
                </Text>
              </Group>
              <Stack
                px={"xs"}
                style={{
                  overflow: "auto",
                }}
              >
                {sections?.map((section) => {
                  return <WaSectionDisplay section={section} />;
                })}
              </Stack>
              <Center>
                <Text c="dimmed" fz="xs" p="sm">
                  Tap to select an item
                </Text>
              </Center>
            </Stack>
          </Overlay>
        )}
      </Transition>
    </>
  );
};
function WaSectionDisplay({ section }) {
  const theme = useMantineTheme();
  return (
    <>
      <Text c={theme.colors.blue[9]}>{section.title}</Text>
      <Stack>
        {section.rows.map((item) => (
          <Group justify="space-between">
            <Box>
              <Text>{item.title}</Text>
              <Text c="dimmed">{item.description}</Text>
            </Box>
            <Box
              h="15px"
              w="15px"
              style={{
                border: "2px solid gray",
                borderRadius: "100px",
              }}
            />
          </Group>
        ))}
      </Stack>
    </>
  );
}
interface ExtraPropsProps {
  form: UseFormReturnType<any>;
  question: Question;
}
function ExtraProps({ form, question }: ExtraPropsProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
      return <ChoicesCreator qId={question.id} form={form} />;
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
          initialSections={form.values.sections?.[selectedLanguage]}
          saveSections={(sections) => {
            form.setFieldValue(`sections.${selectedLanguage}`, sections);
          }}
        />
      );
    default:
      return null;
  }
}
