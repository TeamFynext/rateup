import { useContext, useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useForm, UseFormReturnType } from "@mantine/form";
import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Stack,
  TextInput,
  Flex,
  Text,
  Tabs,
  Space
} from "@mantine/core";
import { useRouter } from "next/router";
import { QuestionType } from "../../../types/enums";
import { IconPlus, IconTrash, IconChevronRight } from "@tabler/icons-react";
import { useHover } from "@mantine/hooks";
import { QuestionTabsEnum } from "../EditSurvey";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../api/surveys/questions/questions.query";
import { OutlineButton, SecondaryButton } from "../../Button/ButtonComponent";
import StyledTabs  from "../../../pages/dashboard/surveys/StyledTabs";

// TODO: use a routing method instead of passing the question as a prop?
// or use react-query?
interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
}
export function QuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
}: QuestionDetailedViewProps) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };

  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionCreateMutation = useQuestionCreateMutation(surveyId);
  const questionUpdateMutation = useQuestionUpdateMutation(surveyId);

  const form = useForm({
    // Any modifications to initialValues must be applied in the useEffect below
    initialValues: {
      title: question.title[selectedLanguage] || "",
      description: question.description[selectedLanguage] || "",
      required: question.required,
      type: question.type,
      choices: question.choices,
    },
    validate: {
      title: (value) => (value.trim().length > 0 ? null : "Title is required"),
    },
  });

  // reset values when switching questions
  useEffect(() => {
    // TODO: avoid duplication?
    form.setValues({
      // TODO: can we check if the value is undefined and not set it in form validation or something?
      title: question.title[selectedLanguage] || "",
      description: question.description[selectedLanguage] || "",
      required: question.required,
      type: question.type,
      choices: question.choices,
    });
  }, [question]);

  const handleSave = () => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }

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
  };

  // TODO: show question type somewhere
  return (
    <Box sx={{ position: "relative", height: "100%"}} >
      <TextInput
        fw={800}
        fz="lg"
        styles={{
          input: {
            fontSize: '3rem', 
            fontWeight:700// set custom font size for this TextInput
          },
        }}
        sx={{
          marginBottom: '30px', // add 30px bottom margin
        }}
        variant="unstyled"
        size="xl"
        placeholder="Enter question title here *"
        {...form.getInputProps("title")}
      />
      <TextInput
        variant="unstyled"
        placeholder="Enter question description here"
        {...form.getInputProps("description")}
        styles={{
          input: {
            fontSize: '1.6rem', 
            fontWeight:400// set custom font size for this TextInput
          },
        }}
      />
      <ExtraProps form={form} question={question} />


      <Group
        position="apart"
        sx={{ position: "absolute", bottom: "0px", left: "0px", width: "100%" }}
        
      >

     <Flex
        gap="xl"
        justify="center"
        align="space-between"
        direction="column"
        wrap="wrap"
      >

      <Flex
            gap="md"
            justify="space-between"
            align="center"
            direction="row"
          >
            <Checkbox
                label="Required"
                color="dark"
                fw={600}
                {...form.getInputProps("required", { type: "checkbox" })}
              />
            <Group>
                <SecondaryButton 
                    title={"Save"}
                    size="md"
                    onClick={handleSave}
                  />
                  <SecondaryButton 
                    title={"Add Next Question "}
                    size="md"
                    rightIcon={<IconChevronRight />}
                    onClick={() => setActiveTab(QuestionTabsEnum.TypeSelection)}
                  />
              </Group>
          </Flex>
        <Group position="apart" >
            <OutlineButton 
                title={"Edit Logic"}
                size="sm"
                onClick={() => setActiveTab(QuestionTabsEnum.LogicEditor)}
              />
            <Space w="xl" />
            <Space w="xl" />
            <StyledTabs
                  value={"English"}
                //onTabChange={(tab) => setActiveTab(tab as TabEnum)}
                >
                  <Group position="apart">
                    <Tabs.List                    >
                      <Tabs.Tab value={"English"}>English</Tabs.Tab>
                      <Tabs.Tab value={"Malayalam"}>Malayalam</Tabs.Tab>
                    </Tabs.List>
                  </Group>
              </StyledTabs>

              <Space w="xl" />
              <Space w="xl" />
              <Space w="xl" />
              <Text c="blue.9">Question id: 999999999999999 </Text>

         </Group>

      </Flex>

      </Group>
    </Box>
  );
}

// TODO: move to new file
// TODO: better name? :)
interface ChoicesCreatorProps {
  form: UseFormReturnType<any>;
  qId: string;
}
function ChoicesCreator({ form, qId }: ChoicesCreatorProps) {
  const [newChoice, setNewChoice] = useState<string>("");
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;

  const choices = form.values.choices?.[selectedLanguage] || [];

  useEffect(() => {}, [choices]);

  const handleAddChoice = () => {
    if (newChoice.trim().length === 0) return;
    if (choices.includes(newChoice)) return;

    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: [...choices, newChoice],
    });
    setNewChoice("");
  };

  const handleRemoveChoice = (choice) => {
    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: choices.filter((c) => c !== choice),
    });
  };

  return (
    <>
      <Stack py="xs" spacing={"xs"}>
        {choices.map((choice, i) => (
          <Choice
            key={choice}
            choice={choice}
            onDelete={() => handleRemoveChoice(choice)}
          />
        ))}
      </Stack>

      <Group>
        <TextInput
          placeholder="Enter choice here"
          value={newChoice}
          onChange={(e) => setNewChoice(e.currentTarget.value)}
        />

        <Button leftIcon={<IconPlus />} onClick={handleAddChoice}>
          Add choice
        </Button>
      </Group>
    </>
  );
}

interface ChoiceProps {
  choice: string;
  onDelete: () => void;
}
function Choice({ choice, onDelete }: ChoiceProps) {
  const { hovered, ref } = useHover<HTMLInputElement>();

  return (
    <Group ref={ref} sx={{ height: "30px" }}>
      <Checkbox label={choice} checked={false} readOnly />
      {hovered && (
        <ActionIcon
          variant="transparent"
          color="red"
          onClick={onDelete}
          size={"sm"}
        >
          <IconTrash />
        </ActionIcon>
      )}
    </Group>
  );
}

interface ExtraPropsProps {
  form: UseFormReturnType<any>;
  question: Question;
}
function ExtraProps({ form, question }: ExtraPropsProps) {
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
      return <ChoicesCreator qId={question.id} form={form} />;
    default:
      return null;
  }
}
