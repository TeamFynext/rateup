import { useState } from "react";
import { useRouter } from "next/router";

import { ActionIcon, Box, Tooltip } from "@mantine/core";
import { IconEye, IconEyeClosed } from "@tabler/icons-react";

import { QuestionType2, WaFlowStatus } from "@/types/enums";
import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "@/backend/whatsapp/flow/flow.query";
import { FlowQuestionTypes2 } from "@/utils/constants";
import { showErrorToast } from "@/utils/notifications";

import styles from "./EditFlow.module.css";
import { FlowQuestionDetailedView } from "./FlowQuestionDetailedView";
import FlowScreensList from "./FlowScreensList";
import { QuestionTypeSelection } from "./QuestionTypeSelection";
import useFlowStore from "./utils/store";

enum EditFlowRightPanel {
  ElementEditor = "element-editor",
  TypeSelection = "type-selection",
}
function EditFlow() {
  const [previewOpened, setPreviewOpened] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<{
    type: QuestionType2;
    id: string;
  }>(null);
  const [activeEditor, setActiveEditor] = useState<EditFlowRightPanel>(null);

  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);

  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;
  const { getCurrentScreen, getScreens } = useFlowStore();
  const updateFlow = useUpdateFlowMutation();

  function handleNewQuestionCreated({
    type,
    id,
  }: {
    type: QuestionType2;
    id: string;
  }) {
    setSelectedQuestion({ type: QuestionType2?.[type], id });
    updateFlow.mutate({
      dbFlowId,
      data: {
        json: { screens: getScreens() as any },
      },
    });
  }

  const handleTypeSelection = (type: QuestionType2) => {
    const screenToBeEdited = getCurrentScreen();
    let formElementChildren = screenToBeEdited.layout.children;
    if (formElementChildren.length > 50)
      return showErrorToast(
        "Only 50 components in a screen",
        "error-max-screen-elements",
      );

    if (
      [QuestionType2.DocumentPicker, QuestionType2.PhotoPicker].includes(
        type as QuestionType2,
      ) &&
      formElementChildren.find((c) => c.type === type)
    ) {
      return showErrorToast(
        `Only one ${type} allowed per screen`,
        "error-max-screen-elements",
      );
    } else if (
      [QuestionType2.DocumentPicker, QuestionType2.PhotoPicker].includes(
        type as QuestionType2,
      ) &&
      formElementChildren.some((child) =>
        [QuestionType2.PhotoPicker, QuestionType2.DocumentPicker].includes(
          child.type,
        ),
      )
    ) {
      return showErrorToast(
        "Using both PhotoPicker and DocumentPicker components on a single screen is not allowed per screen",
        "error-max-screen-elements",
      );
    }
    setSelectedQuestion({ type, id: "" });
    setActiveEditor(EditFlowRightPanel.ElementEditor);
  };

  function handleFormElementClick(id: string, type: QuestionType2) {
    setSelectedQuestion({ type: QuestionType2?.[type], id });
    setActiveEditor(EditFlowRightPanel.ElementEditor);
  }
  function handleAddElementClick() {
    if (!flowEditable) return;
    setActiveEditor(EditFlowRightPanel.TypeSelection);
  }

  return (
    <Box
      className={styles["edit-flow-root-div"]}
      style={{
        position: "relative",
      }}
    >
      {/* Left sidebar containing list of screens */}
      <Box
        style={{
          flex: 3,
          minWidth: "300px",
        }}
        p="0"
      >
        <FlowScreensList
          onAddElementClick={handleAddElementClick}
          onElementClick={handleFormElementClick}
        />
      </Box>
      {/* Center panel containing type-selection & questionEditor */}
      <Box
        style={{
          flex: 6,
          minWidth: "300px",
          overflow: "auto",
        }}
      >
        {activeEditor === EditFlowRightPanel.TypeSelection && (
          <QuestionTypeSelection
            questionTypeGroups={FlowQuestionTypes2}
            handleTypeSelection={handleTypeSelection}
          />
        )}
        {activeEditor === EditFlowRightPanel.ElementEditor && (
          <FlowQuestionDetailedView
            selectedQuestion={selectedQuestion}
            onCreated={handleNewQuestionCreated}
          />
        )}
      </Box>
      {/* Right sidebar containing preview */}
      {/* <PreviewPanel previewOpened={previewOpened} /> */}
      <Tooltip label={"Open Preview"}>
        <ActionIcon
          style={{
            position: "absolute",
            right: "10px",
            top: "0",
            borderRadius: "100px",
            height: "50px",
            width: "50px",
            zIndex: 2,
          }}
          onClick={() => setPreviewOpened((prev) => !prev)}
        >
          {!previewOpened ? (
            <IconEyeClosed style={{ width: "60%", height: "60%" }} stroke={2} />
          ) : (
            <IconEye style={{ width: "70%", height: "70%" }} stroke={2} />
          )}
        </ActionIcon>
      </Tooltip>
    </Box>
  );
}

export default EditFlow;
