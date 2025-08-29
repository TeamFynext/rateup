"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ActionIcon, Box, Tooltip } from "@mantine/core";
import { IconEye, IconEyeClosed } from "@tabler/icons-react";
import _ from "lodash";

import { QuestionType2 } from "@/types/enums";
import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "@/backend/whatsapp/flow/flow.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { FlowQuestionTypes2 } from "@/utils/constants";
import { showErrorToast } from "@/utils/notifications";

import { PreviewPanel } from "../flows/Preview/PreviewPanel";
import styles from "./EditFlow.module.css";
import FlowScreensList from "./FlowScreensList";
import { QuestionTypeSelection } from "./QuestionTypeSelection";
import { FlowQuestionDetailedView } from "./RightSide/FlowQuestionDetailedView";
import useFlowStore, { EditFlowRightPanel } from "./utils/store";

function EditFlow() {
  const [previewOpened, setPreviewOpened] = useState(false);
  const params = useParams();
  const dbFlowId = params.dbFlowId as string;

  const { data: dbFlow, isPending } = useWaFlowFromDb(dbFlowId);
  const {
    getCurrentScreen,
    getScreens,
    screens,
    activeEditor,
    setActiveEditor,
    setCurrentElement,
    setTicketIssued,
    ticketIssued,
  } = useFlowStore();
  const updateFlow = useUpdateFlowMutation();

  useEffect(() => {
    if (!isPending && !_.isEqual(dbFlow.json.screens, getScreens())) {
      updateFlow.mutate({
        dbFlowId,
        data: {
          json: {
            screens: getScreens() as any,
            version: "7.2",
          },
          ticketIssued:
            ticketIssued && !_.isEqual(dbFlow.ticketIssued, ticketIssued)
              ? ticketIssued
              : undefined,
        },
      });
    }
  }, [dbFlowId, screens, isPending, ticketIssued]);

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
        ["DocumentPicker", "PhotoPicker"].includes(child.type),
      )
    ) {
      return showErrorToast(
        "Using both PhotoPicker and DocumentPicker components on a single screen is not allowed per screen",
        "error-max-screen-elements",
      );
    } else if (
      type === QuestionType2.ImageCarousel &&
      formElementChildren.filter((c) => c.type === ("ImageCarousel" as any))
        .length >= 2
    ) {
      return showErrorToast(
        "Maximum of 2 ImageCarousel components allowed per screen",
        "error-max-screen-elements",
      );
    } else if (
      type === QuestionType2.ImageCarousel &&
      getScreens()
        .flatMap((screen) => screen.layout.children)
        .filter((child) => child.type === ("ImageCarousel" as any)).length >= 3
    ) {
      return showErrorToast(
        "Maximum of 3 ImageCarousel components allowed per flow",
        "error-max-screen-elements",
      );
    }
    setCurrentElement(null, type);
    setActiveEditor(EditFlowRightPanel.ElementEditor);
  };
  useEffect(() => {
    setTicketIssued(dbFlow?.ticketIssued);
  }, [dbFlow]);

  if (isPending) return <RateupLoader />;

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
        <FlowScreensList />
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
          <FlowQuestionDetailedView />
        )}
      </Box>
      {/* Right sidebar containing preview */}
      <PreviewPanel previewOpened={previewOpened} version={2} />
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
