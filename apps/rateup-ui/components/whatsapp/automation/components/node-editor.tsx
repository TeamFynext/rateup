"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Button,
  FileButton,
  Group,
  Image,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconRestore,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import axios from "axios";
import dayjs from "dayjs";
import { useImmer } from "use-immer";

import { SubscriptionFeaturePathName } from "@/types/enums";
import { useAllChatbots } from "@/backend/chatbot/chatbot.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useMarkWaMessagesAsRead } from "@/backend/whatsapp/inbox/message/wamessage.query";
import {
  useMetaAssets,
  useSubscribeFieldToPage,
  useSyncAdaccounts,
  useSyncAdsByadAccounts,
  useSyncFbPages,
  useSyncLeadgenFormQuestions,
  useSyncMetaLeadgenForms,
} from "@/backend/whatsapp/settings/waSettings.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import {
  ContainedDatePickerInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import { TeamSelector } from "@/components/input/TeamSelector";
import RateupLoader from "@/components/Loaders/RateupLoader";
import WaTextEditor from "@/components/RichTextEditor/waTextEditor";
import { FileConverter } from "@/components/whatsapp/flow-v2/input/DataSource";
import WaTemplateFormElements, {
  NoParams,
} from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/templateDisplayModal/templatePreview/formElements";
import useTranslations from "@/dictionaries/useTranslation";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";
import { hasFeature } from "@/utils/subscription/subscription";

import {
  LeadgenNodeData,
  NodeData,
  NodeType,
  NodeTypeMap,
  TypedNode,
  validateNodeData,
} from "../types/node-types";
import styles from "./node-editor.module.css";

// Node editor props
interface NodeEditorProps {
  node: TypedNode;
  onChange: (nodeId: string, data: NodeData) => void;
  onClose: () => void;
}

export default function NodeEditor({
  node,
  onChange,
  onClose,
}: NodeEditorProps) {
  const { data: templates, isLoading } = useWaTemplates();
  const { data: flows, isPending } = useWaFlowsFromDb();
  const { data: subscription } = useSubscription();
  const [hasTicketFeature, hasAIFeature] = useMemo(
    () => [
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
      hasFeature(subscription, SubscriptionFeaturePathName.AI),
    ],
    [subscription],
  );
  const { data: boardData, isLoading: isBoardsPending } =
    useBoardsQueries(hasTicketFeature);
  const [nodeData, setNodeData] = useState<NodeData>(node.data);
  const {
    data: allChatbots,
    isLoading: isLoadingChatbots,
    isError: isErrorChatbots,
  } = useAllChatbots(hasAIFeature);
  const [selectedChatbotId, setSelectedChatbotId] = useState<string | null>(
    null,
  );
  const handleChatbotSelect = (value: string | null) => {
    setSelectedChatbotId(value);
  };
  // Update local state when node changes
  useEffect(() => {
    setNodeData(node.data);
  }, [node]);

  // Handle input changes with proper type checking
  const handleInputChange = <T extends NodeType>(
    key: keyof NodeTypeMap[T],
    value: any,
  ) => {
    const updatedData = {
      ...nodeData,
      [key]: value,
    };
    setNodeData(updatedData);
    onChange(node.id, updatedData);
  };

  // Handle done button with validation
  const handleDone = () => {
    // Validate the node data before closing
    const validationResult = validateNodeData({ ...node, data: nodeData });
    if (!validationResult.valid) {
      notifications.show({
        title: "Validation Error",
        message: validationResult.message,
        color: "red",
      });
      return;
    }
    onClose();
  };

  // Render different editor based on node type with proper type casting
  const renderEditor = () => {
    const nodeType = node.type as NodeType;
    if (isPending || isLoading || isBoardsPending) return <RateupLoader />;

    switch (nodeType) {
      case "textNode":
        return (
          <TextNodeEditor
            nodeData={nodeData as NodeTypeMap["textNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "conditionalNode":
        return (
          <ConditionalNodeEditor
            nodeData={nodeData as NodeTypeMap["conditionalNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "textInputNode":
      case "numberInputNode":
      case "emailInputNode":
      case "phoneInputNode":
      case "dateInputNode":
        return (
          <InputNodeEditor
            nodeData={nodeData as NodeTypeMap[typeof nodeType]}
            handleInputChange={handleInputChange}
          />
        );
      case "delayNode":
        return (
          <DelayNodeEditor
            nodeData={nodeData as NodeTypeMap["delayNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "documentNode":
      case "imageNode":
      case "videoNode":
      case "audioNode":
        return (
          <MediaNodeEditor
            nodeData={nodeData as NodeTypeMap[typeof nodeType]}
            handleInputChange={handleInputChange}
            nodeType={nodeType}
          />
        );
      case "startNode":
        return (
          <StartNodeEditor
            nodeData={nodeData as NodeTypeMap["startNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "endNode":
        return (
          <EndNodeEditor
            nodeData={nodeData as NodeTypeMap["endNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "buttonNode":
        return (
          <ButtonNodeEditor
            nodeData={nodeData as NodeTypeMap["buttonNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "listNode":
        return (
          <ListNodeEditor
            nodeData={nodeData as NodeTypeMap["listNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "ctaUrlNode":
        return (
          <CtaUrlNodeEditor
            nodeData={nodeData as NodeTypeMap["ctaUrlNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "templateNode":
        return (
          <TemplateNodeEditor
            nodeData={nodeData as NodeTypeMap["templateNode"]}
            handleInputChange={handleInputChange}
            templates={templates}
          />
        );
      case "locationNode":
        return (
          <LocationNodeEditor
            nodeData={nodeData as NodeTypeMap["locationNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "contactsNode":
        return (
          <ContactsNodeEditor
            nodeData={nodeData as NodeTypeMap["contactsNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "ticketNode":
        return (
          <TicketNodeEditor
            nodeData={nodeData as NodeTypeMap["ticketNode"]}
            handleInputChange={handleInputChange}
            options={boardData}
          />
        );
      case "flowNode":
        return (
          <FlowNodeEditor
            nodeData={nodeData as NodeTypeMap["flowNode"]}
            handleInputChange={handleInputChange}
            flows={flows}
          />
        );
      case "aibotNode":
        return (
          <AibotNodeEditor
            nodeData={nodeData as NodeTypeMap["aibotNode"]}
            handleInputChange={handleInputChange}
            allChatbots={allChatbots}
          />
        );
      case "leadgenNode":
        return (
          <LeadgenNodeEditor
            nodeData={nodeData as NodeTypeMap["leadgenNode"]}
            handleInputChange={handleInputChange}
          />
        );
      default:
        return (
          <div className={styles.editorSection}>
            <p>No editor available for this node type: {node.type}</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.nodeEditor}>
      <div className={styles.editorHeader}>
        <Text truncate={"end"}>Edit {nodeData.label}</Text>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.editorContent}>
        <div className={styles.editorSection}>
          <ContainedTextField
            type="text"
            label="Node Label"
            value={nodeData.label || ""}
            onChange={(e) => handleInputChange("label", e.target.value)}
            placeholder="Enter node label..."
          />
        </div>

        {renderEditor()}
      </div>

      <div className={styles.editorFooter}>
        <Button onClick={handleDone}>Done</Button>
      </div>
    </div>
  );
}

// Define props type for all node components
interface NodeComponentProps<T extends NodeType> {
  nodeData: NodeTypeMap[T];
  handleInputChange: (key: keyof NodeTypeMap[T], value: any) => void;
}

// TextNode Component
const TextNodeEditor: React.FC<NodeComponentProps<"textNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <div className={styles.editorSection}>
      <WaTextEditor
        content={typedData.body || ""}
        handleInputChange={(e) => handleInputChange("body", e)}
        label="Message Text"
        placeholder="Enter your message text here..."
        required
      />
      <Text fz={"xs"} ta={"right"}>
        {typedData.body?.length || 0}/4096 characters
      </Text>
      <Switch
        label="Enable link preview"
        checked={typedData.previewUrl || true}
        onChange={(e) => handleInputChange("previewUrl", e.target.checked)}
        description={"Enable link preview to show URL previews in WhatsApp."}
      />
    </div>
  );
};

// ConditionalNode Component
const ConditionalNodeEditor: React.FC<
  NodeComponentProps<"conditionalNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;
  return (
    <div className={styles.editorSection}>
      <label htmlFor="condition">Condition</label>
      <input
        id="condition"
        type="text"
        value={typedData.condition || ""}
        onChange={(e) => handleInputChange("condition", e.target.value)}
        placeholder="Enter condition (e.g., {{variable}} == 'value')"
      />
      <div className={styles.conditionalHelp}>
        <h4>Condition Examples:</h4>
        <ul>
          <li>{"{{name}} == 'John'"}</li>
          <li>{"{{age}} > 18"}</li>
          <li>{"{{response}} includes 'yes'"}</li>
        </ul>
      </div>
    </div>
  );
};

// InputNode Component
const InputNodeEditor: React.FC<
  NodeComponentProps<
    | "textInputNode"
    | "numberInputNode"
    | "emailInputNode"
    | "phoneInputNode"
    | "dateInputNode"
  >
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;
  return (
    <div className={styles.editorSection}>
      <label htmlFor="question">Question</label>
      <input
        id="question"
        type="text"
        value={typedData.question || ""}
        onChange={(e) => handleInputChange("question", e.target.value)}
        placeholder="Enter your question..."
      />

      <label htmlFor="variableName">Save Answer to Variable</label>
      <input
        id="variableName"
        type="text"
        value={typedData.variableName || ""}
        onChange={(e) => handleInputChange("variableName", e.target.value)}
        placeholder="Variable name (e.g., user_email)"
      />

      <label htmlFor="validation">Validation (optional)</label>
      <input
        id="validation"
        type="text"
        value={typedData.validation || ""}
        onChange={(e) => handleInputChange("validation", e.target.value)}
        placeholder="Regex pattern or validation rule"
      />
    </div>
  );
};

// DelayNode Component
const DelayNodeEditor: React.FC<NodeComponentProps<"delayNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <ContainedNumberInput
      label="Delay Time (seconds)"
      min={1}
      max={10}
      value={typedData.delayTime?.toString()}
      onChange={(e) => handleInputChange("delayTime", e)}
      description="Time to wait before proceeding to the next node"
    />
  );
};

// MediaNode Component
const MediaNodeEditor: React.FC<
  NodeComponentProps<
    "documentNode" | "imageNode" | "videoNode" | "audioNode" | "buttonNode"
  > & { nodeType: NodeType }
> = ({ nodeData, handleInputChange, nodeType }) => {
  const typedData = nodeData;
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const { translations } = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const resetRef = useRef<() => void>(null);

  const clearFile = async (skip = false) => {
    if (!skip && (!file || typeof file !== "string")) {
      setFile(null);
      return;
    }
    await deleteUploadedFiles({
      fileKeyArray: [{ Key: skip ? typedData?.link : file }],
    });
    setFile(null);
    if (skip) {
      handleInputChange("link", null); // Clear the link in parent component
    }
    resetRef.current?.();
  };

  // Define file size limits based on media type
  const getFileSizeLimit = () => {
    switch (nodeType) {
      case "imageNode":
        return 5000000; // 5MB
      case "videoNode":
        return 16000000; // 16MB
      case "audioNode":
        return 16000000; // 16MB
      case "documentNode":
        return 100000000; // 100MB
      default:
        return 300000;
    }
  };

  const getFileSizeLimitText = () => {
    switch (nodeType) {
      case "imageNode":
        return "5MB";
      case "videoNode":
        return "16MB";
      case "audioNode":
        return "16MB";
      case "documentNode":
        return "100MB";
      default:
        return "300KB";
    }
  };

  const handleFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > getFileSizeLimit()) {
        showErrorToast(
          `Max file size is ${getFileSizeLimitText()}`,
          "file-size",
        );
        return setMediaError(`Max ${getFileSizeLimitText()}`);
      }
      setMediaError("");
      const base64String = await FileConverter.fileToBase64(file, true);
      setMedia(base64String);
      setFile(file);
    } catch (error) {
      showErrorToast(
        translations["Error converting file to Base64:"] +
          JSON.stringify(error),
        "file-converting",
      );
    }
  };

  const uploadFileData = async () => {
    try {
      if (!file) return;
      setLoading(true);
      clearFile();
      const publicMediaLink = await uploadFile(file);
      setMedia(null);
      handleInputChange("link", publicMediaLink);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      showErrorToast(
        translations["Error uploading file to server:"] + JSON.stringify(error),
        "file-uploading",
      );
    }
  };
  const getAcceptType = () => {
    switch (nodeType) {
      case "imageNode":
        return "image/jpeg,image/png";
      case "videoNode":
        return "video/3gpp,video/mp4";
      case "audioNode":
        return "audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg";
      case "documentNode":
        return "text/plain,application/vnd.ms-excel,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf";
      default:
        return "";
    }
  };

  return (
    <Stack>
      {nodeType === "imageNode" && (media || typedData?.link) && (
        <Image
          src={media || getFileUrlFromKey(typedData?.link)}
          alt="Media"
          h={100}
          w={100}
          mx={"auto"}
        />
      )}
      <Group justify="center" mt={"xs"}>
        <FileButton
          resetRef={resetRef}
          onChange={handleFileChange}
          accept={getAcceptType()}
        >
          {(props) => (
            <Button {...props} size="xs">
              Select File
            </Button>
          )}
        </FileButton>
        <ActionIcon
          variant="light"
          disabled={!file}
          onClick={() => clearFile()}
        >
          <IconRestore />
        </ActionIcon>
        {typedData?.link && (
          <ActionIcon variant="light" c={"red"} onClick={() => clearFile(true)}>
            <IconTrash />
          </ActionIcon>
        )}
      </Group>
      {mediaError && (
        <Text size="xs" c="red" ta="center" mt="sm">
          {mediaError}
        </Text>
      )}

      {file && (
        <Stack>
          <Text size="sm" ta="center" mt="sm">
            Picked file: {file.name}
          </Text>
          <Button
            onClick={uploadFileData}
            disabled={loading}
            leftSection={<IconDeviceFloppy />}
          >
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </Stack>
      )}
      {nodeType !== "audioNode" && (
        <WaTextEditor
          label={"Caption (optional)"}
          content={typedData.caption || ""}
          handleInputChange={(e) => handleInputChange("caption", e)}
          max={1024}
          placeholder="Enter caption..."
        />
      )}
      {nodeType === "documentNode" && (
        <ContainedTextField
          mt={"sm"}
          label={"FileName (optional)"}
          value={(typedData as NodeTypeMap["documentNode"]).filename || ""}
          onChange={(e) => handleInputChange("filename" as any, e.target.value)}
          maxLength={1024}
          placeholder="Enter FileName..."
          description={"Supports FileName with maximum 1024 characters."}
        />
      )}
    </Stack>
  );
};

// StartNode Component
const StartNodeEditor: React.FC<NodeComponentProps<"startNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <div className={styles.editorSection}>
      <ContainedTextField
        value={typedData.startMessage || ""}
        onChange={(e) => handleInputChange("startMessage", e.target.value)}
        label="Start Message"
        disabled
      />
    </div>
  );
};

// EndNode Component
const EndNodeEditor: React.FC<NodeComponentProps<"endNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <div className={styles.editorSection}>
      {/* <ContainedTextField
        id="endMessage"
        value={typedData.endMessage || ""}
        onChange={(e) => handleInputChange("endMessage", e.target.value)}
        label="End Message (optional)"
        placeholder="Enter an optional end message..."
      /> */}
    </div>
  );
};

// ButtonNode Component
const ButtonNodeEditor: React.FC<NodeComponentProps<"buttonNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const newButtonRef = useRef<HTMLInputElement | null>(null);

  const getType = () => {
    switch (typedData.headerType) {
      case "text":
        return "textNode";
      case "image":
        return "imageNode";
      case "video":
        return "videoNode";
      case "document":
        return "documentNode";
      default:
        return "textNode";
    }
  };

  const addNewButton = () => {
    if (typedData.buttons?.length >= 3) return;
    const newButtons = [
      ...(typedData.buttons || []),
      { id: `button-${Date.now()}`, title: "" },
    ];
    handleInputChange("buttons", newButtons);

    // Focus will be set after render via useEffect
    setTimeout(() => {
      if (newButtonRef.current) {
        newButtonRef.current.focus();
      }
    }, 0);
  };

  return (
    <Stack gap={"xs"}>
      <ContainedSelection
        label="Header Type"
        placeholder="Select header type"
        data={[
          { value: "text", label: "Text" },
          { value: "image", label: "Image" },
          { value: "video", label: "Video" },
          { value: "document", label: "Document" },
        ]}
        value={typedData.headerType}
        onChange={(value) => {
          handleInputChange("headerType", value);
        }}
        description="Type of header content to display"
      />

      {typedData.headerType === "text" ? (
        <ContainedTextField
          onChange={(e) => handleInputChange("header", e.target.value)}
          value={typedData.header || ""}
          placeholder="Enter header text..."
          label="Header Text"
          maxLength={60}
        />
      ) : (
        typedData.headerType && (
          <MediaNodeEditor
            handleInputChange={handleInputChange}
            nodeData={typedData}
            nodeType={getType()}
          />
        )
      )}

      {/* Body - Required */}
      <WaTextEditor
        handleInputChange={(e) => handleInputChange("body", e)}
        content={typedData.body || ""}
        placeholder="Enter message text..."
        label="Body Text (Required)"
        max={1024}
        required
      />

      <WaTextEditor
        handleInputChange={(e) => handleInputChange("footer", e)}
        content={typedData.footer || ""}
        placeholder="Enter footer text..."
        label="Footer Text"
        max={60}
      />

      {/* Buttons - At least one required */}
      <Text size="sm" mt="md">
        Buttons (At least one required)
      </Text>
      {(typedData.buttons || []).length === 0 && (
        <Text c="red" size="sm">
          Please add at least one button
        </Text>
      )}

      {(typedData.buttons || []).map((button: any, index: number) => (
        <div key={index} className={styles.optionRow}>
          <ContainedTextField
            flex={1}
            type="text"
            value={typeof button === "object" ? button.title || "" : button}
            onChange={(e) => {
              const newButtons = [...(typedData.buttons || [])];
              if (typeof button === "object") {
                newButtons[index] = {
                  ...newButtons[index],
                  title: e.target.value,
                };
              } else {
                newButtons[index] = {
                  id: `button-${Date.now()}`,
                  title: e.target.value,
                };
              }
              handleInputChange("buttons", newButtons);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                index === typedData.buttons.length - 1 &&
                typedData.buttons.length < 3
              ) {
                e.preventDefault();
                addNewButton();
              }
            }}
            placeholder={`Button ${index + 1} title`}
            maxLength={20}
            description="Max 20 characters"
            rightSection={
              <ActionIcon
                variant="transparent"
                onClick={() => {
                  const newButtons = [...(typedData.buttons || [])];
                  newButtons.splice(index, 1);
                  handleInputChange("buttons", newButtons);
                }}
              >
                <IconX size={16} />
              </ActionIcon>
            }
            ref={index === typedData.buttons?.length - 1 ? newButtonRef : null}
          />
        </div>
      ))}
      <Button disabled={typedData.buttons?.length >= 3} onClick={addNewButton}>
        + Add Button
      </Button>
    </Stack>
  );
};

// ListNode Component
const ListNodeEditor: React.FC<NodeComponentProps<"listNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const getTotalRowCount = (sections: any[] = []) => {
    return sections.reduce((count, section) => {
      return count + (section.rows?.length || 0);
    }, 0);
  };
  return (
    <Stack gap={"xs"}>
      <ContainedTextField
        onChange={(e) => handleInputChange("header", e?.target?.value)}
        value={typedData.header || ""}
        placeholder="Enter header text..."
        label="Header Text"
        maxLength={60}
      />
      <WaTextEditor
        handleInputChange={(e) => handleInputChange("body", e)}
        content={typedData.body || ""}
        placeholder="Enter message text..."
        label="Body Text"
        max={4096}
        required
      />

      <WaTextEditor
        handleInputChange={(e) => handleInputChange("footer", e)}
        content={typedData.footer || ""}
        placeholder="Enter footer text..."
        label="Footer (optional)"
        max={60}
      />

      <ContainedTextField
        label="Button Text"
        placeholder="Enter button text"
        value={typedData.button || ""}
        onChange={(e) => handleInputChange("button", e.target.value)}
        maxLength={20}
        description="Button text shown at the bottom of the list (max 20 characters)"
      />

      <Text fw={500} mt="md">
        Sections
      </Text>
      <Text size="xs" c="dimmed">
        Interactive list messages support up to 10 sections, with up to 10 rows
        across all sections combined
      </Text>

      {(typedData.sections || []).map((section: any, sectionIndex: number) => (
        <Stack
          key={sectionIndex}
          className={styles.sectionContainer}
          p="xs"
          my="xs"
          style={{ border: "1px solid #eee", borderRadius: "8px" }}
        >
          <ContainedTextField
            label={`Section ${sectionIndex + 1} Title`}
            placeholder="Enter section title"
            value={section.title || ""}
            onChange={(e) => {
              const newSections = [...(typedData.sections || [])];
              newSections[sectionIndex] = {
                ...newSections[sectionIndex],
                title: e.target.value,
              };
              handleInputChange("sections", newSections);
            }}
            maxLength={24}
            description="Max 24 characters"
            rightSection={
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => {
                  const newSections = [...(typedData.sections || [])];
                  newSections.splice(sectionIndex, 1);
                  handleInputChange("sections", newSections);
                }}
              >
                <IconX size={16} />
              </ActionIcon>
            }
          />

          <Text fw={500} size="sm">
            Rows
          </Text>
          {(section.rows || []).map((row: any, rowIndex: number) => (
            <Stack
              key={rowIndex}
              gap="xs"
              className={styles.rowContainer}
              p="xs"
              style={{
                backgroundColor: "#f9f9f9",
                borderRadius: "4px",
              }}
            >
              <Group justify="flex-end">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    const newSections = [...(typedData.sections || [])];
                    newSections[sectionIndex].rows.splice(rowIndex, 1);
                    handleInputChange("sections", newSections);
                  }}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
              <ContainedTextField
                label="Title"
                placeholder="Enter row title"
                value={row.title || ""}
                onChange={(e) => {
                  const newSections = [...(typedData.sections || [])];
                  newSections[sectionIndex].rows[rowIndex] = {
                    ...newSections[sectionIndex].rows[rowIndex],
                    title: e.target.value,
                  };
                  handleInputChange("sections", newSections);
                }}
                maxLength={24}
                description="Max 24 characters"
              />
              <ContainedTextField
                label="Description (optional)"
                placeholder="Enter row description"
                value={row.description || ""}
                onChange={(e) => {
                  const newSections = [...(typedData.sections || [])];
                  newSections[sectionIndex].rows[rowIndex] = {
                    ...newSections[sectionIndex].rows[rowIndex],
                    description: e.target.value,
                  };
                  handleInputChange("sections", newSections);
                }}
                maxLength={72}
                description="Max 72 characters"
              />
            </Stack>
          ))}
          <Button
            variant="light"
            size="compact-xs"
            compact
            disabled={getTotalRowCount(typedData.sections || []) >= 10}
            onClick={() => {
              const newSections = [...(typedData.sections || [])];
              if (!newSections[sectionIndex].rows) {
                newSections[sectionIndex].rows = [];
              }
              newSections[sectionIndex].rows.push({
                id: `row-${Date.now()}`,
                title: "",
                description: "",
              });
              handleInputChange("sections", newSections);
            }}
          >
            + Add Row
          </Button>
        </Stack>
      ))}

      <Button
        variant="outline"
        disabled={typedData.sections?.length >= 10}
        onClick={() => {
          const newSections = [
            ...(typedData.sections || []),
            { title: "", rows: [] },
          ];
          handleInputChange("sections", newSections);
        }}
        mt="md"
      >
        + Add Section
      </Button>
    </Stack>
  );
};

// CtaUrlNode Component
const CtaUrlNodeEditor: React.FC<NodeComponentProps<"ctaUrlNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <Stack gap={"xs"}>
      <ContainedTextField
        onChange={(e) => handleInputChange("header", e?.target?.value)}
        value={typedData.header || ""}
        placeholder="Enter header text..."
        label="Header Text"
        maxLength={60}
      />

      <WaTextEditor
        handleInputChange={(e) => handleInputChange("body", e)}
        content={typedData.body || ""}
        placeholder="Enter message text..."
        label="Body Text (optional)"
        max={1024}
      />

      <WaTextEditor
        handleInputChange={(e) => handleInputChange("footer", e)}
        content={typedData.footer || ""}
        placeholder="Enter footer text..."
        label="Footer (optional)"
        max={60}
      />

      <ContainedTextField
        label="Button Text"
        placeholder="Enter button text"
        required
        value={typedData?.display_text || ""}
        onChange={(e) => {
          handleInputChange("display_text", e.target.value);
        }}
        maxLength={20}
        description="Button text shown (max 20 characters)"
      />

      <ContainedTextField
        label="URL"
        placeholder="Enter the URL"
        required
        value={typedData?.url || ""}
        type="url"
        onChange={(e) => {
          handleInputChange("url", e.target.value);
        }}
        description="The URL that will open when the button is clicked"
      />
    </Stack>
  );
};

// TemplateNode Component
const TemplateNodeEditor: React.FC<
  NodeComponentProps<"templateNode"> & { templates: any }
> = ({ nodeData, handleInputChange, templates }) => {
  const typedData = nodeData;
  const [parameterData, setParameterData] = useImmer<any>(
    typedData?.parameters || [],
  );
  const templateData =
    templates?.map((t) => ({
      label: t.data?.name,
      value: t.id,
      flowId: t.data?.components?.find((c) => c.type === "BUTTONS")
        ?.buttons?.[0]?.["flow_id"],
    })) || [];
  let selectedTemplate = templates?.find(
    (t) => t.id === typedData?.template?.id,
  );
  const router = useRouter();
  let automatedId = router.query.waAutomatedReplyId as string;
  const { data, isPending, refetch } = useWaAutomatedReplyById(automatedId);
  const isLeadAutomation = data && data?.commands[0] === "lead";
  const { data: metaAssets, isLoading } = useMetaAssets(isLeadAutomation);
  const leadgenData = useMemo(() => {
    if (isLeadAutomation && metaAssets) {
      const leadgenNode = data?.matchData?.json?.nodes.find(
        (node) => node.type === "leadgen",
      );
      if (leadgenNode && leadgenNode.data.leadgenFormId.length) {
        const leadgenForm = metaAssets?.leadgenForms.find(
          (form) => form.id === leadgenNode?.data?.leadgenFormId,
        );
        return {
          data: leadgenNode?.data,
          formQuestions: leadgenForm.questions,
        };
      }
    }
  }, [metaAssets, isLeadAutomation]);
  // Update template parameters when they change
  useEffect(() => {
    handleInputChange("parameters", parameterData);
  }, [parameterData]);

  if (isPending || isLoading) return <RateupLoader />;

  return (
    <Stack>
      <ContainedSelection
        data={templateData}
        label="Template"
        allowDeselect={false}
        placeholder={`Select Template`}
        value={typedData?.template?.id || ""}
        onChange={(value, values) => {
          setParameterData([]);
          handleInputChange("template", {
            id: value,
            name: values?.label,
          });
        }}
        flex={1}
      />
      {templateData?.find((t) => t.value === typedData?.template?.id)
        ?.flowId && (
        <TeamSelector
          value={typedData.teamId}
          onChange={(id) => {
            handleInputChange("teamId", id);
          }}
          w={"100%"}
        />
      )}
      {selectedTemplate?.data?.components?.length <= 1 &&
      selectedTemplate?.data?.components?.[0]?.example === undefined ? (
        <Stack justify="center" align="center" h={"60dvh"}>
          <NoParams type={"Body"} />
        </Stack>
      ) : (
        <WaTemplateFormElements
          setParameterData={setParameterData}
          template={selectedTemplate?.data}
          parameters={parameterData}
          leadgenData={leadgenData}
        />
      )}
    </Stack>
  );
};

// LocationNode Component
const LocationNodeEditor: React.FC<NodeComponentProps<"locationNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <Stack gap="xs">
      <ContainedTextField
        label="Location Name"
        placeholder="Enter location name..."
        value={typedData.name || ""}
        onChange={(e) => handleInputChange("name", e.target.value)}
        description="Name of the location to be shared"
      />

      <Group grow>
        <ContainedTextField
          label="Latitude"
          required
          placeholder="e.g., 37.7749"
          value={typedData.latitude || ""}
          onChange={(e) => handleInputChange("latitude", e.target.value)}
          description="Decimal latitude coordinate"
        />

        <ContainedTextField
          label="Longitude"
          required
          placeholder="e.g., -122.4194"
          value={typedData.longitude || ""}
          onChange={(e) => handleInputChange("longitude", e.target.value)}
          description="Decimal longitude coordinate"
        />
      </Group>

      <ContainedTextField
        label="Address (optional)"
        placeholder="Enter full address..."
        value={typedData.address || ""}
        onChange={(e) => handleInputChange("address", e.target.value)}
        description="Full address that corresponds to these coordinates"
      />

      <Text size="xs" c="dimmed" mt="sm">
        Note: Both latitude and longitude are required for a valid location
        message
      </Text>
    </Stack>
  );
};

// ContactsNode Component
const ContactsNodeEditor: React.FC<NodeComponentProps<"contactsNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const [activeContactIndex, setActiveContactIndex] = useState(0);

  const addNewContact = () => {
    if (!typedData.contacts || typedData.contacts.length >= 257) return;

    const newContacts = [...(typedData.contacts || []), {}];
    handleInputChange("contacts", newContacts);
    setActiveContactIndex(newContacts.length - 1);
  };

  const removeContact = (index: number) => {
    const newContacts = [...(typedData.contacts || [])];
    newContacts.splice(index, 1);

    if (newContacts.length === 0) {
      newContacts.push({});
    }

    handleInputChange("contacts", newContacts);
    setActiveContactIndex(Math.min(index, newContacts.length - 1));
  };

  const updateContactField = (index: number, path: string[], value: any) => {
    const newContacts = [...(typedData.contacts || [])];

    // If newContacts[index] is undefined, initialize it as an empty object
    if (!newContacts[index]) {
      newContacts[index] = {};
    }

    // Navigate to the nested property and update it
    let current = newContacts[index];
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        // Initialize as object or array based on next path segment
        current[path[i]] = isNaN(Number(path[i + 1])) ? {} : [];
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;

    handleInputChange("contacts", newContacts);
  };

  const activeContact = typedData.contacts?.[activeContactIndex] || {};

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={500} mt="xs">
          Contacts ({typedData.contacts?.length || 0}/257)
        </Text>
        <Button
          size="xs"
          disabled={typedData.contacts?.length >= 257}
          onClick={addNewContact}
        >
          <IconPlus size={16} /> Add Contact
        </Button>
      </Group>

      {typedData.contacts && typedData.contacts.length > 0 && (
        <Group>
          <Select
            label="Select Contact to Edit"
            data={typedData.contacts.map((_, i) => ({
              value: i.toString(),
              label: `Contact ${i + 1}${activeContact?.name?.formatted_name ? `: ${activeContact.name.formatted_name}` : ""}`,
            }))}
            value={activeContactIndex.toString()}
            onChange={(value) => setActiveContactIndex(parseInt(value || "0"))}
            style={{ flex: 1 }}
          />
          {typedData.contacts.length > 1 && (
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => removeContact(activeContactIndex)}
              mt={25}
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      )}

      <Text size="xs" c="dimmed">
        Create contact cards to share with your users
      </Text>

      {/* Name section - formatted_name is required */}
      <Stack
        className={styles.contactSection}
        p="xs"
        style={{ background: "#f9f9f9", borderRadius: "8px" }}
      >
        <Text fw={500} size="sm">
          Contact Name
        </Text>
        <ContainedTextField
          label="Full Name"
          required
          placeholder="Enter full name"
          value={activeContact?.name?.formatted_name || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["name", "formatted_name"],
              e.target.value,
            );
          }}
          description="Required - Full name as it should appear"
        />

        <ContainedTextField
          label="First Name"
          placeholder="First name"
          required
          value={activeContact?.name?.first_name || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["name", "first_name"],
              e.target.value,
            );
          }}
        />
        <ContainedTextField
          label="Last Name"
          placeholder="Last name"
          value={activeContact?.name?.last_name || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["name", "last_name"],
              e.target.value,
            );
          }}
        />

        <ContainedTextField
          label="Middle Name"
          placeholder="Middle name"
          value={activeContact?.name?.middle_name || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["name", "middle_name"],
              e.target.value,
            );
          }}
        />
        <ContainedTextField
          label="Prefix"
          placeholder="e.g., Dr., Mr."
          value={activeContact?.name?.prefix || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["name", "prefix"],
              e.target.value,
            );
          }}
        />
        <ContainedTextField
          label="Suffix"
          placeholder="e.g., Jr., Ph.D."
          value={activeContact?.name?.suffix || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["name", "suffix"],
              e.target.value,
            );
          }}
        />
      </Stack>

      {/* Organization section */}
      <Stack
        className={styles.contactSection}
        p="xs"
        style={{ background: "#f9f9f9", borderRadius: "8px" }}
      >
        <Text fw={500} size="sm">
          Organization
        </Text>
        <ContainedTextField
          label="Company"
          placeholder="Company or organization name"
          value={activeContact?.org?.company || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["org", "company"],
              e.target.value,
            );
          }}
        />

        <ContainedTextField
          label="Department"
          placeholder="Department name"
          value={activeContact?.org?.department || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["org", "department"],
              e.target.value,
            );
          }}
        />
        <ContainedTextField
          label="Job Title"
          placeholder="Job title"
          value={activeContact?.org?.title || ""}
          onChange={(e) => {
            updateContactField(
              activeContactIndex,
              ["org", "title"],
              e.target.value,
            );
          }}
        />
      </Stack>

      {/* Birthday */}
      <ContainedDatePickerInput
        label="Birthday"
        placeholder="YYYY-MM-DD"
        value={
          activeContact?.birthday ? new Date(activeContact.birthday) : undefined
        }
        onChange={(e) =>
          updateContactField(
            activeContactIndex,
            ["birthday"],
            dayjs(e).format("YYYY-MM-DD"),
          )
        }
      />

      {/* Phones section */}
      <Stack
        className={styles.contactSection}
        p="xs"
        style={{ background: "#f9f9f9", borderRadius: "8px" }}
      >
        <Group justify="space-between">
          <Text fw={500} size="sm">
            Phone Numbers
          </Text>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => {
              const phones = [
                ...(activeContact?.phones || []),
                { phone: "", type: "CELL" },
              ];
              updateContactField(activeContactIndex, ["phones"], phones);
            }}
          >
            + Add Phone
          </Button>
        </Group>

        {(activeContact?.phones || []).map((phone, index) => (
          <Stack key={index}>
            <ContainedTextField
              label={`Phone ${index + 1}`}
              placeholder="Phone number with country code"
              style={{ flex: 2 }}
              value={phone.phone || ""}
              onChange={(e) => {
                const phones = [...(activeContact?.phones || [])];
                phones[index] = {
                  ...phones[index],
                  phone: e.target.value,
                };
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
            />
            <Select
              label="Type"
              data={[
                { value: "CELL", label: "Cell" },
                { value: "WORK", label: "Work" },
                { value: "HOME", label: "Home" },
                { value: "MAIN", label: "Main" },
              ]}
              value={phone.type || "CELL"}
              onChange={(value: "HOME" | "WORK" | "CELL" | "MAIN") => {
                const phones = [...(activeContact?.phones || [])];
                phones[index] = { ...phones[index], type: value };
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
              style={{ flex: 1 }}
            />
            <ContainedTextField
              label="WhatsApp ID"
              placeholder="WhatsApp ID (wa_id)"
              value={phone.wa_id || ""}
              onChange={(e) => {
                const phones = [...(activeContact?.phones || [])];
                phones[index] = {
                  ...phones[index],
                  wa_id: e.target.value,
                };
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
              description="WhatsApp user ID. If omitted, the message will display an Invite to WhatsApp button instead of the standard button"
            />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => {
                const phones = [...(activeContact?.phones || [])];
                phones.splice(index, 1);
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Stack>
        ))}
      </Stack>

      {/* Emails section */}
      <Stack
        className={styles.contactSection}
        p="xs"
        style={{ background: "#f9f9f9", borderRadius: "8px" }}
      >
        <Group justify="space-between">
          <Text fw={500} size="sm">
            Email Addresses
          </Text>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => {
              const emails = [
                ...(activeContact?.emails || []),
                { email: "", type: "WORK" },
              ];
              updateContactField(activeContactIndex, ["emails"], emails);
            }}
          >
            + Add Email
          </Button>
        </Group>

        {(activeContact?.emails || []).map((email, index) => (
          <Stack key={index}>
            <ContainedTextField
              label={`Email ${index + 1}`}
              placeholder="Email address"
              style={{ flex: 2 }}
              value={email.email || ""}
              onChange={(e) => {
                const emails = [...(activeContact?.emails || [])];
                emails[index] = {
                  ...emails[index],
                  email: e.target.value,
                };
                updateContactField(activeContactIndex, ["emails"], emails);
              }}
            />
            <Select
              label="Type"
              data={[
                { value: "WORK", label: "Work" },
                { value: "HOME", label: "Home" },
                { value: "OTHER", label: "Other" },
              ]}
              value={email.type || "WORK"}
              onChange={(value: "WORK" | "HOME" | "OTHER") => {
                const emails = [...(activeContact?.emails || [])];
                emails[index] = { ...emails[index], type: value };
                updateContactField(activeContactIndex, ["emails"], emails);
              }}
              style={{ flex: 1 }}
            />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => {
                const emails = [...(activeContact?.emails || [])];
                emails.splice(index, 1);
                updateContactField(activeContactIndex, ["emails"], emails);
              }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Stack>
        ))}
      </Stack>

      {/* Addresses section */}
      <Stack
        className={styles.contactSection}
        p="xs"
        style={{ background: "#f9f9f9", borderRadius: "8px" }}
      >
        <Group justify="space-between">
          <Text fw={500} size="sm">
            Addresses
          </Text>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => {
              const addresses = [
                ...(activeContact?.addresses || []),
                {
                  street: "",
                  city: "",
                  state: "",
                  zip: "",
                  country: "",
                  country_code: "",
                  type: "HOME",
                },
              ];
              updateContactField(activeContactIndex, ["addresses"], addresses);
            }}
          >
            + Add Address
          </Button>
        </Group>

        {(activeContact?.addresses || []).map((address, index) => (
          <Stack key={index} gap="xs">
            <Group justify="space-between">
              <Text size="sm">Address {index + 1}</Text>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses.splice(index, 1);
                  updateContactField(
                    activeContactIndex,
                    ["addresses"],
                    addresses,
                  );
                }}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>

            <ContainedTextField
              label="Street"
              placeholder="Street number and name"
              value={address.street || ""}
              onChange={(e) => {
                const addresses = [...(activeContact?.addresses || [])];
                addresses[index] = {
                  ...addresses[index],
                  street: e.target.value,
                };
                updateContactField(
                  activeContactIndex,
                  ["addresses"],
                  addresses,
                );
              }}
            />

            <Group grow>
              <ContainedTextField
                label="City"
                placeholder="City"
                value={address.city || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    city: e.target.value,
                  };
                  updateContactField(
                    activeContactIndex,
                    ["addresses"],
                    addresses,
                  );
                }}
              />
              <ContainedTextField
                label="State"
                placeholder="State/Province"
                value={address.state || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    state: e.target.value,
                  };
                  updateContactField(
                    activeContactIndex,
                    ["addresses"],
                    addresses,
                  );
                }}
              />
            </Group>

            <Stack>
              <ContainedTextField
                label="ZIP/Postal Code"
                placeholder="ZIP/Postal code"
                value={address.zip || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    zip: e.target.value,
                  };
                  updateContactField(
                    activeContactIndex,
                    ["addresses"],
                    addresses,
                  );
                }}
              />
              <ContainedTextField
                label="Country"
                placeholder="Country name"
                value={address.country || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    country: e.target.value,
                  };
                  updateContactField(
                    activeContactIndex,
                    ["addresses"],
                    addresses,
                  );
                }}
              />
              <ContainedTextField
                label="Country Code"
                placeholder="ISO code (e.g., US)"
                maxLength={2}
                value={address.country_code || ""}
                onChange={(e) => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses[index] = {
                    ...addresses[index],
                    country_code: e.target.value.toUpperCase(),
                  };
                  updateContactField(
                    activeContactIndex,
                    ["addresses"],
                    addresses,
                  );
                }}
                description="ISO two-letter code"
              />
            </Stack>

            <Select
              label="Address Type"
              data={[
                { value: "HOME", label: "Home" },
                { value: "WORK", label: "Work" },
                { value: "OTHER", label: "Other" },
              ]}
              value={address.type || "HOME"}
              onChange={(value: "WORK" | "HOME" | "OTHER") => {
                const addresses = [...(activeContact?.addresses || [])];
                addresses[index] = { ...addresses[index], type: value };
                updateContactField(
                  activeContactIndex,
                  ["addresses"],
                  addresses,
                );
              }}
              style={{ maxWidth: 200 }}
            />
          </Stack>
        ))}
      </Stack>

      {/* URLs section */}
      <Stack
        className={styles.contactSection}
        p="xs"
        style={{ background: "#f9f9f9", borderRadius: "8px" }}
      >
        <Group justify="space-between">
          <Text fw={500} size="sm">
            Websites
          </Text>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => {
              const urls = [
                ...(activeContact?.urls || []),
                { url: "", type: "WORK" },
              ];
              updateContactField(activeContactIndex, ["urls"], urls);
            }}
          >
            + Add Website
          </Button>
        </Group>

        {(activeContact?.urls || []).map((url, index) => (
          <Stack key={index}>
            <ContainedTextField
              label={`Website ${index + 1}`}
              placeholder="https://..."
              style={{ flex: 2 }}
              value={url.url || ""}
              onChange={(e) => {
                const urls = [...(activeContact?.urls || [])];
                urls[index] = { ...urls[index], url: e.target.value };
                updateContactField(activeContactIndex, ["urls"], urls);
              }}
            />
            <Select
              label="Type"
              data={[
                { value: "WORK", label: "Work" },
                { value: "HOME", label: "Home" },
                { value: "PROFILE", label: "Profile" },
                { value: "OTHER", label: "Other" },
              ]}
              value={url.type || "WORK"}
              onChange={(value: "WORK" | "HOME" | "OTHER" | "PROFILE") => {
                const urls = [...(activeContact?.urls || [])];
                urls[index] = { ...urls[index], type: value };
                updateContactField(activeContactIndex, ["urls"], urls);
              }}
              style={{ flex: 1 }}
            />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => {
                const urls = [...(activeContact?.urls || [])];
                urls.splice(index, 1);
                updateContactField(activeContactIndex, ["urls"], urls);
              }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

// TicketNode Component
const TicketNodeEditor: React.FC<
  NodeComponentProps<"ticketNode"> & { options: any }
> = ({ nodeData, handleInputChange, options }) => {
  const typedData = nodeData;
  const [selectedBoard, setSelectedBoard] = useState({
    selectedBoardId: typedData.ticket?.selectedBoardId,
    selectedBoardColumnId: typedData.ticket?.selectedBoardColumnId,
  });

  // Transform boards for Select component
  const boards = useMemo(
    () => options?.map((board) => ({ value: board.id, label: board.title })),
    [],
  );

  // Get columns for selected board
  const columns = useMemo(() => {
    const board = options?.find(
      (board) => board.id === selectedBoard?.selectedBoardId,
    );
    return board
      ? board.ticketColumns.map((col) => ({
          value: col.id,
          label: col.title,
        }))
      : [];
  }, [options, selectedBoard?.selectedBoardId]);

  return (
    <Stack gap="xs">
      <Select
        label="Select Board"
        placeholder="Choose a board"
        value={typedData.ticket?.selectedBoardId}
        data={boards}
        onChange={(boardId, values) => {
          setSelectedBoard({
            selectedBoardId: boardId,
            selectedBoardColumnId: values?.label,
          });
        }}
      />
      {selectedBoard && (
        <Select
          label="Select Column"
          placeholder="Choose a column"
          value={typedData.ticket?.selectedBoardColumnId}
          data={columns}
          onChange={(columnId, values) => {
            handleInputChange("ticket", {
              selectedBoardId: selectedBoard?.selectedBoardId,
              selectedBoardName: selectedBoard?.selectedBoardColumnId,
              selectedBoardColumnId: columnId,
              selectedBoardColumnName: values?.label,
            });
          }}
        />
      )}
    </Stack>
  );
};

// FlowNode Component
const FlowNodeEditor: React.FC<
  NodeComponentProps<"flowNode"> & { flows: any }
> = ({ nodeData, handleInputChange, flows }) => {
  const typedData = nodeData;
  return (
    <Stack>
      <ContainedSelection
        data={
          flows?.map((t) => ({
            label: t.name,
            value: t.dbFlowId,
          })) || []
        }
        label="Flow"
        allowDeselect={false}
        placeholder={`Select Flow`}
        value={typedData?.flow?.id || ""}
        onChange={(value, values) => {
          handleInputChange("flow", {
            id: value,
            name: values?.label,
          });
        }}
        flex={1}
      />
      {typedData?.flow?.id && (
        <TeamSelector
          value={typedData.teamId}
          onChange={(id) => {
            handleInputChange("teamId", id);
          }}
          w={"100%"}
        />
      )}
    </Stack>
  );
};

const AibotNodeEditor: React.FC<
  NodeComponentProps<"aibotNode"> & { allChatbots: any }
> = ({ nodeData, handleInputChange, allChatbots }) => {
  const typedData = nodeData;
  return (
    <Stack>
      <WaTextEditor
        content={typedData.body || ""}
        handleInputChange={(e) => handleInputChange("body", e)}
        label="Start Message"
        placeholder="Enter your message text here..."
        required
      />
      <Text fz="xs" ta="right">
        {typedData.body?.length || 0}/4096 characters
      </Text>

      <ContainedSelection
        data={
          allChatbots?.map((bot) => ({
            label: bot.name,
            value: bot.id,
          })) || []
        }
        label="Select Chatbot"
        allowDeselect={false}
        placeholder="Select a chatbot"
        value={typedData?.chatbot?.id || ""}
        onChange={(value, selected) => {
          handleInputChange("chatbot", {
            id: value,
            name: selected?.label,
          });
        }}
        flex={1}
      />
    </Stack>
  );
};

// LeadgenNode Component
const LeadgenNodeEditor: React.FC<NodeComponentProps<"leadgenNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData as LeadgenNodeData;
  const { data: metaAssets, isLoading } = useMetaAssets();
  const subscribeFieldMut = useSubscribeFieldToPage();
  const syncfbpageMut = useSyncFbPages();
  const syncAdAccMut = useSyncAdaccounts();
  const syncAdsMut = useSyncAdsByadAccounts(typedData?.adAccountId);
  const syncformQuestionsMut = useSyncLeadgenFormQuestions(
    typedData?.leadgenFormId,
  );
  const syncLeadgenFormsMut = useSyncMetaLeadgenForms();
  const { pages, adAccounts, leadgenForms, ads, formQuestions } =
    useMemo(() => {
      let pages = [],
        adAccounts = [],
        leadgenForms = [],
        ads = [],
        formQuestions = [];
      if (metaAssets) {
        pages = metaAssets.pages.map((page) => ({
          label: page.name,
          value: page.id,
        }));
        adAccounts = metaAssets.adAccounts.map((adAccount) => ({
          label: adAccount.name,
          value: adAccount.id,
        }));
        leadgenForms = metaAssets.leadgenForms.map((form) => ({
          label: form.name,
          value: form.id,
        }));
        ads =
          metaAssets.adAccounts
            .find((adacc) => adacc.id === typedData.adAccountId)
            ?.ads?.map((ad) => ({
              label: ad?.name,
              value: ad?.id,
            })) ?? [];
        formQuestions =
          metaAssets.leadgenForms
            .find((form) => form.id === typedData?.leadgenFormId)
            ?.questions?.map((question) => question?.key) ?? [];
      }
      return { pages, adAccounts, leadgenForms, ads, formQuestions };
    }, [metaAssets]);

  function subscribeTolead() {
    if (!typedData?.fbPageId) {
      showErrorToast("Select a page");
      return;
    }
    subscribeFieldMut.mutate({
      fbPageId: typedData?.fbPageId,
      pageAccessToken: typedData?.pageAccessToken,
      fields: ["leadgen"],
    });
  }
  const [isFieldSubscribed, setIsFieldSubscribed] = useState(false);

  useEffect(() => {
    if (typedData?.fbPageId && metaAssets) {
      const accessToken = metaAssets.pages?.find(
        (page) => page?.id === typedData?.fbPageId,
      )?.access_token;
      handleInputChange("pageAccessToken", accessToken);
      const fieldSub = metaAssets.pages.find(
        (f) => f.id === typedData?.fbPageId,
      );
      if (fieldSub && fieldSub.subscribedFields.includes("leadgen")) {
        setIsFieldSubscribed(true);
      } else {
        setIsFieldSubscribed(false);
      }
    }
  }, [typedData?.fbPageId, metaAssets]);

  if (isLoading) return <RateupLoader />;
  return (
    <Stack>
      <Group gap={3}>
        <ContainedSelection
          data={pages}
          value={typedData?.fbPageId}
          label={"Select Page"}
          onChange={(value) => {
            handleInputChange("fbPageId", value);
          }}
          w={200}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip label={"Sync pages if not found."}>
          <ActionIcon
            onClick={() => syncfbpageMut.mutate()}
            mt={25}
            variant="light"
            loading={syncfbpageMut.isPending}
          >
            <IconRefresh />
          </ActionIcon>
        </Tooltip>
      </Group>
      {!isFieldSubscribed && (
        <RateupButtonBlue
          onClick={subscribeTolead}
          title="Subscribe to Lead"
          loading={subscribeFieldMut.isPending}
        />
      )}
      <Group gap={2}>
        <ContainedSelection
          data={adAccounts}
          value={typedData?.adAccountId}
          onChange={(value) => handleInputChange("adAccountId", value)}
          w={200}
          label={"Select Ad account"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip label={"Sync ad accounts if not found."}>
          <ActionIcon
            onClick={() => syncAdAccMut.mutate()}
            mt={25}
            variant="light"
            loading={syncAdAccMut.isPending}
          >
            <IconRefresh />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group gap={2}>
        <ContainedSelection
          data={leadgenForms}
          onChange={(value) => handleInputChange("leadgenFormId", value)}
          value={typedData?.leadgenFormId}
          w={200}
          label={"Select Leadgen Form"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip label={"Sync Leadgen Forms if not found."}>
          <ActionIcon
            onClick={() =>
              syncLeadgenFormsMut.mutate({
                fbPageId: typedData?.fbPageId,
                pageAccessToken: typedData?.pageAccessToken,
              })
            }
            mt={25}
            variant="light"
            loading={syncLeadgenFormsMut.isPending}
          >
            <IconRefresh />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Group gap={2}>
        <ContainedSelection
          data={ads}
          onChange={(value, option) =>
            handleInputChange("ad", { id: option.value, name: option.label })
          }
          value={typedData?.ad?.id}
          w={200}
          label={"Select ad"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip label={"Sync Ads if not found."}>
          <ActionIcon
            onClick={() => syncAdsMut.mutate()}
            mt={25}
            variant="light"
            loading={syncAdsMut.isPending}
          >
            <IconRefresh />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Group gap={2}>
        <ContainedSelection
          data={formQuestions}
          onChange={(value) => handleInputChange("phoneField", value)}
          value={typedData?.phoneField}
          w={200}
          label={"Select phone question key"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip label={"Sync form questions if not found."}>
          <ActionIcon
            onClick={() =>
              syncformQuestionsMut.mutate({
                fbPageId: typedData?.fbPageId,
                pageAccessToken: typedData?.pageAccessToken,
              })
            }
            mt={25}
            variant="light"
            loading={syncformQuestionsMut.isPending}
          >
            <IconRefresh />
          </ActionIcon>
        </Tooltip>
      </Group>
      <PhoneInputWithCountry
        label="Default Phone number"
        onChange={(value) => handleInputChange("phone", value)}
      />
    </Stack>
  );
};
