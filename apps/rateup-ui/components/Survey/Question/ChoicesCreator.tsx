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
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { useDisclosure, useHover } from "@mantine/hooks";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState, useContext, useCallback } from "react";
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

interface ChoicesCreatorProps {
  form: UseFormReturnType<any>;
  qId: string;
  maxChoiceCount?: number;
  maxCharCount?: number;
}
export function ChoicesCreator({
  form,
  qId,
  maxCharCount,
  maxChoiceCount,
}: ChoicesCreatorProps) {
  const [newChoice, setNewChoice] = useState<string>("");
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const [choiceWeightage, setChoiceWeightage] = useState<NPSWeightage>(
    NPSWeightage.PROMOTER,
  );
  const choices = form.values.choices?.[selectedLanguage] || [];

  const handleAddChoice = () => {
    if (newChoice.trim().length === 0) return;
    if (choiceWeightage.trim().length === 0) return;
    if (
      choices.some(
        (c) => c.value.replace(/\s+/g, "") === newChoice.replace(/\s+/g, ""),
      )
    )
      return;
    let choiceObj = {
      value: newChoice,
      weightage:
        form.values.type === QuestionType.CustomNPS
          ? choiceWeightage
          : undefined,
    };
    form.setFieldValue("choices", {
      ...form.values.choices,
      [selectedLanguage]: [...choices, choiceObj],
    });
    setNewChoice("");
    setChoiceWeightage(NPSWeightage.PROMOTER);
  };

  const handleRemoveChoice = (choice) => {
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

  return (
    <>
      <Stack
        py="xs"
        gap={form.values.type == QuestionType.CustomNPS ? "lg" : "xs"}
      >
        {choices.map((choice, i) => (
          <Choice
            key={choice}
            choice={choice}
            onDelete={() => handleRemoveChoice(choice)}
            form={form}
            index={i}
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
            onChange={(e) => setNewChoice(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            style={{
              flexGrow: 1,
            }}
            rightSection={
              maxCharCount && (
                <LengthTracker string={newChoice} maxValue={maxCharCount} />
              )
            }
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
          <RateupButtonSecondary
            title={"Add choice"}
            size="sm"
            leftIcon={<IconPlus size="1rem" />}
            onClick={handleAddChoice}
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
  index;
}
function Choice({ choice, onDelete, form, index }: ChoiceProps) {
  const { hovered, ref } = useHover<HTMLInputElement>();
  const [opened, { open, close }] = useDisclosure(false);
  const [choiceValue, setChoiceValue] = useState(choice?.value);
  const [error, setError] = useState("");
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  let newWeightage = choice.weightage;

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

  const handleEditChoice = () => {
    const isExist = form.values.choices?.[selectedLanguage]?.some((c, i) => {
      return c.value?.trim() == choiceValue?.trim();
    });
    if (isExist) {
      setError("Choice Already exist");
      return;
    } else {
      setError("");
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
      close();
    }
  };

  return (
    <Group ref={ref}>
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
        <Checkbox label={choice.value} w={"85%"} checked={false} readOnly />
      )}
      <ActionIcon variant="transparent" onClick={open} size={"sm"}>
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
          <RateupButtonBlue title="Edit choice" onClick={handleEditChoice} />
        </Stack>
      </FormModalLayout>
    </Group>
  );
}
