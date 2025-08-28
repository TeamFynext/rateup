"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Group,
  ScrollAreaAutosize,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDeviceFloppy,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconReplace,
  IconTrash,
} from "@tabler/icons-react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import classNames from "classnames/bind";
import { useTranslations } from "next-intl";

import { QuestionType2 } from "@/types/enums";
import { usePushToWaMutation } from "@/backend/whatsapp/flow/flow.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";

import dndClasses from "../../../Survey/Question/DraggableQuestionCard/DraggableQuestionCard.module.css";
import SortDrawerFlow from "../../flows/sortDrawer/SortDrawerFlow";
import { FlowMaxScreens } from "../../whatsappConfig";
import useFlowStore, { EditFlowRightPanel } from "../utils/store";
import styles from "./ScreenListIem.module.css";

const cx = classNames.bind(styles);

interface ScreenListItemProps {
  handleCreateScreenClick: () => void;
  pendingSave: boolean;
}
function ScreenListItem({
  handleCreateScreenClick,
  pendingSave,
}: Readonly<ScreenListItemProps>) {
  const params = useParams();
  const dbFlowId = params.dbFlowId as string;

  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isOpen, { open, close }] = useDisclosure(false);
  const screenTitleInputRef = useRef(null);
  const footerLabelInputRef = useRef(null);
  const {
    screens,
    deleteScreen,
    updateScreen,
    updateComponentInScreen,
    deleteComponentFromScreen,
    getCurrentScreen,
    setCurrentScreenId,
    setCurrentElement,
    setActiveEditor,
    ticketIssued,
    setTicketIssued,
  } = useFlowStore();
  const screen = getCurrentScreen();
  const footerElement = screen?.layout.children.find(
    (el) => el.type === QuestionType2.Footer,
  );
  const [footerLabel, setFooterLabel] = useDebouncedState(
    footerElement?.label ?? "Continue",
    200,
  );

  const translations = useTranslations();
  const [screenTitleInputState, setScreenTitleInputState] = useState(
    screen?.title,
  );
  const pushToWaMutation = usePushToWaMutation();

  useEffect(() => {
    setScreenTitleInputState(screen?.title);
  }, [screen]);

  const handleDeleteScreen = () => {
    deleteScreen();
  };

  function handleDeleteFormElement(feId: string) {
    deleteComponentFromScreen(feId);
    const elementTicket = ticketIssued.find((t) => t.questionId === feId);
    if (elementTicket) {
      setTicketIssued(ticketIssued.filter((t) => t.questionId !== feId));
    }
  }

  function handleElementClick(feId: string, feType: QuestionType2) {
    setCurrentElement(feId, QuestionType2[feType]);
  }
  const onAddElementClick = () => {
    setActiveEditor(EditFlowRightPanel.TypeSelection);
  };

  function handleScreenTitleInputChange(e) {
    setScreenTitleInputState(e.target.value);
  }

  function handleScreenTitleInputBlur() {
    updateScreen({ title: screenTitleInputState });
  }

  function handleFooterLabelInputBlur() {
    updateComponentInScreen("slfkdj", {
      label: footerLabel,
    });
  }
  const handleSaveJsonToWa = () => {
    pushToWaMutation.mutate(dbFlowId);
  };

  const pageNo = screens.findIndex((s) => s.id === screen?.id);
  return (
    <Stack p="xs" key={screen?.id} justify="space-between" h={"100%"}>
      {screens?.length === 0 ? (
        <Stack
          h={"100%"}
          align="center"
          justify="center"
          style={{
            cursor: "pointer",
          }}
        >
          <Tooltip label={translations("Add Screen")} openDelay={500}>
            <Stack align="center" onClick={handleCreateScreenClick}>
              <IconPlus size={30} />
              <RateupButtonPrimary
                mt={"xl"}
                size="lg"
                title={translations("Add Screen")}
              />
            </Stack>
          </Tooltip>
        </Stack>
      ) : (
        <>
          <Box mah={"85%"}>
            <ConfirmationModal
              forDeleteFunctionality
              opened={dialogOpened}
              onClose={closeDialog}
              headerLabel={translations(
                "Are you sure you want to delete this Screen? It will also delete all the elements in this screen",
              )}
              headerTitle={translations("Delete Screen?")}
              confirmLabel={translations("Delete")}
              onConfirm={handleDeleteScreen}
            />
            <Group
              gap={5}
              className={styles["screen-title-input-and-chevrons-container"]}
            >
              <Tooltip label={translations("Previous Screen")}>
                <ActionIcon
                  onClick={() => {
                    setCurrentScreenId(screens?.[pageNo - 1]?.id);
                    setCurrentElement(null, null);
                  }}
                  radius={"lg"}
                  disabled={pageNo === 0}
                  mt={28}
                >
                  <IconChevronLeft size={20} />
                </ActionIcon>
              </Tooltip>
              <TextInput
                ref={screenTitleInputRef}
                className={styles["text-input"]}
                label={`Screen ${pageNo + 1}`}
                value={screenTitleInputState ?? ""}
                onChange={handleScreenTitleInputChange}
                placeholder={translations(
                  "Section title (Required if more than one section is added)",
                )}
                onBlur={handleScreenTitleInputBlur}
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    onClick={() => screenTitleInputRef.current?.focus()}
                  >
                    <IconPencil size={20} />
                  </ActionIcon>
                }
                onKeyUp={(e) => {
                  if (e.code === "Enter") {
                    screenTitleInputRef.current?.blur();
                  }
                }}
              />
              <Tooltip label={translations("Next Screen")}>
                <ActionIcon
                  onClick={() => {
                    setCurrentScreenId(screens?.[pageNo + 1]?.id);
                    setCurrentElement(null, null);
                  }}
                  radius={"lg"}
                  disabled={pageNo === screens?.length - 1}
                  mt={28}
                >
                  <IconChevronRight size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Group mx={"xl"} justify="space-between" mt={"xs"}>
              <Group gap={4}>
                <Tooltip label={translations("Add Screen")} openDelay={500}>
                  <ActionIcon
                    onClick={handleCreateScreenClick}
                    variant="subtle"
                  >
                    <IconPlus />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={translations("Delete Screen")}>
                  <ActionIcon onClick={toggle} variant="subtle">
                    <IconTrash size={20} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip
                  label={translations("Swap order of screens")}
                  openDelay={500}
                >
                  <ActionIcon onClick={open} variant={"subtle"} size={20}>
                    <IconReplace size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Group>
                <Tooltip
                  label={
                    pendingSave
                      ? translations("Save your flow to WhatsApp")
                      : translations("No changes to save")
                  }
                >
                  <ActionIcon
                    onClick={handleSaveJsonToWa}
                    loading={pushToWaMutation.isPending}
                    variant={"subtle"}
                    size={20}
                    disabled={!pendingSave}
                  >
                    <IconDeviceFloppy size={22} />
                  </ActionIcon>
                </Tooltip>
                <Text c={"dimmed"}>
                  {`${screens.length}/${FlowMaxScreens}`}
                </Text>
              </Group>
            </Group>
            <ScrollAreaAutosize mah={"88%"}>
              <Droppable droppableId={screen?.id} direction="vertical">
                {(provided) => (
                  <Stack
                    pt="lg"
                    px={"xs"}
                    gap={0}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {screen?.layout.children?.map((element, index) => {
                      if (element.type === QuestionType2.Footer) return;
                      return (
                        <DraggableFormElementCard
                          feId={element.id}
                          key={element.id}
                          text={
                            element.header ||
                            element.label ||
                            element?.text ||
                            element.type?.toUpperCase()
                          }
                          screen={screen.id}
                          selected={false}
                          feType={element.metaType}
                          index={index}
                          handleOpen={handleElementClick}
                          handleDelete={handleDeleteFormElement}
                        />
                      );
                    })}
                    {provided.placeholder}
                  </Stack>
                )}
              </Droppable>
              <Group m={"md"}>
                <RateupButtonPrimary
                  title={translations("Add Element")}
                  rightIcon={<IconPlus />}
                  onClick={onAddElementClick}
                  fullWidth
                />
              </Group>
            </ScrollAreaAutosize>
          </Box>
          <Flex w={"100%"} mt={"md"} gap={"xs"}>
            <Stack align="center" w={"100%"} gap={4}>
              <TextInput
                ref={footerLabelInputRef}
                className={cx("text-input", "footer-label-input")}
                defaultValue={footerLabel}
                onChange={(event) => setFooterLabel(event.currentTarget.value)}
                placeholder={translations("Next button text")}
                onBlur={handleFooterLabelInputBlur}
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    onClick={() => footerLabelInputRef.current?.focus()}
                  >
                    <IconPencil size={20} />
                  </ActionIcon>
                }
                onKeyUp={(e) => {
                  if (e.code === "Enter") {
                    footerLabelInputRef.current?.blur();
                  }
                }}
              />
              <Text fz={"xs"}>{translations("Next button text")}</Text>
            </Stack>
          </Flex>
          <SortDrawerFlow
            close={close}
            data={screens?.map((data) => ({
              id: data.id,
              name: data.title,
            }))}
            opened={isOpen}
            v={2}
          />
        </>
      )}
    </Stack>
  );
}

interface FormElementCardProps {
  feId: string;
  feType: string;
  text: string;
  selected: boolean;
  index: number;
  handleOpen: (feId: string, feType: string) => void;
  handleDelete: (feId: string) => void;
  dragHandleProps?: any;
  screen: string;
}
export function DraggableFormElementCard(
  props: Readonly<Omit<FormElementCardProps, "dragHandleProps">>,
) {
  return (
    <Draggable key={props.feId} index={props.index} draggableId={props.feId}>
      {(provided, snapshot) => (
        <Box {...provided.draggableProps} ref={provided.innerRef}>
          <FormElementCard
            {...props}
            dragHandleProps={provided.dragHandleProps}
          />
        </Box>
      )}
    </Draggable>
  );
}
export function markdownToPlainText(markdown) {
  return markdown
    .replace(/[#_*~>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`{1,3}.*?`{1,3}/g, "");
}

// maybe give a name for all text and then remove when uploading to whatsap
function FormElementCard({
  text,
  selected,
  index,
  handleOpen,
  handleDelete,
  screen,
  feId,
  feType,
  dragHandleProps,
}: Readonly<FormElementCardProps>) {
  const [dialogOpened, { toggle, close }] = useDisclosure(false);
  const translations = useTranslations();
  return (
    <Box
      onClick={() => handleOpen(feId, feType)}
      style={{
        backgroundColor: selected
          ? "light-dark(var(--light-grey-color),var(--mantine-color-dark-7))"
          : "var(--mantine-body-color)",
      }}
      className={dndClasses.item}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
        {...dragHandleProps}
      >
        <IconGripVertical size={20} stroke={1.5} />
      </div>
      <Badge style={{ minWidth: "30px" }} c={"white"} variant={"filled"}>
        {index}
      </Badge>
      <Text
        px="xs"
        fw={500}
        flex={1}
        lineClamp={2}
        style={{ wordBreak: "break-word" }}
      >
        {markdownToPlainText(text)}
      </Text>
      {/* {Object.keys(dbFlow.logicJumps).includes(screen) && (
        <Image
          src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
          w={30}
          h={30}
          fit="contain"
          alt="image of logic jump"
        />
      )} */}
      <ActionIcon
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        variant="subtle"
        color="gray"
        me={"xs"}
      >
        <IconTrash />
      </ActionIcon>
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={close}
        headerLabel={translations(
          "Are you sure you want to delete this question? Deleting it will also remove the associated responses",
        )}
        headerTitle={translations("Delete Question?")}
        confirmLabel={translations("Delete")}
        onConfirm={(e) => {
          handleDelete(feId);
          close();
        }}
      />
    </Box>
  );
}

export default ScreenListItem;
