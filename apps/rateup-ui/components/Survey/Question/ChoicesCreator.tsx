import { Stack, Group, TextInput, Checkbox, ActionIcon } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { useHover } from "@mantine/hooks";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState, useContext, useCallback } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import {
  ContainedFileInput,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import { LengthTracker } from "../../input/LengthTracker";
import inputStyles from "../../input/InputStyles.module.css";

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

  const choices = form.values.choices?.[selectedLanguage] || [];

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
      <Stack py="xs" gap={"xs"}>
        {choices.map((choice, i) => (
          <Choice
            key={choice}
            choice={choice}
            onDelete={() => handleRemoveChoice(choice)}
          />
        ))}
      </Stack>

      {(!maxChoiceCount || choices.length < maxChoiceCount) && (
        <Group className={maxCharCount && inputStyles.lengthTrackerParent}>
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
          <RateupButtonPrimary
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
  choice: string;
  onDelete: () => void;
}
function Choice({ choice, onDelete }: ChoiceProps) {
  const { hovered, ref } = useHover<HTMLInputElement>();

  return (
    <Group ref={ref} style={{ height: "30px" }}>
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
