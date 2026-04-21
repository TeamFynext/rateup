"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ActionIcon,
  Badge,
  Button,
  FileButton,
  Group,
  Image,
  Radio,
  RadioGroup,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import {
  IconBrandFacebookFilled,
  IconCheck,
  IconDeviceFloppy,
  IconExclamationCircle,
  IconPlus,
  IconRefresh,
  IconRestore,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { useImmer } from "use-immer";

import { SubscriptionFeaturePathName } from "@/types/enums";
import { useAllChatbots } from "@/backend/chatbot/chatbot.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import {
  useProductSetsByCatalog,
  useSyncProductSets,
} from "@/backend/whatsapp/catalog/productSet.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import {
  useMetaAssets,
  useSubscribeFieldToPage,
  useSyncAdaccounts,
  useSyncAdsByadAccounts,
  useSyncFbPages,
  useSyncLeadgenFormQuestions,
  useSyncMetaLeadgenForms,
  useUpdateWaSettingsMutation,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import {
  ContainedDatePickerInput,
  ContainedMultiSelect,
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
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "@/utils/file-upload/upload";
import { hasFeature } from "@/utils/subscription/subscription";

import {
  CatalogNodeData,
  LeadgenNodeData,
  NodeData,
  NodeType,
  NodeTypeMap,
  TypedNode,
  validateNodeData,
  WhatsappProductSet,
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
}: Readonly<NodeEditorProps>) {
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
  const { data: teamMembers, isPending: isLoadingTeamMembers } =
    useTeamsMembersOfOrg();
  const session = useSessionContext() as {
    userId: string;
  };

  const [nodeData, setNodeData] = useState<NodeData>(node.data);
  const { data: allChatbots } = useAllChatbots(hasAIFeature);
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

  const handleInputChange = <T extends NodeType>(
    key: keyof NodeTypeMap[T],
    value: any,
  ) => {
    setNodeData((prevData) => {
      const updatedData = {
        ...prevData,
        [key]: value,
      };
      onChange(node.id, updatedData);
      return updatedData;
    });
  };

  // Handle done button with validation
  const handleDone = () => {
    // Validate the node data before closing
    const validationResult = validateNodeData({ ...node, data: nodeData });
    if (!validationResult.valid) {
      toast.error(validationResult.message);
      return;
    }
    onClose();
  };

  // Render different editor based on node type with proper type casting
  const renderEditor = () => {
    const nodeType = node.type;
    if (isPending || isLoading || isBoardsPending || isLoadingTeamMembers)
      return <RateupLoader />;

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

      case "pauseNode":
        return (
          <PauseNodeEditor
            nodeData={nodeData as NodeTypeMap["pauseNode"]}
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
      case "assignNode":
        return (
          <AssignNodeEditor
            nodeData={nodeData as NodeTypeMap["assignNode"]}
            handleInputChange={handleInputChange}
            options={{ ...teamMembers, currentUserId: session?.userId }}
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
      case "catalogNode":
        return (
          <CatalogNodeEditor
            nodeData={nodeData as NodeTypeMap["catalogNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramGenericTemplateNode":
        return (
          <InstagramGenericTemplateNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramGenericTemplateNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramQuickReplyNode":
        return (
          <InstagramQuickReplyNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramQuickReplyNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramStoryReplyNode":
        return (
          <InstagramStoryReplyNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramStoryReplyNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramProductTemplateNode":
        return (
          <InstagramProductTemplateNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramProductTemplateNode"]}
            handleInputChange={handleInputChange}
          />
        );
      case "instagramIceBreakerNode":
        return (
          <InstagramIceBreakerNodeEditor
            nodeData={nodeData as NodeTypeMap["instagramIceBreakerNode"]}
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
        <Button onClick={handleDone}>Save</Button>
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
        max={4096}
      />
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
      <WaTextEditor
        content={typedData.question || ""}
        handleInputChange={(e) => handleInputChange("question", e)}
        label="Question Text"
        placeholder="Enter your question text here..."
        required
        max={4096}
      />

      <label htmlFor="variableName">Save Answer to Variable</label>
      <input
        id="variableName"
        type="text"
        value={typedData.variableName || ""}
        onChange={(e) => handleInputChange("variableName", e.target.value)}
        placeholder="Variable name (e.g., user_email)"
      />

      {/* <label htmlFor="validation">Validation (optional)</label>
      <input
        id="validation"
        type="text"
        value={typedData.validation || ""}
        onChange={(e) => handleInputChange("validation", e.target.value)}
        placeholder="Regex pattern or validation rule"
      /> */}
    </div>
  );
};

// PauseNode Component
const PauseNodeEditor: React.FC<NodeComponentProps<"pauseNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <Stack gap="md">
      <ContainedNumberInput
        label="Pause Duration"
        min={1}
        value={typedData.duration?.toString()}
        onChange={(val) => handleInputChange("duration", val)}
        description="Duration to pause the automation flow"
      />
      <ContainedSelection
        label="Unit"
        placeholder="Select unit"
        value={typedData.unit}
        data={[
          { value: "seconds", label: "Seconds" },
          { value: "minutes", label: "Minutes" },
        ]}
        onChange={(val) => handleInputChange("unit", val)}
        allowDeselect={false}
      />
    </Stack>
  );
};

// MediaNode Component
const MediaNodeEditor: React.FC<
  NodeComponentProps<
    "documentNode" | "imageNode" | "videoNode" | "audioNode" | "buttonNode"
  > & { nodeType: NodeType; disableCaption?: boolean }
> = ({ nodeData, handleInputChange, nodeType, disableCaption = false }) => {
  const typedData = nodeData;
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const translations = useExtracted();
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
        return 5 * 1024 * 1024;
      case "videoNode":
        return 16 * 1024 * 1024;
      case "audioNode":
        return 16 * 1024 * 1024;
      case "documentNode":
        return 100 * 1024 * 1024;
      default:
        return 0.3 * 1024 * 1024;
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
        toast.error(
          `size warning: Max file size is ${getFileSizeLimitText()}`,
          {
            id: "file-size",
          },
        );
        return setMediaError(`size warning: Max ${getFileSizeLimitText()}`);
      }
      setMediaError("");
      const base64String = await FileConverter.fileToBase64(file, true);
      setMedia(base64String);
      setFile(file);
    } catch (error) {
      toast.error(
        translations("Error converting file to Base64:") +
          JSON.stringify(error),
        {
          id: "file-converting",
        },
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
      toast.error(
        typeof error === "string"
          ? error
          : translations("Error uploading file to server:") +
              JSON.stringify(error),
        {
          id: "upload-file",
        },
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
      <Group justify="flex-end">
        <Badge variant="light" color="blue" size="xs">
          Size Limit: {getFileSizeLimitText()}
        </Badge>
      </Group>
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
      {nodeType !== "audioNode" && !disableCaption && (
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
      <ContainedTextField label="Start Message" disabled />
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
            disableCaption={true}
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
        required
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
  const selectedTemplate = templates?.find(
    (t) => t.id === typedData?.template?.id,
  );
  const params = useParams();

  const flowbotId = params.flowbotId as string;
  const { data: waSettings, isLoading: isSettingsLoading } = useWaSettings();
  const { data, isPending, refetch } = useWaAutomatedReplyById(flowbotId);
  const waSetting =
    waSettings &&
    (waSettings.find((w) => w.phoneId === data.whatsappSettingsPhoneId) ??
      waSettings[0]);
  const waSettingsId = data && waSetting ? waSetting.id : null;
  const { data: metaAssets, isLoading } = useMetaAssets(waSettingsId);
  const leadgenData = useMemo(() => {
    if (waSettingsId && metaAssets) {
      const leadgenNode = data?.matchData?.json?.nodes.find(
        (node) => node.type === "leadgenNode",
      );
      if (leadgenNode?.data?.leadgenFormId?.length) {
        const leadgenForm = metaAssets?.leadgenForms.find(
          (form) => form.id === leadgenNode?.data?.leadgenFormId,
        );
        return {
          data: leadgenNode?.data,
          formQuestions: leadgenForm.questions,
        };
      }
    }
  }, [metaAssets, waSettingsId]);
  // Update template parameters when they change
  useEffect(() => {
    handleInputChange("parameters", parameterData);
  }, [parameterData]);

  if (isPending || isLoading || isSettingsLoading) return <RateupLoader />;

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

// TicketNode Component
const AssignNodeEditor: React.FC<
  NodeComponentProps<"assignNode"> & { options: any }
> = ({ nodeData, handleInputChange, options }) => {
  const typedData = nodeData;

  const form = useForm({
    initialValues: {
      teamId: "",
      assignedUserIds: [],
      choice: "manual",
      teamName: "",
      roundRobin: false,
      assignIfOnline: true,
    },
    validate: {
      teamId: isNotEmpty("required"),
      assignedUserIds: (value, values) =>
        values.choice === "manual" ? isNotEmpty("required")(value) : undefined,
    },
    onValuesChange: async (values) => {
      const validationRes = await form.validate();
      if (validationRes.hasErrors) return;
      const teamName =
        options?.data
          ?.flatMap((user) => user.teams)
          ?.find((team) => team.team_id === values.teamId)?.team_name ?? "";
      handleInputChange("assign", {
        ...typedData?.assign,
        teamId: values.teamId,
        assignedUserIds: values.assignedUserIds,
        choice: values.choice,
        teamName: teamName,
        roundRobin: values.roundRobin,
        assignIfOnline: values.assignIfOnline,
      });
    },
  });

  const members = useMemo(
    () =>
      options?.data
        ?.filter((user) =>
          user.teams.some((t) => t.team_id === form.values.teamId),
        )
        .map((user) => ({ value: user.id, label: user.name })),
    [options, form.values.teamId],
  );

  useEffect(() => {
    form.setFieldValue("teamId", typedData.assign?.teamId);
    form.setFieldValue(
      "assignedUserIds",
      typedData.assign?.assignedUserIds ?? [],
    );
    form.setFieldValue("choice", typedData.assign?.choice || "manual");
    form.setFieldValue("teamName", typedData.assign?.teamName || "");
    form.setFieldValue("roundRobin", typedData.assign?.roundRobin ?? false);
    form.setFieldValue(
      "assignIfOnline",
      typedData.assign?.assignIfOnline ?? true,
    );
  }, [typedData.assign]);

  return (
    <Stack gap="xs">
      {typedData?.assign?.assignType === "staff" && (
        <Switch
          label="Assign only if assignee is online"
          {...form.getInputProps("assignIfOnline", { type: "checkbox" })}
          description="If enabled, assignment will only happen when the assignee is online. If disabled, assignment happens regardless of online status."
        />
      )}
      <SegmentedControl
        value={typedData?.assign?.assignType}
        onChange={(value) => {
          if (value === "me") {
            handleInputChange("assign", {
              ...typedData?.assign,
              assignType: value,
              assignedUserIds: [options?.currentUserId], // set to current user
            });
          } else {
            handleInputChange("assign", {
              ...typedData?.assign,
              assignType: value,
            });
          }
        }}
        data={[
          { label: "Assign To Me", value: "me" },
          { label: "Assign To Staff", value: "staff" },
        ]}
      />

      {typedData?.assign?.assignType === "staff" && (
        <>
          <Group justify="center" gap={2}>
            <IconExclamationCircle size={"1rem"} />
            <Text size="xs">Assign the chat</Text>
          </Group>
          <Stack>
            <TeamSelector
              label="Select Team"
              {...form.getInputProps("teamId")}
            />
            <RadioGroup {...form.getInputProps("choice")}>
              <Group>
                <Radio value={"all"} label={"All Members"} />
                <Radio value={"manual"} label={"Select Manually"} />
              </Group>
            </RadioGroup>
            {form.values?.choice === "manual" && (
              <ContainedMultiSelect
                data={members}
                {...form.getInputProps("assignedUserIds")}
                label={"Select Members"}
                placeholder="click to select"
                searchable
              />
            )}
            <Switch
              label="Enable Round Robin Assignment"
              {...form.getInputProps("roundRobin", { type: "checkbox" })}
              description="Assign chats to team members in a round robin fashion"
            />
          </Stack>
        </>
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
          })) ?? []
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
          })) ?? []
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
  const typedData = nodeData as unknown as LeadgenNodeData;
  const params = useParams();
  const router = useRouter();
  const flowbotId = params.flowbotId as string;
  const { data: waSettings, isLoading: isSettingsLoading } = useWaSettings();
  const { data, isPending, refetch } = useWaAutomatedReplyById(flowbotId);
  const waSetting =
    waSettings &&
    (waSettings.find((w) => w.phoneId === data.whatsappSettingsPhoneId) ??
      waSettings[0]);
  const waSettingsId = data && waSetting ? waSetting.id : null;
  const { data: metaAssets, isLoading } = useMetaAssets(waSettingsId);
  const subscribeFieldMut = useSubscribeFieldToPage(waSettingsId);
  const syncfbpageMut = useSyncFbPages(waSettingsId);
  const syncAdAccMut = useSyncAdaccounts(waSettingsId);
  const syncAdsMut = useSyncAdsByadAccounts(
    typedData?.adAccountId,
    waSettingsId,
  );
  const syncformQuestionsMut = useSyncLeadgenFormQuestions(
    typedData?.leadgenFormId,
    waSettingsId,
  );
  const syncLeadgenFormsMut = useSyncMetaLeadgenForms(waSettingsId);
  const updateWaSettings = useUpdateWaSettingsMutation(waSettingsId);
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
        leadgenForms = typedData.fbPageId
          ? metaAssets.leadgenForms
              .filter((f) => f.pageId === typedData.fbPageId)
              .map((form) => ({
                label: form.name,
                value: form.id,
              }))
          : [];
        ads = typedData.adAccountId
          ? metaAssets.adAccounts
              .find((adacc) => adacc.id === typedData.adAccountId)
              ?.ads?.map((ad) => ({
                label: ad?.name,
                value: ad?.id,
              }))
          : [];
        formQuestions =
          metaAssets.leadgenForms
            .find((form) => form.id === typedData?.leadgenFormId)
            ?.questions?.map((question) => question?.key) ?? [];
      }
      return { pages, adAccounts, leadgenForms, ads, formQuestions };
    }, [
      metaAssets,
      typedData.fbPageId,
      typedData?.adAccountId,
      typedData?.leadgenFormId,
    ]);

  function subscribeTolead() {
    if (!typedData?.fbPageId) {
      toast.error("Select a page");
      return;
    }
    if (!typedData?.pageAccessToken) {
      toast.error("Failed! Try deselecting and selecting page");
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
      const page = metaAssets.pages?.find((p) => p?.id === typedData?.fbPageId);
      if (page) {
        handleInputChange("pageAccessToken", page.access_token);
        if (page.subscribedFields.includes("leadgen")) {
          setIsFieldSubscribed(true);
        } else {
          setIsFieldSubscribed(false);
        }
      } else {
        setIsFieldSubscribed(false);
      }
    }
  }, [typedData?.fbPageId, metaAssets]);

  async function handleFbLogin() {
    localStorage.setItem("waSettingsId", waSetting.id);
    localStorage.setItem("automationId", flowbotId);

    const url = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/fb`)}&config_id=${process.env.NEXT_PUBLIC_META_USER_CONFIG_ID}`;
    if (url) {
      router.push(url);
    }
  }
  const pageAccessTokenByUser = useMemo(() => {
    if (metaAssets && typedData?.fbPageId) {
      const page = metaAssets.pages?.find(
        (page) => page.id === typedData?.fbPageId,
      );
      return page.pageAccessTokenByUser;
    }
    return null;
  }, [typedData?.fbPageId, metaAssets]);

  useEffect(() => {
    if (typedData?.phoneField?.length && pageAccessTokenByUser) {
      handleInputChange("pageUserAccessToken", pageAccessTokenByUser);
    }
  }, [typedData?.phoneField, pageAccessTokenByUser]);

  if (isLoading || isPending || isSettingsLoading) return <RateupLoader />;
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
            handleInputChange("ad", { id: option?.value, name: option?.label })
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
      {typedData?.fbPageId?.length &&
      !pageAccessTokenByUser &&
      typedData?.phoneField?.length ? (
        <RateupButtonBlue
          leftIcon={<IconBrandFacebookFilled size={"1.5rem"} />}
          title="Allow lead access"
          onClick={handleFbLogin}
          color="#1877f2"
          radius={"sm"}
        />
      ) : typedData?.phoneField?.length ? (
        <Badge
          variant="light"
          leftSection={<IconCheck size={"1rem"} />}
          tt={"initial"}
          color="green"
        >
          Allowed Lead Access
        </Badge>
      ) : null}
      <PhoneInputWithCountry
        label="Default Phone number"
        onChange={(value) => handleInputChange("phone", value)}
        value={typedData?.phone}
      />
    </Stack>
  );
};

export enum CatalogMessages {
  Catalog = "Catalog",
  SingleProduct = "Single-Product",
  MultiProduct = "Multi-Product",
  ProductSet = "Product-Set",
}

const CatalogNodeEditor = ({
  nodeData,
  handleInputChange,
}: NodeComponentProps<"catalogNode">) => {
  const typedData = nodeData as CatalogNodeData;
  const params = useParams();
  const flowbotId = params.flowbotId as string;
  const {
    data: automation,
    isPending,
    refetch,
  } = useWaAutomatedReplyById(flowbotId);
  const { data, isLoading } = useConnectedWaCatalog(
    typedData.whatsappSettingsPhoneId || automation?.whatsappSettingsPhoneId,
  );

  const syncProductSetsMut = useSyncProductSets();
  const { data: productSets, isLoading: isLoadingProductSets } =
    useProductSetsByCatalog(typedData.catalogId);

  useEffect(() => {
    if (
      data &&
      (!typedData.catalogId || typedData.catalogId !== data.catalogId)
    ) {
      handleInputChange("catalogId", data.catalogId);
    }
  }, [data]);

  const productSetOptions = useMemo(
    () =>
      productSets?.map((ps: WhatsappProductSet) => ({
        value: ps.productSetId,
        label: ps.name,
      })) || [],
    [productSets],
  );

  const products = useMemo(
    () =>
      data
        ? data.products.map((p) => ({
            value: p.retailer_id,
            label: p?.productProps?.title,
          }))
        : [],
    [data],
  );

  const filteredProducts = useMemo(() => {
    if (!typedData.useProductSet || !typedData.productSetId) {
      return products;
    }

    const selectedProductSet = productSets?.find(
      (ps: WhatsappProductSet) => ps.productSetId === typedData.productSetId,
    );

    if (!selectedProductSet) {
      return products;
    }

    // Filter products to only show those in the selected product set
    return products.filter((p) =>
      selectedProductSet.productIds.includes(p.value),
    );
  }, [products, typedData.useProductSet, typedData.productSetId, productSets]);

  if (isLoading || isPending || isLoadingProductSets) return <RateupLoader />;
  return (
    <Stack gap="xs">
      <ContainedSelection
        label={"Catalog Message type"}
        placeholder="Select"
        value={typedData?.type || ""}
        onChange={(value) => {
          handleInputChange("type", value);
          // Clear product set when changing away from ProductSet type
          if (value !== CatalogMessages.ProductSet) {
            handleInputChange("useProductSet", false);
            handleInputChange("productSetId", undefined);
          } else {
            // Set useProductSet to true when ProductSet is selected
            handleInputChange("useProductSet", true);
          }
          // Initialize sections array for Multi-Product if not already present
          if (value === CatalogMessages.MultiProduct && !typedData.sections) {
            handleInputChange("sections", []);
          }
        }}
        data={Object.values(CatalogMessages)}
        allowDeselect={false}
      />

      {typedData?.type === CatalogMessages.ProductSet && (
        <ContainedSelection
          label="Product Set"
          placeholder="Choose product set"
          data={productSetOptions}
          value={typedData.productSetId || ""}
          onChange={(value) => handleInputChange("productSetId", value)}
          withAsterisk
          description="Products from this set will be displayed"
          rightSectionPointerEvents="all"
          rightSection={
            <ActionIcon
              onClick={() =>
                typedData.catalogId &&
                syncProductSetsMut.mutate(typedData.catalogId)
              }
              variant="subtle"
              color="blue"
              loading={syncProductSetsMut.isPending}
              disabled={!typedData.catalogId}
              title="Sync from Meta"
            >
              <IconRefresh size={16} />
            </ActionIcon>
          }
        />
      )}
      {(typedData?.type === CatalogMessages.MultiProduct ||
        typedData?.type === CatalogMessages.ProductSet) && (
        <WaTextEditor
          handleInputChange={(e) => handleInputChange("header", e)}
          content={typedData.header || ""}
          placeholder="Enter header text..."
          label="Header Text ( Required )"
          max={60}
          required
        />
      )}
      <WaTextEditor
        content={typedData?.body || ""}
        handleInputChange={(e) => handleInputChange("body", e)}
        label={`Body Text ${typedData?.type === CatalogMessages.SingleProduct ? " ( optional ) " : ""}`}
        placeholder="Enter your message text here..."
        required
      />
      <WaTextEditor
        handleInputChange={(e) => handleInputChange("footer", e)}
        content={typedData.footer || ""}
        placeholder="Enter footer text..."
        label="Footer (optional)"
        max={60}
      />
      {typedData.type === CatalogMessages.Catalog && (
        <ContainedSelection
          label={"Thumbnail Product (optional)"}
          data={filteredProducts}
          value={typedData?.thumbnailProductId || ""}
          onChange={(value) => handleInputChange("thumbnailProductId", value)}
          placeholder="Select"
        />
      )}
      {typedData.type === CatalogMessages.SingleProduct && (
        <ContainedSelection
          label={"Product Retailer ID"}
          withAsterisk
          data={filteredProducts}
          value={typedData?.productRetailerId || ""}
          onChange={(value) => handleInputChange("productRetailerId", value)}
          placeholder="Select"
        />
      )}
      {(typedData.sections || []).map(
        (section: CatalogNodeData["sections"][0], sectionIndex: number) => (
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
            <Text size="xs" c="dimmed">
              Catalog Multi product message support up to 10 sections, with a
              minimum of 1 product per section and a maximum of 30 products
              across all sections.
            </Text>
            <ContainedMultiSelect
              label={"Products"}
              value={section.productItems || []}
              data={filteredProducts}
              onChange={(values) => {
                const newSections = [...(typedData.sections || [])];
                newSections[sectionIndex] = {
                  ...newSections[sectionIndex],
                  productItems: values,
                };
                handleInputChange("sections", newSections);
              }}
              placeholder="Select multiple items"
            />
          </Stack>
        ),
      )}
      {typedData.type === CatalogMessages.MultiProduct && (
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
      )}
    </Stack>
  );
};

// Instagram Generic Template Node Editor
const InstagramGenericTemplateNodeEditor: React.FC<
  NodeComponentProps<"instagramGenericTemplateNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <Stack gap={"xs"}>
      <Text size="sm" fw={500}>
        Template Elements (Cards)
      </Text>
      <Text size="xs" c="dimmed">
        Create cards with images, text, and buttons for Instagram messaging
      </Text>

      {(typedData.elements || []).map((element, index: number) => (
        <Stack
          key={index}
          p="sm"
          style={{ border: "1px solid #eee", borderRadius: "8px" }}
        >
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Card {index + 1}
            </Text>
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => {
                const newElements = [...(typedData.elements || [])];
                newElements.splice(index, 1);
                handleInputChange("elements", newElements);
              }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>

          <ContainedTextField
            label="Title"
            placeholder="Enter card title"
            required
            value={element.title || ""}
            onChange={(e) => {
              const newElements = [...(typedData.elements || [])];
              newElements[index] = {
                ...newElements[index],
                title: e.target.value,
              };
              handleInputChange("elements", newElements);
            }}
            maxLength={80}
          />

          <ContainedTextField
            label="Subtitle"
            placeholder="Enter subtitle (optional)"
            value={element.subtitle || ""}
            onChange={(e) => {
              const newElements = [...(typedData.elements || [])];
              newElements[index] = {
                ...newElements[index],
                subtitle: e.target.value,
              };
              handleInputChange("elements", newElements);
            }}
            maxLength={80}
          />

          <ContainedTextField
            label="Image URL"
            placeholder="https://..."
            value={element.image_url || ""}
            onChange={(e) => {
              const newElements = [...(typedData.elements || [])];
              newElements[index] = {
                ...newElements[index],
                image_url: e.target.value,
              };
              handleInputChange("elements", newElements);
            }}
          />

          <Text size="xs" fw={500} mt="xs">
            Buttons
          </Text>
          {(element.buttons || []).map((button, btnIndex: number) => (
            <Group key={btnIndex} gap="xs">
              <Select
                size="xs"
                value={button.type}
                onChange={(value) => {
                  const newElements = [...(typedData.elements || [])];
                  newElements[index].buttons[btnIndex].type = value as
                    | "web_url"
                    | "postback";
                  handleInputChange("elements", newElements);
                }}
                data={[
                  { value: "web_url", label: "URL" },
                  { value: "postback", label: "Action" },
                ]}
                style={{ width: "100px" }}
              />
              <ContainedTextField
                flex={1}
                placeholder="Button title"
                value={button.title}
                onChange={(e) => {
                  const newElements = [...(typedData.elements || [])];
                  newElements[index].buttons[btnIndex].title = e.target.value;
                  handleInputChange("elements", newElements);
                }}
                maxLength={20}
              />
              {button.type === "web_url" && (
                <ContainedTextField
                  flex={1}
                  placeholder="URL"
                  value={button.url || ""}
                  onChange={(e) => {
                    const newElements = [...(typedData.elements || [])];
                    newElements[index].buttons[btnIndex].url = e.target.value;
                    handleInputChange("elements", newElements);
                  }}
                />
              )}
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => {
                  const newElements = [...(typedData.elements || [])];
                  newElements[index].buttons.splice(btnIndex, 1);
                  handleInputChange("elements", newElements);
                }}
              >
                <IconX size={14} />
              </ActionIcon>
            </Group>
          ))}
          <Button
            size="xs"
            variant="light"
            disabled={element.buttons?.length >= 3}
            onClick={() => {
              const newElements = [...(typedData.elements || [])];
              if (!newElements[index].buttons) {
                newElements[index].buttons = [];
              }
              newElements[index].buttons.push({
                type: "postback",
                title: "",
                id: crypto.randomUUID(),
              });
              handleInputChange("elements", newElements);
            }}
          >
            + Add Button
          </Button>
        </Stack>
      ))}

      <Button
        variant="outline"
        disabled={typedData.elements?.length >= 10}
        onClick={() => {
          const newElements = [
            ...(typedData.elements || []),
            { title: "", buttons: [] },
          ];
          handleInputChange("elements", newElements);
        }}
      >
        + Add Card
      </Button>
    </Stack>
  );
};

// Instagram Quick Reply Node Editor
const InstagramQuickReplyNodeEditor: React.FC<
  NodeComponentProps<"instagramQuickReplyNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <Stack gap={"xs"}>
      <ContainedTextField
        label="Message Text"
        placeholder="Enter your message"
        required
        value={typedData.text || ""}
        onChange={(e) => handleInputChange("text", e.target.value)}
      />

      <Text size="sm" fw={500} mt="md">
        Quick Replies
      </Text>
      <Text size="xs" c="dimmed">
        Add up to 13 quick reply buttons
      </Text>

      {(typedData.quick_replies || []).map((reply, index: number) => (
        <Group key={index} gap="xs">
          <ContainedTextField
            flex={1}
            placeholder="Reply text"
            value={reply.title || ""}
            onChange={(e) => {
              const newReplies = [...(typedData.quick_replies || [])];
              newReplies[index] = {
                ...newReplies[index],
                title: e.target.value,
              };
              handleInputChange("quick_replies", newReplies);
            }}
            maxLength={20}
          />
          <ContainedTextField
            flex={1}
            placeholder="Payload (optional)"
            value={reply.payload || ""}
            onChange={(e) => {
              const newReplies = [...(typedData.quick_replies || [])];
              newReplies[index] = {
                ...newReplies[index],
                payload: e.target.value,
              };
              handleInputChange("quick_replies", newReplies);
            }}
          />
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() => {
              const newReplies = [...(typedData.quick_replies || [])];
              newReplies.splice(index, 1);
              handleInputChange("quick_replies", newReplies);
            }}
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
      ))}

      <Button
        variant="outline"
        disabled={typedData.quick_replies?.length >= 13}
        onClick={() => {
          const newReplies = [
            ...(typedData.quick_replies || []),
            {
              content_type: "text" as const,
              title: "",
              id: crypto.randomUUID(),
            },
          ];
          handleInputChange("quick_replies", newReplies);
        }}
      >
        + Add Quick Reply
      </Button>
    </Stack>
  );
};

// Instagram Story Reply Node Editor
const InstagramStoryReplyNodeEditor: React.FC<
  NodeComponentProps<"instagramStoryReplyNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <Stack gap={"xs"}>
      <Switch
        label="Story Mention"
        description="Enable if this is a response to a story mention"
        checked={typedData.story_mention || false}
        onChange={(e) =>
          handleInputChange("story_mention", e.currentTarget.checked)
        }
      />

      <ContainedTextField
        label="Reply Text"
        placeholder="Enter your reply message"
        required
        value={typedData.text || ""}
        onChange={(e) => handleInputChange("text", e.target.value)}
      />

      <Text size="xs" c="dimmed">
        This node will send a message in response to Instagram story replies or
        mentions
      </Text>
    </Stack>
  );
};

// Instagram Product Template Node Editor
const InstagramProductTemplateNodeEditor: React.FC<
  NodeComponentProps<"instagramProductTemplateNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <Stack gap={"xs"}>
      <Text size="sm" fw={500}>
        Products
      </Text>
      <Text size="xs" c="dimmed">
        Add products from your Instagram catalog
      </Text>

      {(typedData.elements || []).map((element, index: number) => (
        <Group key={index} gap="xs">
          <ContainedTextField
            flex={1}
            label="Product ID"
            placeholder="Enter product ID"
            value={element.id || ""}
            onChange={(e) => {
              const newElements = [...(typedData.elements || [])];
              newElements[index] = {
                ...newElements[index],
                id: e.target.value,
              };
              handleInputChange("elements", newElements);
            }}
          />
          <ContainedTextField
            flex={1}
            label="Retailer ID (optional)"
            placeholder="Retailer ID"
            value={element.retailer_id || ""}
            onChange={(e) => {
              const newElements = [...(typedData.elements || [])];
              newElements[index] = {
                ...newElements[index],
                retailer_id: e.target.value,
              };
              handleInputChange("elements", newElements);
            }}
          />
          <ActionIcon
            style={{ marginTop: "20px" }}
            variant="subtle"
            onClick={() => {
              const newElements = [...(typedData.elements || [])];
              newElements.splice(index, 1);
              handleInputChange("elements", newElements);
            }}
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Button
        variant="outline"
        onClick={() => {
          const newElements = [
            ...(typedData.elements || []),
            { id: "", retailer_id: "" },
          ];
          handleInputChange("elements", newElements);
        }}
      >
        + Add Product
      </Button>
    </Stack>
  );
};

// Instagram Ice Breaker Node Editor
const InstagramIceBreakerNodeEditor: React.FC<
  NodeComponentProps<"instagramIceBreakerNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <Stack gap={"xs"}>
      <Text size="sm" fw={500}>
        Ice Breakers
      </Text>
      <Text size="xs" c="dimmed">
        Add conversation starters that appear in the Instagram chat. Users can
        tap these to start a conversation.
      </Text>

      {(typedData.iceBreakers || []).map((iceBreaker, index: number) => (
        <Group key={index} gap="xs" align="flex-start">
          <Stack flex={1} gap="xs">
            <ContainedTextField
              label="Question"
              placeholder="e.g., What are your hours?"
              value={iceBreaker.question || ""}
              onChange={(e) => {
                const newIceBreakers = [...(typedData.iceBreakers || [])];
                newIceBreakers[index] = {
                  ...newIceBreakers[index],
                  question: e.target.value,
                };
                handleInputChange("iceBreakers", newIceBreakers);
              }}
            />
            <ContainedTextField
              label="Payload (optional)"
              placeholder="Custom data for tracking"
              value={iceBreaker.payload || ""}
              onChange={(e) => {
                const newIceBreakers = [...(typedData.iceBreakers || [])];
                newIceBreakers[index] = {
                  ...newIceBreakers[index],
                  payload: e.target.value,
                };
                handleInputChange("iceBreakers", newIceBreakers);
              }}
            />
          </Stack>
          <ActionIcon
            style={{ marginTop: "20px" }}
            color="red"
            variant="subtle"
            onClick={() => {
              const newIceBreakers = [...(typedData.iceBreakers || [])];
              newIceBreakers.splice(index, 1);
              handleInputChange("iceBreakers", newIceBreakers);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Button
        variant="outline"
        leftSection={<IconPlus size={16} />}
        onClick={() => {
          const newIceBreakers = [
            ...(typedData.iceBreakers || []),
            { question: "", payload: "" },
          ];
          handleInputChange("iceBreakers", newIceBreakers);
        }}
      >
        Add Ice Breaker
      </Button>

      <Text size="xs" c="dimmed" mt="xs">
        Note: Ice breakers are displayed to users when they first open a
        conversation with your Instagram account.
      </Text>
    </Stack>
  );
};
