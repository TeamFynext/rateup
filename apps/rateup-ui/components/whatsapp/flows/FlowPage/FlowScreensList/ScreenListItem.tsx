import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Group,
  Image,
  ScrollAreaAutosize,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useCounter, useDisclosure } from "@mantine/hooks";
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

import {
  QuestionType,
  WaFlowFormElementType,
  WaFlowStatus,
} from "@/types/enums";
import { WaFlowFormElement, WaFlowScreen } from "@/types/global";
import { useReplaceQuestionsMutation } from "@/backend/surveys/questions/questions.query";
import {
  usePushToWaMutation,
  useWaFlowFromDb,
} from "@/backend/whatsapp/flow/flow.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import {
  FlowMaxElementsPerScreen,
  FlowMaxScreens,
} from "@/components/whatsapp/whatsappConfig";
import useTranslations from "@/dictionaries/useTranslation";
import { FlowChoiceQuestions } from "@/utils/constants";
import { showErrorToast } from "@/utils/notifications";
import {
  getFlowElementText,
  getFlowFooterElementsFromScreen,
  getFlowFormElementsFromScreen,
  getFormObjFromScreenId,
  getQuestionsFromScreen,
  getScreenObjById,
  updateFlowJsonNavigationAndDataPassing,
} from "@/utils/whatsapp/flow.utils";

import dndClasses from "../../../../Survey/Question/DraggableQuestionCard/DraggableQuestionCard.module.css";
import SortDrawerFlow from "../../sortDrawer/SortDrawerFlow";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
import styles from "./ScreenListIem.module.css";

const cx = classNames.bind(styles);

interface ScreenListItemProps {
  screen: WaFlowScreen;
  onAddElementClick: (screenId: string) => void;
  onElementClick: (feId: string, screenId: string) => void;
  onDeleteElement: (feId: string, screenId: string) => void;
  handleCreateScreenClick: () => void;
  pageNo: number;
  handlers: {
    readonly increment: () => void;
    readonly decrement: () => void;
    readonly set: (value: number) => void;
    readonly reset: () => void;
  };
}
function ScreenListItem({
  screen,
  onAddElementClick,
  onElementClick,
  onDeleteElement,
  handleCreateScreenClick,
  pageNo,
  handlers,
}: Readonly<ScreenListItemProps>) {
  const {
    survey,
    flowJson,
    updateFlowJson,
    map,
    updateMap,
    selectedFormElementId,
    setSelectedFormElementId,
    updateSurvey,
    setScreenNumber,
  } = useContext(EditFlowContext);
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const replaceQuestionsMutation = useReplaceQuestionsMutation(survey.id);
  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isOpen, { open, close }] = useDisclosure(false);
  const elements = getFlowFormElementsFromScreen(
    flowJson?.screens?.[pageNo],
  ) as WaFlowFormElement[];
  const footerElement = getFlowFooterElementsFromScreen(
    screen,
  )?.[0] as WaFlowFormElement;
  const { translations } = useTranslations();
  const [screenTitleInputState, setScreenTitleInputState] = useState(
    screen?.title,
  );
  const [footerLabelInputState, setFooterLabelInputState] = useState(
    footerElement?.label ?? "Next",
  );
  const pushToWaMutation = usePushToWaMutation();

  useEffect(() => {
    if (flowJson?.screens) {
      setScreenNumber(pageNo);
      setFooterLabelInputState(footerElement?.label ?? "Next");
    }
  }, [flowJson?.screens, pageNo]);

  useEffect(() => {
    setScreenTitleInputState(screen?.title);
  }, [screen]);

  const handleDeleteScreen = () => {
    if (!flowEditable) return;
    setSelectedFormElementId(null);
    updateFlowJson((draft) => {
      const questions = getQuestionsFromScreen(screen, survey, map);
      const qIds = questions?.map((q) => q.id);
      const updatedQuestions = survey.questions.filter(
        (q) => !qIds.includes(q.id),
      );

      replaceQuestionsMutation.mutate({
        questions: updatedQuestions,
        screenId: screen.id,
      });
      updateSurvey((draft) => {
        draft.questions = updatedQuestions;
      });
      const screenIndex = draft.screens.findIndex((s) => s.id === screen.id);
      draft.screens.splice(screenIndex, 1);
      updateFlowJsonNavigationAndDataPassing(draft, dbFlow);
    });
    handlers.decrement();
    const feNames = getFlowFormElementsFromScreen(screen, true)?.map(
      (fe) => fe.name,
    );
    updateMap((draft) => {
      for (const feName of feNames || []) {
        delete draft[feName];
      }
    });
  };

  if (!survey) return null;

  function updateScreenTitle(title: string) {
    if (!flowEditable) return;
    updateFlowJson((draft) => {
      const screenToBeEdited = getScreenObjById(draft.screens, screen.id);
      screenToBeEdited["title"] = title;
    });
  }

  function handleAddElementClick() {
    if (!flowEditable) return;
    const elements = getFlowFormElementsFromScreen(
      screen,
    ) as WaFlowFormElement[];
    if (elements?.length >= FlowMaxElementsPerScreen) {
      showErrorToast(
        `Maximum ${FlowMaxElementsPerScreen} elements allowed per screen`,
      );
    } else {
      onAddElementClick(screen.id);
    }
  }

  function handleDeleteFormElement(index: number) {
    if (!flowEditable) return;
    const element = elements[index];
    onDeleteElement(element.id, screen.id);
  }

  function handleElementClick(index: number) {
    const element = elements[index];
    onElementClick(element.id, screen.id);
  }

  function handleScreenTitleInputChange(e) {
    setScreenTitleInputState(e.target.value);
  }

  function handleScreenTitleInputBlur() {
    updateScreenTitle(screenTitleInputState);
  }

  function handleFooterLabelInputChange(e) {
    setFooterLabelInputState(e.target.value);
  }

  function handleFooterLabelInputBlur() {
    if (!flowEditable) return;
    updateFlowJson((draft) => {
      const formEl = getFormObjFromScreenId(draft.screens, screen.id);
      const footer = formEl.children.filter(
        (data) => data.type === "Footer",
      )?.[0];
      footer.label = footerLabelInputState;
    });
  }
  const handleSaveJsonToWa = () => {
    let errorMessages = [];
    for (const flScreen of flowJson?.screens) {
      const questions = getQuestionsFromScreen(flScreen, survey, map);
      for (const qs of questions) {
        if (FlowChoiceQuestions.includes(qs.type as QuestionType)) {
          let choice = Object.values(qs?.choices ?? {})?.[0];
          if (!choice || (typeof choice === "string" && choice.length === 0)) {
            let title = Object.values(qs?.title ?? {})?.[0];
            let label = Object.values(qs?.label ?? {})?.[0];
            errorMessages.push(title || label);
          }
        }
      }
    }
    if (errorMessages.length > 0) {
      errorMessages?.map((error) =>
        showErrorToast(`Atleast one choice in ${error} question needed`),
      );
    } else {
      pushToWaMutation.mutate(dbFlowId);
    }
  };

  const screenTitleInputRef = useRef(null);
  const footerLabelInputRef = useRef(null);

  return (
    <Stack p="xs" key={screen?.id} justify="space-between" h={"100%"}>
      {!screen ? (
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
                  onClick={handlers.decrement}
                  radius={"lg"}
                  disabled={pageNo === 0}
                  mt={28}
                >
                  <IconChevronLeft size={20} />
                </ActionIcon>
              </Tooltip>

              {/* <EditableText
                label={`Screen ${pageNo + 1}`}
                text={screen.title}
                setText={updateScreenTitle}
                id={screen.title}
                editMode={flowEditable && editingItem === screen.title}
                setEditingItem={setEditingItem}
                placeholder="Section title (Required if more than one section is added)"
                style={{
                  flex: 1,
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                }}
              /> */}

              <TextInput
                ref={screenTitleInputRef}
                className={styles["text-input"]}
                label={`Screen ${pageNo + 1}`}
                value={screenTitleInputState}
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
                  onClick={handlers.increment}
                  radius={"lg"}
                  disabled={pageNo === flowJson?.screens?.length - 1}
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
                    dbFlow.pendingSave
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
                    disabled={!dbFlow.pendingSave}
                  >
                    <IconDeviceFloppy size={22} />
                  </ActionIcon>
                </Tooltip>
                <Text c={"dimmed"}>
                  {`${flowJson.screens.length}/${FlowMaxScreens}`}
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
                    {elements?.map((element, index) => {
                      if (element.type === WaFlowFormElementType.footer) return;
                      return (
                        <DraggableFormElementCard
                          fe={element}
                          key={element.id}
                          text={getFlowElementText(
                            element,
                            survey.questions,
                            map,
                          )}
                          screen={screen.id}
                          selected={selectedFormElementId === element.id}
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
                  onClick={handleAddElementClick}
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
            data={flowJson.screens?.map((data) => ({
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
  fe: WaFlowFormElement;
  text: string;
  selected: boolean;
  index: number;
  handleOpen: (index: number) => void;
  handleDelete: (index: number) => void;
  dragHandleProps?: any;
  screen: string;
}
function DraggableFormElementCard(
  props: Readonly<Omit<FormElementCardProps, "dragHandleProps">>,
) {
  return (
    <Draggable key={props.fe.id} index={props.index} draggableId={props.fe.id}>
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
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);

  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;

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
      {Object.keys(dbFlow.logicJumps).includes(screen) && (
        <Image
          src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
          w={30}
          h={30}
          fit="contain"
          alt="image of logic jump"
        />
      )}
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
