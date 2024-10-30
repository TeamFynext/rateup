import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

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
import { useDisclosure } from "@mantine/hooks";
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

import { QuestionType2 } from "@/types/enums";
import { usePushToWaMutation } from "@/backend/whatsapp/flow/flow.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import useTranslations from "@/dictionaries/useTranslation";

import dndClasses from "../../../Survey/Question/DraggableQuestionCard/DraggableQuestionCard.module.css";
import SortDrawerFlow from "../../flows/sortDrawer/SortDrawerFlow";
import useFlowStore from "../utils/store";
import styles from "./ScreenListIem.module.css";

const cx = classNames.bind(styles);

interface ScreenListItemProps {
  onAddElementClick: (screenId: string) => void;
  onElementClick: (feId: string, screenId: string) => void;
  handleCreateScreenClick: () => void;
  handlers: {
    readonly increment: () => void;
    readonly decrement: () => void;
    readonly set: (value: number) => void;
    readonly reset: () => void;
  };
  pendingSave: boolean;
}
function ScreenListItem({
  onAddElementClick,
  onElementClick,
  handleCreateScreenClick,
  handlers,
  pendingSave,
}: Readonly<ScreenListItemProps>) {
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  // const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;
  const flowEditable = true;
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isOpen, { open, close }] = useDisclosure(false);
  const {
    screens,
    deleteScreen,
    updateScreen,
    updateComponentInScreen,
    deleteComponentFromScreen,
    getCurrentScreen,
    setCurrentScreenId,
  } = useFlowStore();
  const screen = getCurrentScreen();
  const footerElement = screen?.layout.children.find(
    (el) => el.type === QuestionType2.Footer,
  );
  const { translations } = useTranslations();
  const [screenTitleInputState, setScreenTitleInputState] = useState(
    screen?.title,
  );
  const [footerLabelInputState, setFooterLabelInputState] = useState(
    footerElement?.label ?? "Continue",
  );
  const pushToWaMutation = usePushToWaMutation();

  useEffect(() => {
    setScreenTitleInputState(screen?.title);
  }, [screen]);

  const handleDeleteScreen = () => {
    if (!flowEditable) return;
    handlers.decrement();
    deleteScreen();
  };

  function handleDeleteFormElement(index: number) {
    if (!flowEditable) return;
    deleteComponentFromScreen(index);
  }

  function handleElementClick(index: number) {
    const element = screen.layout.children[index];
    onElementClick(element.id, element.type);
  }

  function handleScreenTitleInputChange(e) {
    if (!flowEditable) return;
    setScreenTitleInputState(e.target.value);
  }

  function handleScreenTitleInputBlur() {
    updateScreen({ title: screenTitleInputState });
  }

  function handleFooterLabelInputChange(e) {
    setFooterLabelInputState(e.target.value);
  }

  function handleFooterLabelInputBlur() {
    if (!flowEditable) return;
    updateComponentInScreen(screen.id, {
      label: footerLabelInputState,
    });
  }
  const handleSaveJsonToWa = () => {
    pushToWaMutation.mutate(dbFlowId);
  };

  const screenTitleInputRef = useRef(null);
  const footerLabelInputRef = useRef(null);

  const pageNo = screens.findIndex((s) => s.id === screen.id);
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
          <Tooltip label={translations["Add Screen"]} openDelay={500}>
            <Stack align="center" onClick={handleCreateScreenClick}>
              <IconPlus size={30} />
              <RateupButtonPrimary
                mt={"xl"}
                size="lg"
                title={translations["Add Screen"]}
                disabled={!flowEditable}
              />
            </Stack>
          </Tooltip>
        </Stack>
      ) : (
        <>
          <Box mah={"85%"}>
            {/* <Text w={"100%"}></Text> */}
            <ConfirmationModal
              forDeleteFunctionality
              opened={dialogOpened}
              onClose={closeDialog}
              headerLabel={
                translations[
                  "Are you sure you want to delete this Screen? It will also delete all the elements in this screen."
                ]
              }
              headerTitle={translations["Delete Screen?"]}
              confirmLabel={translations["Delete"]}
              onConfirm={handleDeleteScreen}
            />
            <Group
              gap={5}
              className={styles["screen-title-input-and-chevrons-container"]}
            >
              <Tooltip label={translations["Previous Screen"]}>
                <ActionIcon
                  onClick={() => {
                    setCurrentScreenId(screens?.[pageNo - 1]?.id);
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
                defaultValue={screenTitleInputState}
                onChange={handleScreenTitleInputChange}
                readOnly={!flowEditable}
                placeholder={
                  translations[
                    "Section title (Required if more than one section is added)"
                  ]
                }
                onBlur={handleScreenTitleInputBlur}
                rightSection={
                  flowEditable && (
                    <ActionIcon
                      variant="subtle"
                      onClick={() => screenTitleInputRef.current?.focus()}
                    >
                      <IconPencil size={20} />
                    </ActionIcon>
                  )
                }
                onKeyUp={(e) => {
                  if (e.code === "Enter") {
                    screenTitleInputRef.current?.blur();
                  }
                }}
              />
              <Tooltip label={translations["Next Screen"]}>
                <ActionIcon
                  onClick={() => {
                    setCurrentScreenId(screens?.[pageNo + 1]?.id);
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
                <Tooltip label={translations["Add Screen"]} openDelay={500}>
                  <ActionIcon
                    onClick={handleCreateScreenClick}
                    variant="subtle"
                    disabled={!flowEditable}
                  >
                    <IconPlus />
                  </ActionIcon>
                </Tooltip>
                {flowEditable && (
                  <>
                    <Tooltip label={translations["Delete Screen"]}>
                      <ActionIcon onClick={toggle} variant="subtle">
                        <IconTrash size={20} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip
                      label={translations["Swap order of screens"]}
                      openDelay={500}
                    >
                      <ActionIcon onClick={open} variant={"subtle"} size={20}>
                        <IconReplace size={20} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                )}
              </Group>
              <Group>
                <Tooltip
                  label={
                    pendingSave
                      ? translations[
                          "Save your flow to WhatsApp, so that you can test or share draft version before publishing."
                        ]
                      : translations["No changes to save"]
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
                  {/* {`${flowJson.screens.length}/${FlowMaxScreens}`} */}
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
                          text={element.label}
                          screen={screen.id}
                          selected={false}
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
                  title={translations["Add Element"]}
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
                value={footerLabelInputState}
                onChange={handleFooterLabelInputChange}
                readOnly={!flowEditable}
                placeholder={translations["Next button text"]}
                onBlur={handleFooterLabelInputBlur}
                rightSection={
                  flowEditable && (
                    <ActionIcon
                      variant="subtle"
                      onClick={() => footerLabelInputRef.current?.focus()}
                    >
                      <IconPencil size={20} />
                    </ActionIcon>
                  )
                }
                onKeyUp={(e) => {
                  if (e.code === "Enter") {
                    footerLabelInputRef.current?.blur();
                  }
                }}
              />
              <Text fz={"xs"}>{translations["Next button text"]}</Text>
            </Stack>
          </Flex>
          <SortDrawerFlow
            close={close}
            data={[]?.map((data) => ({
              id: data.id,
              name: data.title,
            }))}
            opened={isOpen}
          />
        </>
      )}
    </Stack>
  );
}

interface FormElementCardProps {
  feId: string;
  text: string;
  selected: boolean;
  index: number;
  handleOpen: (index: number) => void;
  handleDelete: (index: number) => void;
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

// maybe give a name for all text and then remove when uploading to whatsap
function FormElementCard({
  text,
  selected,
  index,
  handleOpen,
  handleDelete,
  screen,
  dragHandleProps,
}: Readonly<FormElementCardProps>) {
  const flowEditable = true;

  return (
    <Box
      onClick={() => handleOpen(index)}
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
        {index + 1}
      </Badge>
      <Text px="xs" fw={500} style={{ flex: 1 }} lineClamp={2}>
        {text}
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
      {flowEditable && (
        <ActionIcon
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDelete(index);
          }}
          variant="subtle"
          color="gray"
          me={"xs"}
        >
          <IconTrash />
        </ActionIcon>
      )}
    </Box>
  );
}

export default ScreenListItem;
