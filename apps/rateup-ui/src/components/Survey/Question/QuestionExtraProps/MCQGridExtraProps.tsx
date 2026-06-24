"use client";

import { useContext, useState, type CSSProperties } from "react";

import { ActionIcon, Flex, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconEdit,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import cx from "clsx";
import { useTranslation } from "react-i18next";

import { SurveyType } from "@/types/enums.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { reorder } from "@/utils/questions.ts";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../Button/RateupButtons.tsx";
import { ContainedTextArea } from "../../../input/ContainedInput/ContainedInput.tsx";
import FormModalLayout from "../../../Modal/FormModalLayout.tsx";
import classes from "../DraggableQuestionCard/DraggableQuestionCard.module.css";
import { ChoicesCreator } from "./ChoicesCreator.tsx";

const MCQGridExtraProps = ({ form, qId }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = form.values?.features?.[selectedLanguage] || {};
  const questions = form.values?.features?.[selectedLanguage]?.questions || [];
  const [newQuestion, setNewQuestion] = useState("");
  const [updateQuestion, setUpdateQuestion] = useState<{
    question: string;
    index: number;
  }>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const { t: translations } = useTranslation();
  const handleAddQuestion = () => {
    if (!newQuestion.trim().length) return;
    if (questions?.find((question) => question.trim() === newQuestion.trim())) {
      setError(translations("Question already present"));
      return;
    }
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: {
        ...features,
        questions: [...questions, newQuestion],
      },
    });
    setError("");
    setNewQuestion("");
  };

  const handleDragEnd = ({ source, destination }) => {
    const reorderedQuestions = reorder(
      questions,
      source.index,
      destination?.index || 0,
    );
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: {
        ...features,
        questions: reorderedQuestions,
      },
    });
  };
  const handleUpdateQuestion = () => {
    if (questions[updateQuestion.index] == updateQuestion.question) return;
    if (questions.includes(updateQuestion.question)) {
      setUpdateError(translations("Question already present"));
      return;
    }
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: {
        ...features,
        questions: questions.map((q, index) =>
          index == updateQuestion.index ? updateQuestion.question : q,
        ),
      },
    });
    setUpdateQuestion(null);
    close();
  };

  const handleDeleteQuestion = (question) => {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: {
        ...features,
        questions: questions.filter((q) => q !== question),
      },
    });
  };

  return (
    <Stack w={"100%"}>
      <Title order={5}>{translations("Add Questions")}</Title>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dnd-list" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {questions?.map((question, index) => (
                <Draggable key={question} index={index} draggableId={question}>
                  {(provided, snapshot) => (
                    <div
                      className={cx(classes.item, {
                        [classes.itemDragging]: snapshot.isDragging,
                      })}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={provided.draggableProps.style as CSSProperties}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className={classes.dragHandle}
                      >
                        <IconGripVertical stroke={1.5} />
                      </div>
                      <Group justify="space-between" my={"sm"} pl={"xs"}>
                        <Text w={600}>{question}</Text>
                      </Group>
                      <Group>
                        <ActionIcon
                          variant="subtle"
                          size={"sm"}
                          onClick={() => {
                            setUpdateQuestion({ question, index });
                            open();
                          }}
                        >
                          <IconEdit />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          size={"sm"}
                          color="red"
                          onClick={() => handleDeleteQuestion(question)}
                        >
                          <IconTrash />
                        </ActionIcon>
                      </Group>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <Flex gap={"md"}>
        <ContainedTextArea
          style={{
            flexGrow: 1,
          }}
          placeholder={translations("Enter question here")}
          autosize
          size="md"
          value={newQuestion}
          onChange={(e) => {
            setError("");
            setNewQuestion(e.currentTarget.value);
          }}
          error={error}
        />
        <RateupButtonSecondary
          title={translations("Add Question")}
          leftIcon={<IconPlus size={"1rem"} />}
          onClick={handleAddQuestion}
        />
      </Flex>
      <Title order={5}>Add Choices</Title>
      <ChoicesCreator form={form} qId={qId} surveyType={SurveyType.Web} />
      <FormModalLayout
        opened={opened}
        onClose={close}
        title={translations("Edit Question")}
        centered
      >
        <Stack justify="center">
          <ContainedTextArea
            value={updateQuestion?.question}
            onChange={(event) => {
              setUpdateError("");
              setUpdateQuestion({
                ...updateQuestion,
                question: event.target.value,
              });
            }}
            autosize
            error={updateError}
          />
          <RateupButtonBlue
            title={translations("Update Question")}
            onClick={handleUpdateQuestion}
          />
        </Stack>
      </FormModalLayout>
    </Stack>
  );
};

export default MCQGridExtraProps;
