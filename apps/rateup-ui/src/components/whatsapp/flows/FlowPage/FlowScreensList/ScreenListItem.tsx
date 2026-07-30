import { Draggable, Droppable } from "@hello-pangea/dnd";
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
import { useParams } from "@tanstack/react-router";
import classNames from "classnames/bind";
import { useId, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useReplaceQuestionsMutation } from "@/backend/surveys/questions/questions.query";
import { usePushToWaMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { FlowMaxElementsPerScreen, FlowMaxScreens } from "@/components/whatsapp/whatsappConfig.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import type { QuestionType } from "@/types/enums.ts";
import { WaFlowFormElementType, WaFlowStatus } from "@/types/enums.ts";
import type { WaFlowFormElement, WaFlowScreen } from "@/types/global";
import { FlowChoiceQuestions } from "@/utils/constants.ts";
import {
  getFlowElementText,
  getFlowFooterElementsFromScreen,
  getFlowFormElementsFromScreen,
  getFormObjFromScreenId,
  getQuestionsFromScreen,
  getScreenObjById,
  updateFlowJsonNavigationAndDataPassing,
} from "@/utils/whatsapp/flow.utils";

import SortDrawerFlow from "../../sortDrawer/SortDrawerFlow.tsx";
import { EditFlowContext } from "../EditFlow/EditFlowContext.ts";

import dndClasses from "../../../../Survey/Question/DraggableQuestionCard/DraggableQuestionCard.module.css";
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
  const uid = useId();
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
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const replaceQuestionsMutation = useReplaceQuestionsMutation(survey.id);
  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;
  const confirm = useConfirm();
  const [isOpen, { open, close }] = useDisclosure(false);
  const screenTitleInputRef = useRef<HTMLInputElement | null>(null);
  const footerLabelInputRef = useRef<HTMLInputElement | null>(null);
  const elements = getFlowFormElementsFromScreen(
    flowJson?.screens?.[pageNo],
  ) as WaFlowFormElement[];
  const footerElement = getFlowFooterElementsFromScreen(screen)?.[0] as WaFlowFormElement;
  const { t: translations } = useTranslation();
  const [screenTitleInputState, setScreenTitleInputState] = useState(screen?.title);
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

  const handleDeleteScreen = async () => {
    if (!flowEditable) return;

    const shouldDelete = await confirm({
      title: translations("Delete Screen?"),
      description: translations(
        "Are you sure you want to delete this Screen? It will also delete all the elements in this screen.",
      ),
      confirmText: translations("Delete"),
    });

    if (!shouldDelete) return;

    setSelectedFormElementId(null);
    updateFlowJson((draft) => {
      const questions = getQuestionsFromScreen(screen, survey, map);
      const qIds = questions?.map((q) => q.id);
      const updatedQuestions = survey.questions.filter((q) => !qIds?.includes(q.id));

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
    const feNames = getFlowFormElementsFromScreen(screen, true)?.map((fe) => fe.name);
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
    const elements = getFlowFormElementsFromScreen(screen) as WaFlowFormElement[];
    if (elements?.length >= FlowMaxElementsPerScreen) {
      toast.error(`Maximum ${FlowMaxElementsPerScreen} elements allowed per screen`);
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

  function handleScreenTitleInputChange(e: ChangeEvent<HTMLInputElement>) {
    setScreenTitleInputState(e.target.value);
  }

  function handleScreenTitleInputBlur() {
    updateScreenTitle(screenTitleInputState);
  }

  function handleFooterLabelInputChange(e: ChangeEvent<HTMLInputElement>) {
    setFooterLabelInputState(e.target.value);
  }

  function handleFooterLabelInputBlur() {
    if (!flowEditable) return;
    updateFlowJson((draft) => {
      const formEl = getFormObjFromScreenId(draft.screens, screen.id);
      const footer = formEl?.children.filter((data) => data.type === "Footer")?.[0];
      footer.label = footerLabelInputState;
    });
  }
  const handleSaveJsonToWa = () => {
    const errorMessages = [];
    for (const flScreen of flowJson?.screens ?? []) {
      const questions = getQuestionsFromScreen(flScreen, survey, map);
      for (const qs of questions) {
        if (FlowChoiceQuestions.includes(qs.type as QuestionType)) {
          const choice = Object.values(qs?.choices ?? {})?.[0];
          if (!choice || (typeof choice === "string" && choice?.length === 0)) {
            const title = Object.values(qs?.title ?? {})?.[0];
            const label = Object.values(qs?.label ?? {})?.[0];
            errorMessages.push(title || label);
          }
        }
      }
    }
    if (errorMessages.length > 0) {
      errorMessages?.map((error) => toast.error(`Atleast one choice in ${error} question needed`));
    } else {
      pushToWaMutation.mutate(dbFlowId);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between p-2" key={screen?.id}>
      {!screen ? (
        <div className="flex h-full cursor-pointer flex-col items-center justify-center">
          <CustomTooltip
            trigger={
              <div className="flex flex-col items-center" onClick={handleCreateScreenClick}>
                <IconPlus size={30} />
                <Button size="lg" className="mt-6" disabled={!flowEditable}>
                  {translations("Add Screen")}
                </Button>
              </div>
            }
            content={<span>{translations("Add Screen")}</span>}
          />
        </div>
      ) : (
        <>
          <div className="max-h-[85%]">
            <Field
              className={`flex items-center gap-1.5 ${styles["screen-title-input-and-chevrons-container"]}`}
            >
              <CustomTooltip
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mt-7 rounded-full"
                    onClick={handlers.decrement}
                    disabled={pageNo === 0}
                  >
                    <IconChevronLeft size={20} />
                  </Button>
                }
                content={<span>{translations("Previous Screen")}</span>}
              />

              <Field className={`flex flex-1 flex-col gap-1 ${styles["text-input"]}`}>
                <FieldLabel htmlFor={`${uid}-field`}>{`Screen ${pageNo + 1}`}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id={`${uid}-field`}
                    ref={screenTitleInputRef}
                    value={screenTitleInputState}
                    onChange={handleScreenTitleInputChange}
                    readOnly={!flowEditable}
                    placeholder={translations(
                      "Section title (Required if more than one section is added)",
                    )}
                    onBlur={handleScreenTitleInputBlur}
                    onKeyUp={(e) => {
                      if (e.code === "Enter") {
                        screenTitleInputRef.current?.blur();
                      }
                    }}
                  />
                  {flowEditable && (
                    <InputGroupAddon align="inline-end">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => screenTitleInputRef.current?.focus()}
                      >
                        <IconPencil size={20} />
                      </Button>
                    </InputGroupAddon>
                  )}
                </InputGroup>
              </Field>

              <CustomTooltip
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mt-7 rounded-full"
                    onClick={handlers.increment}
                    disabled={pageNo === flowJson?.screens?.length - 1}
                  >
                    <IconChevronRight size={20} />
                  </Button>
                }
                content={<span>{translations("Next Screen")}</span>}
              />
            </Field>
            <div className="mx-6 mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CustomTooltip
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleCreateScreenClick}
                      disabled={!flowEditable}
                    >
                      <IconPlus />
                    </Button>
                  }
                  content={<span>{translations("Add Screen")}</span>}
                />
                {flowEditable && (
                  <>
                    <CustomTooltip
                      trigger={
                        <Button variant="ghost" size="icon-sm" onClick={handleDeleteScreen}>
                          <IconTrash size={20} />
                        </Button>
                      }
                      content={<span>{translations("Delete Screen")}</span>}
                    />
                    <CustomTooltip
                      trigger={
                        <Button variant="ghost" size="icon-sm" onClick={open}>
                          <IconReplace size={20} />
                        </Button>
                      }
                      content={<span>{translations("Swap order of screens")}</span>}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <CustomTooltip
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleSaveJsonToWa}
                      disabled={!dbFlow?.pendingSave || pushToWaMutation.isPending}
                    >
                      {pushToWaMutation.isPending ? <Spinner /> : <IconDeviceFloppy size={22} />}
                    </Button>
                  }
                  content={
                    <span>
                      {dbFlow?.pendingSave
                        ? translations(
                            "Save your flow to WhatsApp, so that you can test or share draft version before publishing.",
                          )
                        : translations("No changes to save")}
                    </span>
                  }
                />
                <p className="text-muted-foreground">{`${flowJson.screens.length}/${FlowMaxScreens}`}</p>
              </div>
            </div>
            <ScrollArea className="max-h-[88%]">
              <Droppable droppableId={screen?.id} direction="vertical">
                {(provided) => (
                  <div
                    className="flex flex-col gap-0 px-2 pt-6"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {elements?.map((element, index) => {
                      if (element.type === WaFlowFormElementType.footer) return;
                      return (
                        <DraggableFormElementCard
                          fe={element}
                          key={element.id}
                          text={getFlowElementText(element, survey.questions, map)}
                          screen={screen.id}
                          selected={selectedFormElementId === element.id}
                          index={index}
                          handleOpen={handleElementClick}
                          handleDelete={handleDeleteFormElement}
                        />
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <div className="m-4 flex">
                <Button className="w-full" onClick={handleAddElementClick}>
                  {translations("Add Element")}
                  <IconPlus />
                </Button>
              </div>
            </ScrollArea>
          </div>
          <div className="mt-4 flex w-full gap-2">
            <div className="flex w-full flex-col items-center gap-1">
              <div className={cx("text-input", "footer-label-input") + " w-full"}>
                <InputGroup>
                  <InputGroupInput
                    ref={footerLabelInputRef}
                    value={footerLabelInputState}
                    onChange={handleFooterLabelInputChange}
                    readOnly={!flowEditable}
                    placeholder={translations("Next button text")}
                    onBlur={handleFooterLabelInputBlur}
                    onKeyUp={(e) => {
                      if (e.code === "Enter") {
                        footerLabelInputRef.current?.blur();
                      }
                    }}
                  />
                  {flowEditable && (
                    <InputGroupAddon align="inline-end">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => footerLabelInputRef.current?.focus()}
                      >
                        <IconPencil size={20} />
                      </Button>
                    </InputGroupAddon>
                  )}
                </InputGroup>
              </div>
              <p className="text-xs">{translations("Next button text")}</p>
            </div>
          </div>
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
    </div>
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
function DraggableFormElementCard(props: Readonly<Omit<FormElementCardProps, "dragHandleProps">>) {
  return (
    <Draggable key={props.fe.id} index={props.index} draggableId={props.fe.id}>
      {(provided, _snapshot) => (
        <div
          {...provided.draggableProps}
          ref={provided.innerRef}
          style={provided.draggableProps.style as CSSProperties}
        >
          <FormElementCard {...props} dragHandleProps={provided.dragHandleProps} />
        </div>
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
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);

  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;

  return (
    <div
      onClick={() => handleOpen(index)}
      className={`${dndClasses.item} ${selected ? "bg-muted" : "bg-background"}`}
    >
      <div className="flex h-full items-center" {...dragHandleProps}>
        <IconGripVertical size={20} stroke={1.5} />
      </div>
      <Badge className="min-w-7.5 justify-center">{index + 1}</Badge>
      <p className="line-clamp-2 flex-1 px-2 font-medium">{text}</p>
      {Object.keys(dbFlow?.logicJumps).includes(screen) && (
        <img
          src={`${import.meta.env.VITE_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
          className="h-7.5 w-7.5 object-contain"
          alt="image of logic jump"
        />
      )}
      {flowEditable && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="me-2 text-muted-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDelete(index);
          }}
        >
          <IconTrash />
        </Button>
      )}
    </div>
  );
}

export default ScreenListItem;
