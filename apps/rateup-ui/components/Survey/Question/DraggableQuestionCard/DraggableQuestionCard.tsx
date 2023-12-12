import {
  Badge,
  ActionIcon,
  Text,
  Box,
  useMantineTheme,
  Dialog,
  Group,
  Image,
} from "@mantine/core";
import { useDisclosure, useHover } from "@mantine/hooks";
import {
  IconBrandGoogle,
  IconGripVertical,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useContext, useState } from "react";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { Draggable } from "react-beautiful-dnd";
import { useQueryClient } from "@tanstack/react-query";
import classes from "./DraggableQuestionCard.module.css";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../Button/RateupButtons";
import cx from "clsx";
import { useQuestionDeleteMutation } from "../../../../backend/surveys/questions/questions.query";
import ConfirmationModal from "../../../Modal/ConfirmationModal";

interface DraggableQuestionCardProps {
  question: Question;
  index: number;
  handleOpenQuestion: (Q: Question) => void;
  selected: boolean;
  onDelete: (questionId: string) => void;
  isWaSurvey?: boolean;
}

export function DraggableQuestionCard({
  question,
  index,
  selected,
  handleOpenQuestion,
  onDelete,
  isWaSurvey,
}: DraggableQuestionCardProps) {
  // TODO: ref lost when card is dragged to new place
  const { hovered, ref: hoverRef } = useHover();
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useMantineTheme();

  const questionDeleteMutation = useQuestionDeleteMutation(surveyId, (qId) => {
    onDelete(qId);
  });

  const handleDelete = (e, qId) => {
    e.stopPropagation();
    questionDeleteMutation.mutate(qId);
  };
  return (
    <>
      <ConfirmationModal
        forDeleteFunctionality
        confirmLabel="Delete"
        headerLabel="Are you sure to delete this question?"
        headerTitle="Delete question?"
        opened={dialogOpened}
        onClose={closeDialog}
        onConfirm={(e) => {
          e.stopPropagation();
          handleDelete(e, question.id);
        }}
      />
      <Draggable key={question.id} index={index} draggableId={question.id}>
        {(provided, snapshot) => (
          <div ref={hoverRef}>
            <Box
              className={cx(classes.item, {
                [classes.itemDragging]: snapshot.isDragging,
              })}
              ref={provided.innerRef}
              onClick={() => handleOpenQuestion(question)}
              {...provided.draggableProps}
              style={{
                backgroundColor: selected ? "var(--light-grey-color)" : "white",
                ...provided.draggableProps.style,
              }}
            >
              <div {...provided.dragHandleProps} className={classes.dragHandle}>
                <IconGripVertical size={20} stroke={1.5} />
              </div>
              <Badge
                style={{ minWidth: "30px" }}
                c={"white"}
                variant={selected ? "filled" : "filled"}
              >
                {index + 1}
              </Badge>
              {/* TODO: add truncate and make height fixed*/}
              <Text
                pl="xs"
                fw={500}
                px="md"
                maw={
                  question?.logic?.length && question?.googleReview
                    ? "60%"
                    : question?.logic?.length || question?.googleReview
                    ? "70%"
                    : "90%"
                }
                truncate
              >
                {question.title[selectedLanguage] ||
                  question.description[selectedLanguage]}
              </Text>
              <Group
                justify={"flex-end"}
                gap={"xs"}
                ml={"xs"}
                style={{ position: "absolute", right: "5px" }}
              >
                {question?.logic?.length && (
                  <Image
                    src={
                      isWaSurvey == true
                        ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`
                        : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`
                    }
                    width={30}
                    height={30}
                    fit="contain"
                  />
                )}
                {question.googleReview && (
                  <Box mr={"6px"}>
                    <IconBrandGoogle
                      color={
                        isWaSurvey == true
                          ? theme.colors["whatsapp-green"][6]
                          : "var(--tertiary-color)"
                      }
                      stroke={4}
                      size={"1rem"}
                    />
                  </Box>
                )}
                <ActionIcon
                  onClick={() => {
                    closeDialog();
                    toggle();
                  }}
                  variant="subtle"
                  color="gray"
                >
                  <IconTrash />
                </ActionIcon>
              </Group>
            </Box>
          </div>
        )}
      </Draggable>
    </>
  );
}
