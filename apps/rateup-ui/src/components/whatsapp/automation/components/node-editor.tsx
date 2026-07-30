import {
  IconBrandFacebookFilled,
  IconCheck,
  IconDeviceFloppy,
  IconExclamationCircle,
  IconFile,
  IconMusic,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { EditorContent } from "@tiptap/react";
import dayjs from "dayjs";
import { FileWarningIcon, RefreshCwIcon, TypeOutline, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm as useRHForm, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/** A WhatsApp template row, as the templates endpoint returns it. */
interface WaTemplateRow {
  id: string;
  data?: {
    name?: string;
    components?: Array<{
      type?: string;
      buttons?: Array<Record<string, unknown>>;
    }>;
  };
}

/** A row inside a list-message section. */
interface ListRow {
  title?: string;
  description?: string;
}

/** A catalog product row, as the catalog-products endpoint returns it. */
interface CatalogProduct {
  retailer_id: string;
  productProps?: { title?: string };
}

/** A team member, as the automation assign-node options endpoint returns it. */
interface AutomationUser {
  id: string;
  name: string;
  teams: Array<{ team_id?: string; team_name?: string }>;
}
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { useImmer } from "use-immer";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
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
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import InsertEmoji from "@/components/RichTextEditor/InsertEmoji/index.tsx";
import { WaTextCharacterCount } from "@/components/RichTextEditor/wa-editor/character-count.tsx";
import { useWaEditor } from "@/components/RichTextEditor/wa-editor/use-wa-editor.ts";
import type { Board, Column } from "@/components/Tickets/types.ts";
import { BlockquoteToolbar } from "@/components/tiptap/toolbars/blockquote.tsx";
import { BoldToolbar } from "@/components/tiptap/toolbars/bold.tsx";
import { BulletListToolbar } from "@/components/tiptap/toolbars/bullet-list.tsx";
import { CodeToolbar } from "@/components/tiptap/toolbars/code.tsx";
import { ItalicToolbar } from "@/components/tiptap/toolbars/italic.tsx";
import { OrderedListToolbar } from "@/components/tiptap/toolbars/ordered-list.tsx";
import { RedoToolbar } from "@/components/tiptap/toolbars/redo.tsx";
import { StrikeThroughToolbar } from "@/components/tiptap/toolbars/strikethrough.tsx";
import { ToolbarProvider } from "@/components/tiptap/toolbars/toolbar-provider.tsx";
import { UndoToolbar } from "@/components/tiptap/toolbars/undo.tsx";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { FileConverter } from "@/components/whatsapp/flow-v2/input/DataSource.tsx";
import WaTemplateFormElements, {
  NoParams,
} from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/templateDisplayModal/templatePreview/formElements/index.tsx";
import { deleteUploadedFiles, getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import type {
  CatalogNodeData,
  LeadgenNodeData,
  NodeData,
  NodeType,
  NodeTypeMap,
  TypedNode,
  WhatsappProductSet,
} from "../types/node-types.ts";
import { firstNodeError, nodeResolver } from "../types/node-validation.ts";
import {
  ContainedDatePickerInput,
  ContainedMultiSelect,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
  FileButton,
  isNotEmpty,
  Radio,
  RadioGroup,
  SegmentedControl,
  Select,
  Switch,
  useForm,
} from "./editor-ui.tsx";
import { FlowPanel } from "./flow-panel.tsx";
import { getNodeLabel, getNodeVisual } from "./nodes/node-config.tsx";

// Tailwind class map (replaces the former node-editor.module.css)
const styles = {
  nodeEditor:
    "absolute right-0 top-0 z-10 flex h-full w-[340px] flex-col border-l border-border bg-card text-card-foreground shadow-[-8px_0_24px_rgba(0,0,0,0.12)]",
  editorHeader: "flex items-center justify-between gap-2 border-b border-border px-4 py-3.5",
  editorHeaderTitle: "flex min-w-0 items-center gap-2 text-[15px] font-semibold",
  editorHeaderDot: "size-2 shrink-0 rounded-full",
  closeButton:
    "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
  editorContent: "flex-1 overflow-y-auto p-4",
  editorSection: "mb-5 flex flex-col gap-2",
  editorFooter: "flex justify-end border-t border-border p-4",
  optionRow: "mb-2 flex",
  conditionalHelp: "mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground",
  contactSection: "rounded-md border border-border bg-muted",
  sectionContainer: "rounded-md border border-border",
  rowContainer: "rounded-md bg-muted",
} as const;

// Node editor props
interface NodeEditorProps {
  node: TypedNode;
  onChange: (nodeId: string, data: NodeData) => void;
  onClose: () => void;
}

export default function NodeEditor({ node, onChange, onClose }: Readonly<NodeEditorProps>) {
  const { data: templates, isLoading } = useWaTemplates();
  const { data: flows, isPending } = useWaFlowsFromDb();
  // Tickets are a free feature — always available.
  const hasTicketFeature = true;
  const { data: boardData, isLoading: isBoardsPending } = useBoardsQueries(hasTicketFeature);
  const { data: teamMembers, isPending: isLoadingTeamMembers } = useTeamsMembersOfOrg();
  const session = useSessionContext() as {
    userId: string;
  };

  // react-hook-form is the single source of truth for the editor. Values sync
  // back to the flow on every change; the resolver produces per-field errors
  // (shown inline) and drives the node card's invalid border.
  const form = useRHForm<NodeData>({
    defaultValues: node.data,
    resolver: nodeResolver(node.type),
    mode: "onChange",
  });
  const nodeData = form.watch();
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;
  // Errors are only surfaced after the first Save attempt (then live-updated).

  // Reset whenever a different node is opened — no validation until Save.
  useEffect(() => {
    form.reset(node.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  // Writes any field of the node currently being edited. The child editors
  // declare their own node's `keyof`, which is assignable to `string` here.
  const handleInputChange = (key: string, value: unknown) => {
    form.setValue(key as any, value, {
      shouldDirty: true,
    });
    onChange(node.id, form.getValues());
  };

  // Handle done button with validation
  const handleDone = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast.error(firstNodeError({ ...node, data: form.getValues() }));
      return;
    }
    onClose();
  };

  // Render different editor based on node type with proper type casting
  const renderEditor = () => {
    const nodeType = node.type;
    if (isPending || isLoading || isBoardsPending || isLoadingTeamMembers) return <RateupLoader />;

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
    <FlowPanel
      side="right"
      title={nodeData.label || getNodeLabel(node.type)}
      icon={
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: getNodeVisual(node.type).color }}
        />
      }
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={handleDone}>
          Save
        </Button>
      }
    >
      <FormProvider {...form}>
        <div className={styles.editorSection}>
          <ContainedTextField
            type="text"
            label="Node Label"
            value={nodeData.label || ""}
            onChange={(e) => handleInputChange("label", e.target.value)}
            placeholder="Enter node label..."
            error={errors.label?.message}
          />
        </div>

        {renderEditor()}
      </FormProvider>
    </FlowPanel>
  );
}

// Define props type for all node components
type FieldErrors = Record<string, { message?: string } | undefined>;

/** Read the inline error message for a given field name from the RHF context. */
function useFieldError(name: string): string | undefined {
  const { formState } = useFormContext();
  return (formState.errors as FieldErrors)[name]?.message;
}

/** Inline error message for fields that aren't wrapped in a shadcn Field (rich
 * text, dynamic arrays, etc.). */
function FieldMsg({ name, message }: Readonly<{ name?: string; message?: string }>) {
  const contextError = useFieldError(name ?? "");
  const text = message ?? (name ? contextError : undefined);
  if (!text) return null;
  return <p className="text-xs font-normal text-destructive">{text}</p>;
}

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
  const bodyEditor = useWaEditor({
    content: typedData.body || "",
    placeholder: "Enter your message text here...",
    max: 4096,
    onChange: (value) => handleInputChange("body", value),
  });
  return (
    <div className={styles.editorSection}>
      <div className="text-xs font-bold text-muted-foreground">
        Message Text <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={bodyEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={bodyEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={bodyEditor} max={4096} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={bodyEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      <FieldMsg name="body" />
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
const ConditionalNodeEditor: React.FC<NodeComponentProps<"conditionalNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <div className={styles.editorSection}>
      <ContainedTextField
        label="Condition"
        value={typedData.condition || ""}
        onChange={(e) => handleInputChange("condition", e.target.value)}
        placeholder="Enter condition (e.g., {{variable}} == 'value')"
        error={useFieldError("condition")}
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
    "textInputNode" | "numberInputNode" | "emailInputNode" | "phoneInputNode" | "dateInputNode"
  >
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;
  const questionEditor = useWaEditor({
    content: typedData.question || "",
    placeholder: "Enter your question text here...",
    max: 4096,
    onChange: (value) => handleInputChange("question", value),
  });
  return (
    <div className={styles.editorSection}>
      <div className="text-xs font-bold text-muted-foreground">
        Question Text <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={questionEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={questionEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={questionEditor} max={4096} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={questionEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      <FieldMsg name="question" />

      <ContainedTextField
        label="Save Answer to Variable"
        value={typedData.variableName || ""}
        onChange={(e) => handleInputChange("variableName", e.target.value)}
        placeholder="Variable name (e.g., user_email)"
        error={useFieldError("variableName")}
      />

      {/* <FieldLabel htmlFor="validation">Validation (optional)</FieldLabel>
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
    <div className="flex flex-col gap-4">
      <ContainedNumberInput
        label="Pause Duration"
        min={1}
        value={typedData.duration?.toString()}
        onChange={(val) => handleInputChange("duration", val)}
        description="Duration to pause the automation flow"
        error={useFieldError("duration")}
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
    </div>
  );
};

// MediaNode Component
const MediaNodeEditor: React.FC<
  NodeComponentProps<
    "documentNode" | "imageNode" | "videoNode" | "audioNode" | "buttonNode" | "ctaUrlNode"
  > & { nodeType: NodeType; disableCaption?: boolean }
> = ({ nodeData, handleInputChange, nodeType, disableCaption = false }) => {
  const typedData = nodeData;
  const captionEditor = useWaEditor({
    content: typedData.caption || "",
    placeholder: "Enter caption...",
    max: 1024,
    onChange: (value) => handleInputChange("caption", value),
  });
  const [media, setMedia] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const { t: translations } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const resetRef = useRef<() => void>(null);
  const filenameError = useFieldError("filename");

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
        toast.error(`size warning: Max file size is ${getFileSizeLimitText()}`, {
          id: "file-size",
        });
        return setMediaError(`size warning: Max ${getFileSizeLimitText()}`);
      }
      setMediaError("");
      const base64String = await FileConverter.fileToBase64(file, true);
      setMedia(base64String);
      setFile(file);
    } catch (error) {
      toast.error(translations("Error converting file to Base64:") + JSON.stringify(error), {
        id: "file-converting",
      });
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
          : translations("Error uploading file to server:") + JSON.stringify(error),
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

  const MediaIcon =
    nodeType === "imageNode"
      ? IconPhoto
      : nodeType === "videoNode"
        ? IconVideo
        : nodeType === "audioNode"
          ? IconMusic
          : IconFile;
  const isImage = nodeType === "imageNode";
  const previewSrc = media || (typedData?.link ? getFileUrlFromKey(typedData.link) : undefined);
  const hasMedia = !!file || !!typedData?.link;
  const showCard = hasMedia || loading;
  const canPreview = !!previewSrc && !loading && !mediaError;
  const state: "idle" | "uploading" | "error" | "done" = mediaError
    ? "error"
    : loading
      ? "uploading"
      : hasMedia
        ? "done"
        : "idle";

  return (
    <div className="flex flex-col gap-2.5">
      {!showCard ? (
        <FileButton resetRef={resetRef} onChange={handleFileChange} accept={getAcceptType()}>
          {(props) => (
            <button type="button" onClick={props.onClick} className="w-full text-left">
              <Attachment state="idle" className="w-full cursor-pointer">
                <AttachmentMedia>
                  <IconUpload />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>Select a file</AttachmentTitle>
                  <AttachmentDescription>Max size {getFileSizeLimitText()}</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            </button>
          )}
        </FileButton>
      ) : (
        <Dialog>
          <Attachment state={state} className="w-full">
            <AttachmentMedia variant={isImage ? "image" : "icon"}>
              {loading ? (
                <Spinner />
              ) : mediaError ? (
                <FileWarningIcon />
              ) : isImage && previewSrc ? (
                <img src={previewSrc} alt="Media preview" />
              ) : (
                <MediaIcon />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{file?.name || "Uploaded file"}</AttachmentTitle>
              <AttachmentDescription>
                {loading
                  ? "Uploading…"
                  : mediaError
                    ? "Upload failed"
                    : canPreview
                      ? "Click to preview"
                      : file
                        ? "Not uploaded yet"
                        : `Uploaded · max ${getFileSizeLimitText()}`}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              {!loading && (
                <FileButton
                  resetRef={resetRef}
                  onChange={handleFileChange}
                  accept={getAcceptType()}
                >
                  {(props) => (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <AttachmentAction aria-label="Replace file" onClick={props.onClick}>
                            <RefreshCwIcon />
                          </AttachmentAction>
                        }
                      />
                      <TooltipContent>Replace file</TooltipContent>
                    </Tooltip>
                  )}
                </FileButton>
              )}
              {!loading && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <AttachmentAction
                        aria-label="Remove file"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => clearFile(!!typedData?.link)}
                      >
                        <XIcon />
                      </AttachmentAction>
                    }
                  />
                  <TooltipContent>Remove file</TooltipContent>
                </Tooltip>
              )}
            </AttachmentActions>
            {canPreview && (
              <DialogTrigger render={<AttachmentTrigger aria-label="Preview media" />} />
            )}
          </Attachment>
          {canPreview && (
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="truncate pr-6">{file?.name || "Preview"}</DialogTitle>
              </DialogHeader>
              {isImage ? (
                <img
                  src={previewSrc}
                  alt="Media preview"
                  className="max-h-[70vh] w-full rounded-lg object-contain"
                />
              ) : nodeType === "videoNode" ? (
                <video src={previewSrc} controls className="max-h-[70vh] w-full rounded-lg" />
              ) : nodeType === "audioNode" ? (
                <audio src={previewSrc} controls className="w-full" />
              ) : (
                <iframe
                  src={previewSrc}
                  title="Document preview"
                  className="h-[70vh] w-full rounded-lg border border-border"
                />
              )}
            </DialogContent>
          )}
        </Dialog>
      )}

      <FieldMsg name="link" />

      {mediaError && <p className="text-center text-xs text-destructive">{mediaError}</p>}

      {file && (
        <Button onClick={uploadFileData} disabled={loading}>
          {loading ? <Spinner /> : <IconDeviceFloppy />}
          {loading ? "Uploading..." : "Upload"}
        </Button>
      )}
      {nodeType !== "audioNode" && !disableCaption && (
        <>
          <div className="text-xs font-bold text-muted-foreground">Caption (optional)</div>
          <div className="flex items-start space-x-2 pb-0">
            <div className="flex-1">
              <ToolbarProvider editor={captionEditor!}>
                <TooltipProvider>
                  <EditorContent
                    editor={captionEditor}
                    style={{
                      backgroundColor: "var(--accent)",
                      borderRadius: "5px",
                      maxHeight: "200px",
                      minHeight: "120px",
                    }}
                    className="overflow-y-auto rounded-xl"
                  />
                  <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                    <WaTextCharacterCount editor={captionEditor} max={1024} />
                  </div>
                  <div className="flex flex-wrap p-2">
                    <div className="mt-1 flex items-center">
                      <InsertEmoji editor={captionEditor} />
                    </div>
                    <Popover>
                      <PopoverTrigger>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                          <TypeOutline className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full">
                        <div className="flex flex-nowrap gap-1">
                          <div className="flex items-center">
                            <BoldToolbar />
                            <ItalicToolbar />
                            <StrikeThroughToolbar />
                            <CodeToolbar />
                          </div>
                          <div className="flex items-center">
                            <BlockquoteToolbar />
                            <BulletListToolbar />
                            <OrderedListToolbar />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-center">
                      <UndoToolbar />
                      <RedoToolbar />
                    </div>
                  </div>
                </TooltipProvider>
              </ToolbarProvider>
            </div>
          </div>
        </>
      )}
      {nodeType === "documentNode" && (
        <ContainedTextField
          mt={"sm"}
          label={"FileName (optional)"}
          value={(typedData as NodeTypeMap["documentNode"]).filename || ""}
          onChange={(e) =>
            (handleInputChange as unknown as (key: "filename", value: string) => void)(
              "filename",
              e.target.value,
            )
          }
          maxLength={1024}
          placeholder="Enter FileName..."
          description={"Supports FileName with maximum 1024 characters."}
          error={filenameError}
        />
      )}
    </div>
  );
};

// StartNode Component
const StartNodeEditor: React.FC<NodeComponentProps<"startNode">> = () => {
  return (
    <div className={styles.editorSection}>
      <ContainedTextField label="Start Message" disabled />
    </div>
  );
};

// ButtonNode Component
const ButtonNodeEditor: React.FC<NodeComponentProps<"buttonNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const bodyEditor = useWaEditor({
    content: typedData.body || "",
    placeholder: "Enter message text...",
    max: 1024,
    onChange: (value) => handleInputChange("body", value),
  });
  const footerEditor = useWaEditor({
    content: typedData.footer || "",
    placeholder: "Enter footer text...",
    max: 60,
    onChange: (value) => handleInputChange("footer", value),
  });
  const newButtonRef = useRef<HTMLInputElement | null>(null);
  const headerError = useFieldError("header");

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
    const newButtons = [...(typedData.buttons || []), { id: `button-${Date.now()}`, title: "" }];
    handleInputChange("buttons", newButtons);

    // Focus will be set after render via useEffect
    setTimeout(() => {
      if (newButtonRef.current) {
        newButtonRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="flex flex-col gap-2">
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
          error={headerError}
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
      <div className="text-xs font-bold text-muted-foreground">
        Body Text (Required) <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={bodyEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={bodyEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={bodyEditor} max={1024} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={bodyEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      <FieldMsg name="body" />

      <div className="text-xs font-bold text-muted-foreground">Footer Text</div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={footerEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={footerEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={footerEditor} max={60} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={footerEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>

      {/* Buttons - At least one required */}
      <p className="mt-2 text-sm">Buttons (At least one required)</p>
      <FieldMsg name="buttons" />

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
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  const newButtons = [...(typedData.buttons || [])];
                  newButtons.splice(index, 1);
                  handleInputChange("buttons", newButtons);
                }}
              >
                <IconX size={16} />
              </Button>
            }
            ref={index === typedData.buttons?.length - 1 ? newButtonRef : null}
          />
        </div>
      ))}
      <Button disabled={typedData.buttons?.length >= 3} onClick={addNewButton}>
        + Add Button
      </Button>
    </div>
  );
};

// ListNode Component
const ListNodeEditor: React.FC<NodeComponentProps<"listNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const bodyEditor = useWaEditor({
    content: typedData.body || "",
    placeholder: "Enter message text...",
    max: 4096,
    onChange: (value) => handleInputChange("body", value),
  });
  const footerEditor = useWaEditor({
    content: typedData.footer || "",
    placeholder: "Enter footer text...",
    max: 60,
    onChange: (value) => handleInputChange("footer", value),
  });
  const getTotalRowCount = (sections: any[] = []) => {
    return sections.reduce((count, section) => {
      return count + (section.rows?.length || 0);
    }, 0);
  };
  return (
    <div className="flex flex-col gap-2">
      <ContainedTextField
        onChange={(e) => handleInputChange("header", e?.target?.value)}
        value={typedData.header || ""}
        placeholder="Enter header text..."
        label="Header Text"
        maxLength={60}
      />
      <div className="text-xs font-bold text-muted-foreground">
        Body Text <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={bodyEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={bodyEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={bodyEditor} max={4096} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={bodyEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      <FieldMsg name="body" />

      <div className="text-xs font-bold text-muted-foreground">Footer (optional)</div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={footerEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={footerEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={footerEditor} max={60} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={footerEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>

      <ContainedTextField
        label="Button Text"
        placeholder="Enter button text"
        value={typedData.button || ""}
        onChange={(e) => handleInputChange("button", e.target.value)}
        maxLength={20}
        description="Button text shown at the bottom of the list (max 20 characters)"
        error={useFieldError("button")}
      />

      <p className="mt-2 font-medium">Sections</p>
      <p className="text-xs text-muted-foreground">
        Interactive list messages support up to 10 sections, with up to 10 rows across all sections
        combined
      </p>
      <FieldMsg name="sections" />

      {(typedData.sections || []).map((section: any, sectionIndex: number) => (
        <div
          key={sectionIndex}
          className={`${styles.sectionContainer} my-2 flex flex-col gap-4 p-2`}
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => {
                  const newSections = [...(typedData.sections || [])];
                  newSections.splice(sectionIndex, 1);
                  handleInputChange("sections", newSections);
                }}
              >
                <IconX size={16} />
              </Button>
            }
          />

          <p className="text-sm font-medium">Rows</p>
          {(section.rows || []).map((row: any, rowIndex: number) => (
            <div key={rowIndex} className={`${styles.rowContainer} flex flex-col gap-2 p-2`}>
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    const newSections = [...(typedData.sections || [])];
                    newSections[sectionIndex].rows.splice(rowIndex, 1);
                    handleInputChange("sections", newSections);
                  }}
                >
                  <IconX size={14} />
                </Button>
              </div>
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
            </div>
          ))}
          <Button
            variant="ghost"
            size="xs"
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
        </div>
      ))}

      <Button
        variant="outline"
        disabled={(typedData.sections?.length ?? 0) >= 10}
        onClick={() => {
          const newSections = [
            ...(typedData.sections || []),
            // NOTE: seeds `rows`, while the catalog section shape and the editor
            // above both use `productItems` — see the migration notes.
            { title: "", rows: [] as string[] },
          ];
          handleInputChange("sections", newSections);
        }}
        className="mt-2"
      >
        + Add Section
      </Button>
    </div>
  );
};

// CtaUrlNode Component
const CtaUrlNodeEditor: React.FC<NodeComponentProps<"ctaUrlNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  const bodyEditor = useWaEditor({
    content: typedData.body || "",
    placeholder: "Enter message text...",
    max: 1024,
    onChange: (value) => handleInputChange("body", value),
  });
  const footerEditor = useWaEditor({
    content: typedData.footer || "",
    placeholder: "Enter footer text...",
    max: 60,
    onChange: (value) => handleInputChange("footer", value),
  });

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

  return (
    <div className="flex flex-col gap-2">
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

      <div className="text-xs font-bold text-muted-foreground">
        Body Text <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={bodyEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={bodyEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={bodyEditor} max={1024} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={bodyEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      <FieldMsg name="body" />

      <div className="text-xs font-bold text-muted-foreground">Footer (optional)</div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={footerEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={footerEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={footerEditor} max={60} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={footerEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>

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
        error={useFieldError("display_text")}
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
        error={useFieldError("url")}
      />
    </div>
  );
};

// TemplateNode Component
const TemplateNodeEditor: React.FC<NodeComponentProps<"templateNode"> & { templates: any }> = ({
  nodeData,
  handleInputChange,
  templates,
}) => {
  const typedData = nodeData;
  const [parameterData, setParameterData] = useImmer<any>(typedData?.parameters || []);
  const templateData =
    templates?.map((t: WaTemplateRow) => ({
      label: t.data?.name,
      value: t.id,
      flowId: t.data?.components?.find((c) => c.type === "BUTTONS")?.buttons?.[0]?.["flow_id"],
    })) || [];
  const selectedTemplate = templates?.find((t: { id: string }) => t.id === typedData?.template?.id);
  const params = useParams({
    strict: false,
  });

  const flowbotId = params.flowbotId as string;
  const { data: waSettings, isLoading: isSettingsLoading } = useWaSettings();
  const { data, isPending } = useWaAutomatedReplyById(flowbotId);
  const waSetting =
    waSettings &&
    (waSettings.find((w) => w.phoneId === data?.whatsappSettingsPhoneId) ?? waSettings[0]);
  const waSettingsId = data && waSetting ? waSetting.id : "";
  const { data: metaAssets, isLoading } = useMetaAssets(waSettingsId);
  const leadgenData = useMemo(() => {
    if (waSettingsId && metaAssets) {
      const leadgenNode = data?.matchData?.json?.nodes.find(
        (node: { type?: string }) => node.type === "leadgenNode",
      );
      if (leadgenNode?.data?.leadgenFormId?.length) {
        const leadgenForm = metaAssets?.leadgenForms.find(
          (form) => form.id === leadgenNode?.data?.leadgenFormId,
        );
        return {
          data: leadgenNode?.data,
          formQuestions: leadgenForm!.questions,
        };
      }
    }
  }, [metaAssets, waSettingsId]);
  // Update template parameters when they change
  useEffect(() => {
    handleInputChange("parameters", parameterData);
  }, [parameterData]);

  const templateError = useFieldError("template");

  if (isPending || isLoading || isSettingsLoading) return <RateupLoader />;

  return (
    <div className="flex flex-col gap-4">
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
        error={templateError}
      />
      {templateData?.find((t: { value: string }) => t.value === typedData?.template?.id)
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
        <div className="flex h-[60dvh] flex-col items-center justify-center gap-4">
          <NoParams type={"Body"} />
        </div>
      ) : (
        <WaTemplateFormElements
          setParameterData={setParameterData}
          template={selectedTemplate?.data}
          parameters={parameterData}
          leadgenData={leadgenData}
        />
      )}
    </div>
  );
};

// LocationNode Component
const LocationNodeEditor: React.FC<NodeComponentProps<"locationNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;
  return (
    <div className="flex flex-col gap-2">
      <ContainedTextField
        label="Location Name"
        placeholder="Enter location name..."
        value={typedData.name || ""}
        onChange={(e) => handleInputChange("name", e.target.value)}
        description="Name of the location to be shared"
      />

      <div className="flex flex-wrap items-center gap-2.5 *:flex-1">
        <ContainedTextField
          label="Latitude"
          required
          placeholder="e.g., 37.7749"
          value={typedData.latitude || ""}
          onChange={(e) => handleInputChange("latitude", e.target.value)}
          description="Decimal latitude coordinate"
          error={useFieldError("latitude")}
        />

        <ContainedTextField
          label="Longitude"
          required
          placeholder="e.g., -122.4194"
          value={typedData.longitude || ""}
          onChange={(e) => handleInputChange("longitude", e.target.value)}
          description="Decimal longitude coordinate"
          error={useFieldError("longitude")}
        />
      </div>

      <ContainedTextField
        label="Address (optional)"
        placeholder="Enter full address..."
        value={typedData.address || ""}
        onChange={(e) => handleInputChange("address", e.target.value)}
        description="Full address that corresponds to these coordinates"
      />

      <p className="mt-2 text-xs text-muted-foreground">
        Note: Both latitude and longitude are required for a valid location message
      </p>
    </div>
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

    // Navigate to the nested property and update it. The path is dynamic, so
    // the walk goes through an open view of the contact object.
    let current = newContacts[index] as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        // Initialize as object or array based on next path segment
        current[path[i]] = isNaN(Number(path[i + 1])) ? {} : [];
      }
      current = current[path[i]] as Record<string, unknown>;
    }
    current[path[path.length - 1]] = value;

    handleInputChange("contacts", newContacts);
  };

  const activeContact = typedData.contacts?.[activeContactIndex] || {};

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="mt-2 font-medium">Contacts ({typedData.contacts?.length || 0}/257)</p>
        <Button size="xs" disabled={typedData.contacts?.length >= 257} onClick={addNewContact}>
          <IconPlus size={16} /> Add Contact
        </Button>
      </div>
      <FieldMsg name="contacts" />

      {typedData.contacts && typedData.contacts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-6 text-destructive"
              onClick={() => removeContact(activeContactIndex)}
            >
              <IconTrash size={16} />
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Create contact cards to share with your users</p>

      {/* Name section - formatted_name is required */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <p className="text-sm font-medium">Contact Name</p>
        <ContainedTextField
          label="Full Name"
          required
          placeholder="Enter full name"
          value={activeContact?.name?.formatted_name || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "formatted_name"], e.target.value);
          }}
          description="Required - Full name as it should appear"
        />

        <ContainedTextField
          label="First Name"
          placeholder="First name"
          required
          value={activeContact?.name?.first_name || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "first_name"], e.target.value);
          }}
        />
        <ContainedTextField
          label="Last Name"
          placeholder="Last name"
          value={activeContact?.name?.last_name || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "last_name"], e.target.value);
          }}
        />

        <ContainedTextField
          label="Middle Name"
          placeholder="Middle name"
          value={activeContact?.name?.middle_name || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "middle_name"], e.target.value);
          }}
        />
        <ContainedTextField
          label="Prefix"
          placeholder="e.g., Dr., Mr."
          value={activeContact?.name?.prefix || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "prefix"], e.target.value);
          }}
        />
        <ContainedTextField
          label="Suffix"
          placeholder="e.g., Jr., Ph.D."
          value={activeContact?.name?.suffix || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["name", "suffix"], e.target.value);
          }}
        />
      </div>

      {/* Organization section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <p className="text-sm font-medium">Organization</p>
        <ContainedTextField
          label="Company"
          placeholder="Company or organization name"
          value={activeContact?.org?.company || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["org", "company"], e.target.value);
          }}
        />

        <ContainedTextField
          label="Department"
          placeholder="Department name"
          value={activeContact?.org?.department || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["org", "department"], e.target.value);
          }}
        />
        <ContainedTextField
          label="Job Title"
          placeholder="Job title"
          value={activeContact?.org?.title || ""}
          onChange={(e) => {
            updateContactField(activeContactIndex, ["org", "title"], e.target.value);
          }}
        />
      </div>

      {/* Birthday */}
      <ContainedDatePickerInput
        label="Birthday"
        placeholder="YYYY-MM-DD"
        value={activeContact?.birthday ? new Date(activeContact.birthday) : undefined}
        onChange={(e) =>
          updateContactField(activeContactIndex, ["birthday"], dayjs(e).format("YYYY-MM-DD"))
        }
      />

      {/* Phones section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-sm font-medium">Phone Numbers</p>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const phones = [...(activeContact?.phones || []), { phone: "", type: "CELL" }];
              updateContactField(activeContactIndex, ["phones"], phones);
            }}
          >
            + Add Phone
          </Button>
        </div>

        {(activeContact?.phones || []).map((phone, index) => (
          <div key={index} className="flex flex-col gap-4">
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
              onChange={(value) => {
                const typedValue = value as "HOME" | "WORK" | "CELL" | "MAIN";
                const phones = [...(activeContact?.phones || [])];
                phones[index] = { ...phones[index], type: typedValue };
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => {
                const phones = [...(activeContact?.phones || [])];
                phones.splice(index, 1);
                updateContactField(activeContactIndex, ["phones"], phones);
              }}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
      </div>

      {/* Emails section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-sm font-medium">Email Addresses</p>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const emails = [...(activeContact?.emails || []), { email: "", type: "WORK" }];
              updateContactField(activeContactIndex, ["emails"], emails);
            }}
          >
            + Add Email
          </Button>
        </div>

        {(activeContact?.emails || []).map((email, index) => (
          <div key={index} className="flex flex-col gap-4">
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
              onChange={(value) => {
                const typedValue = value as "WORK" | "HOME" | "OTHER";
                const emails = [...(activeContact?.emails || [])];
                emails[index] = { ...emails[index], type: typedValue };
                updateContactField(activeContactIndex, ["emails"], emails);
              }}
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => {
                const emails = [...(activeContact?.emails || [])];
                emails.splice(index, 1);
                updateContactField(activeContactIndex, ["emails"], emails);
              }}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
      </div>

      {/* Addresses section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-sm font-medium">Addresses</p>
          <Button
            size="xs"
            variant="ghost"
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
        </div>

        {(activeContact?.addresses || []).map((address, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <p className="text-sm">Address {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => {
                  const addresses = [...(activeContact?.addresses || [])];
                  addresses.splice(index, 1);
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
              >
                <IconX size={16} />
              </Button>
            </div>

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
                updateContactField(activeContactIndex, ["addresses"], addresses);
              }}
            />

            <div className="flex flex-wrap items-center gap-2.5 *:flex-1">
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
                  updateContactField(activeContactIndex, ["addresses"], addresses);
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
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
              />
            </div>

            <div className="flex flex-col gap-4">
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
                  updateContactField(activeContactIndex, ["addresses"], addresses);
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
                  updateContactField(activeContactIndex, ["addresses"], addresses);
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
                  updateContactField(activeContactIndex, ["addresses"], addresses);
                }}
                description="ISO two-letter code"
              />
            </div>

            <Select
              label="Address Type"
              data={[
                { value: "HOME", label: "Home" },
                { value: "WORK", label: "Work" },
                { value: "OTHER", label: "Other" },
              ]}
              value={address.type || "HOME"}
              onChange={(value) => {
                const typedValue = value as "WORK" | "HOME" | "OTHER";
                const addresses = [...(activeContact?.addresses || [])];
                addresses[index] = { ...addresses[index], type: typedValue };
                updateContactField(activeContactIndex, ["addresses"], addresses);
              }}
              style={{ maxWidth: 200 }}
            />
          </div>
        ))}
      </div>

      {/* URLs section */}
      <div className={`${styles.contactSection} flex flex-col gap-4 p-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-sm font-medium">Websites</p>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const urls = [...(activeContact?.urls || []), { url: "", type: "WORK" }];
              updateContactField(activeContactIndex, ["urls"], urls);
            }}
          >
            + Add Website
          </Button>
        </div>

        {(activeContact?.urls || []).map((url, index) => (
          <div key={index} className="flex flex-col gap-4">
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
              onChange={(value) => {
                const typedValue = value as "WORK" | "HOME" | "OTHER" | "PROFILE";
                const urls = [...(activeContact?.urls || [])];
                urls[index] = { ...urls[index], type: typedValue };
                updateContactField(activeContactIndex, ["urls"], urls);
              }}
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => {
                const urls = [...(activeContact?.urls || [])];
                urls.splice(index, 1);
                updateContactField(activeContactIndex, ["urls"], urls);
              }}
            >
              <IconX size={16} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// TicketNode Component
const TicketNodeEditor: React.FC<NodeComponentProps<"ticketNode"> & { options: any }> = ({
  nodeData,
  handleInputChange,
  options,
}) => {
  const typedData = nodeData;
  const ticketError = useFieldError("ticket");
  const [selectedBoard, setSelectedBoard] = useState({
    selectedBoardId: typedData.ticket?.selectedBoardId,
    selectedBoardColumnId: typedData.ticket?.selectedBoardColumnId,
  });

  // Transform boards for Select component
  const boards = useMemo(
    () => options?.map((board: Board) => ({ value: board.id, label: board.title })),
    [],
  );

  // Get columns for selected board
  const columns = useMemo(() => {
    const board = options?.find((board: Board) => board.id === selectedBoard?.selectedBoardId);
    return board
      ? board.ticketColumns.map((col: Column) => ({
          value: col.id,
          label: col.title,
        }))
      : [];
  }, [options, selectedBoard?.selectedBoardId]);

  return (
    <div className="flex flex-col gap-2">
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
          error={ticketError}
        />
      )}
    </div>
  );
};

// TicketNode Component
const AssignNodeEditor: React.FC<NodeComponentProps<"assignNode"> & { options: any }> = ({
  nodeData,
  handleInputChange,
  options,
}) => {
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
          ?.flatMap((user: AutomationUser) => user.teams)
          ?.find((team: { team_id?: string }) => team.team_id === values.teamId)?.team_name ?? "";
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
        ?.filter((user: AutomationUser) =>
          user.teams.some((t: { team_id?: string }) => t.team_id === form.values.teamId),
        )
        .map((user: AutomationUser) => ({ value: user.id, label: user.name })),
    [options, form.values.teamId],
  );

  useEffect(() => {
    form.setFieldValue("teamId", typedData.assign?.teamId);
    form.setFieldValue("assignedUserIds", typedData.assign?.assignedUserIds ?? []);
    form.setFieldValue("choice", typedData.assign?.choice || "manual");
    form.setFieldValue("teamName", typedData.assign?.teamName || "");
    form.setFieldValue("roundRobin", typedData.assign?.roundRobin ?? false);
    form.setFieldValue("assignIfOnline", typedData.assign?.assignIfOnline ?? true);
  }, [typedData.assign]);

  return (
    <div className="flex flex-col gap-2">
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
          <div className="flex flex-wrap items-center justify-center gap-0.5">
            <IconExclamationCircle size={"1rem"} />
            <p className="text-xs">Assign the chat</p>
          </div>
          <div className="flex flex-col gap-4">
            <TeamSelector label="Select Team" {...form.getInputProps("teamId")} />
            <RadioGroup {...form.getInputProps("choice")}>
              <div className="flex flex-wrap items-center gap-2.5">
                <Radio value={"all"} label={"All Members"} />
                <Radio value={"manual"} label={"Select Manually"} />
              </div>
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
          </div>
        </>
      )}
    </div>
  );
};
// FlowNode Component
const FlowNodeEditor: React.FC<NodeComponentProps<"flowNode"> & { flows: any }> = ({
  nodeData,
  handleInputChange,
  flows,
}) => {
  const typedData = nodeData;
  return (
    <div className="flex flex-col gap-4">
      <ContainedSelection
        data={
          flows?.map((t: { dbFlowId?: string; id?: string; name?: string }) => ({
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
        error={useFieldError("flow")}
      />
      {typedData?.flow?.id && (
        <>
          <TeamSelector
            value={typedData.teamId}
            onChange={(id) => {
              handleInputChange("teamId", id);
            }}
            w={"100%"}
          />
          <FieldMsg name="teamId" />
        </>
      )}
    </div>
  );
};

// LeadgenNode Component
const LeadgenNodeEditor: React.FC<NodeComponentProps<"leadgenNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData as unknown as LeadgenNodeData;
  const params = useParams({
    strict: false,
  });
  const navigate = useNavigate();
  const flowbotId = params.flowbotId as string;
  const { data: waSettings, isLoading: isSettingsLoading } = useWaSettings();
  const { data, isPending } = useWaAutomatedReplyById(flowbotId);
  const waSetting =
    waSettings &&
    (waSettings.find((w) => w.phoneId === data?.whatsappSettingsPhoneId) ?? waSettings[0]);
  const waSettingsId = data && waSetting ? waSetting.id : "";
  const { data: metaAssets, isLoading } = useMetaAssets(waSettingsId);
  const subscribeFieldMut = useSubscribeFieldToPage(waSettingsId);
  const syncfbpageMut = useSyncFbPages(waSettingsId);
  const syncAdAccMut = useSyncAdaccounts(waSettingsId);
  const syncAdsMut = useSyncAdsByadAccounts(typedData?.adAccountId ?? "", waSettingsId);
  const syncformQuestionsMut = useSyncLeadgenFormQuestions(
    typedData?.leadgenFormId ?? "",
    waSettingsId,
  );
  const syncLeadgenFormsMut = useSyncMetaLeadgenForms(waSettingsId);

  const { pages, adAccounts, leadgenForms, ads, formQuestions } = useMemo(() => {
    type Option = { label: string; value: string };
    let pages: Option[] = [],
      adAccounts: Option[] = [],
      leadgenForms: Option[] = [],
      ads: Option[] = [],
      formQuestions: Option[] = [];
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
        ? (metaAssets.adAccounts
            .find((adacc) => adacc.id === typedData.adAccountId)
            ?.ads?.map((ad) => ({
              label: ad?.name,
              value: ad?.id,
            })) ?? [])
        : [];
      formQuestions =
        metaAssets.leadgenForms
          .find((form) => form.id === typedData?.leadgenFormId)
          ?.questions?.map((question) => question?.key) ?? [];
    }
    return { pages, adAccounts, leadgenForms, ads, formQuestions };
  }, [metaAssets, typedData.fbPageId, typedData?.adAccountId, typedData?.leadgenFormId]);

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
    localStorage.setItem("waSettingsId", waSetting?.id ?? "");
    localStorage.setItem("automationId", flowbotId);
    localStorage.setItem(
      "automationRouteBase",
      globalThis.location.pathname.includes("/dashboard/instagram/flowbots")
        ? "/dashboard/instagram/flowbots"
        : "/dashboard/whatsapp/flowbots",
    );

    const url = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${import.meta.env.VITE_META_APP_ID}&redirect_uri=${encodeURIComponent(`${import.meta.env.VITE_FRONTEND_URL}/auth/fb`)}&config_id=${import.meta.env.VITE_META_USER_CONFIG_ID}`;
    if (url) {
      navigate({
        to: url,
      });
    }
  }
  const pageAccessTokenByUser = useMemo(() => {
    if (metaAssets && typedData?.fbPageId) {
      const page = metaAssets.pages?.find((page) => page.id === typedData?.fbPageId);
      return page?.pageAccessTokenByUser;
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-[3px]">
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() => syncfbpageMut.mutate()}
                disabled={syncfbpageMut.isPending}
              >
                {syncfbpageMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync pages if not found.</TooltipContent>
        </Tooltip>
      </div>
      {!isFieldSubscribed && (
        <Button className="w-full" onClick={subscribeTolead} disabled={subscribeFieldMut.isPending}>
          {subscribeFieldMut.isPending && <Spinner />}
          Subscribe to Lead
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-0.5">
        <ContainedSelection
          data={adAccounts}
          value={typedData?.adAccountId}
          onChange={(value) => handleInputChange("adAccountId", value)}
          w={200}
          label={"Select Ad account"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() => syncAdAccMut.mutate()}
                disabled={syncAdAccMut.isPending}
              >
                {syncAdAccMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync ad accounts if not found.</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-center gap-0.5">
        <ContainedSelection
          data={leadgenForms}
          onChange={(value) => handleInputChange("leadgenFormId", value)}
          value={typedData?.leadgenFormId}
          w={200}
          label={"Select Leadgen Form"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() =>
                  syncLeadgenFormsMut.mutate({
                    fbPageId: typedData?.fbPageId,
                    pageAccessToken: typedData?.pageAccessToken,
                  })
                }
                disabled={syncLeadgenFormsMut.isPending}
              >
                {syncLeadgenFormsMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync Leadgen Forms if not found.</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        <ContainedSelection
          data={ads}
          onChange={(_value, option) =>
            handleInputChange("ad", { id: option?.value, name: option?.label })
          }
          value={typedData?.ad?.id}
          w={200}
          label={"Select ad"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() => syncAdsMut.mutate()}
                disabled={syncAdsMut.isPending}
              >
                {syncAdsMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync Ads if not found.</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        <ContainedSelection
          data={formQuestions}
          onChange={(value) => handleInputChange("phoneField", value)}
          value={typedData?.phoneField}
          w={200}
          label={"Select phone question key"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() =>
                  syncformQuestionsMut.mutate({
                    fbPageId: typedData?.fbPageId,
                    pageAccessToken: typedData?.pageAccessToken,
                  })
                }
                disabled={syncformQuestionsMut.isPending}
              >
                {syncformQuestionsMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync form questions if not found.</TooltipContent>
        </Tooltip>
      </div>
      {typedData?.fbPageId?.length && !pageAccessTokenByUser && typedData?.phoneField?.length ? (
        <Button className="w-full" onClick={handleFbLogin}>
          <IconBrandFacebookFilled size={20} />
          Allow lead access
        </Button>
      ) : typedData?.phoneField?.length ? (
        <Badge
          variant="secondary"
          className="border-transparent bg-green-500/15 text-green-600 normal-case dark:text-green-400"
        >
          <IconCheck size={"1rem"} />
          Allowed Lead Access
        </Badge>
      ) : null}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Default Phone number</span>
        <PhoneInput
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          value={typedData?.phone}
          onChange={(value) => handleInputChange("phone", value)}
        />
      </div>
    </div>
  );
};

export enum CatalogMessages {
  Catalog = "Catalog",
  SingleProduct = "Single-Product",
  MultiProduct = "Multi-Product",
  ProductSet = "Product-Set",
}

const CatalogNodeEditor = ({ nodeData, handleInputChange }: NodeComponentProps<"catalogNode">) => {
  const typedData = nodeData as CatalogNodeData;
  const headerEditor = useWaEditor({
    content: typedData.header || "",
    placeholder: "Enter header text...",
    max: 60,
    onChange: (value) => handleInputChange("header", value),
  });
  const bodyEditor = useWaEditor({
    content: typedData?.body || "",
    placeholder: "Enter your message text here...",
    onChange: (value) => handleInputChange("body", value),
  });
  const footerEditor = useWaEditor({
    content: typedData.footer || "",
    placeholder: "Enter footer text...",
    max: 60,
    onChange: (value) => handleInputChange("footer", value),
  });
  const params = useParams({
    strict: false,
  });
  const flowbotId = params.flowbotId as string;
  const { data: automation, isPending } = useWaAutomatedReplyById(flowbotId);
  const { data, isLoading } = useConnectedWaCatalog(
    typedData.whatsappSettingsPhoneId || automation?.whatsappSettingsPhoneId || "",
  );

  const syncProductSetsMut = useSyncProductSets();
  const { data: productSets, isLoading: isLoadingProductSets } = useProductSetsByCatalog(
    typedData.catalogId,
  );

  useEffect(() => {
    if (data && (!typedData.catalogId || typedData.catalogId !== data.catalogId)) {
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
        ? data.products.map((p: CatalogProduct) => ({
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
    return products.filter((p: { value: string }) =>
      selectedProductSet.productIds.includes(p.value),
    );
  }, [products, typedData.useProductSet, typedData.productSetId, productSets]);

  if (isLoading || isPending || isLoadingProductSets) return <RateupLoader />;
  return (
    <div className="flex flex-col gap-2">
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-blue-600"
              onClick={() => typedData.catalogId && syncProductSetsMut.mutate(typedData.catalogId)}
              disabled={syncProductSetsMut.isPending || !typedData.catalogId}
              title="Sync from Meta"
            >
              {syncProductSetsMut.isPending ? <Spinner /> : <IconRefresh size={16} />}
            </Button>
          }
        />
      )}
      {(typedData?.type === CatalogMessages.MultiProduct ||
        typedData?.type === CatalogMessages.ProductSet) && (
        <>
          <div className="text-xs font-bold text-muted-foreground">
            Header Text ( Required ) <span className="text-red-500">*</span>
          </div>
          <div className="flex items-start space-x-2 pb-0">
            <div className="flex-1">
              <ToolbarProvider editor={headerEditor!}>
                <TooltipProvider>
                  <EditorContent
                    editor={headerEditor}
                    style={{
                      backgroundColor: "var(--accent)",
                      borderRadius: "5px",
                      maxHeight: "200px",
                      minHeight: "120px",
                    }}
                    className="overflow-y-auto rounded-xl"
                  />
                  <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                    <WaTextCharacterCount editor={headerEditor} max={60} />
                  </div>
                  <div className="flex flex-wrap p-2">
                    <div className="mt-1 flex items-center">
                      <InsertEmoji editor={headerEditor} />
                    </div>
                    <Popover>
                      <PopoverTrigger>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                          <TypeOutline className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full">
                        <div className="flex flex-nowrap gap-1">
                          <div className="flex items-center">
                            <BoldToolbar />
                            <ItalicToolbar />
                            <StrikeThroughToolbar />
                            <CodeToolbar />
                          </div>
                          <div className="flex items-center">
                            <BlockquoteToolbar />
                            <BulletListToolbar />
                            <OrderedListToolbar />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-center">
                      <UndoToolbar />
                      <RedoToolbar />
                    </div>
                  </div>
                </TooltipProvider>
              </ToolbarProvider>
            </div>
          </div>
        </>
      )}
      <div className="text-xs font-bold text-muted-foreground">
        {`Body Text ${typedData?.type === CatalogMessages.SingleProduct ? " ( optional ) " : ""}`}{" "}
        <span className="text-red-500">*</span>
      </div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={bodyEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={bodyEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={bodyEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
      <div className="text-xs font-bold text-muted-foreground">Footer (optional)</div>
      <div className="flex items-start space-x-2 pb-0">
        <div className="flex-1">
          <ToolbarProvider editor={footerEditor!}>
            <TooltipProvider>
              <EditorContent
                editor={footerEditor}
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  minHeight: "120px",
                }}
                className="overflow-y-auto rounded-xl"
              />
              <div className="flex items-center justify-end space-x-1 px-2 pt-1">
                <WaTextCharacterCount editor={footerEditor} max={60} />
              </div>
              <div className="flex flex-wrap p-2">
                <div className="mt-1 flex items-center">
                  <InsertEmoji editor={footerEditor} />
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Format">
                      <TypeOutline className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full">
                    <div className="flex flex-nowrap gap-1">
                      <div className="flex items-center">
                        <BoldToolbar />
                        <ItalicToolbar />
                        <StrikeThroughToolbar />
                        <CodeToolbar />
                      </div>
                      <div className="flex items-center">
                        <BlockquoteToolbar />
                        <BulletListToolbar />
                        <OrderedListToolbar />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center">
                  <UndoToolbar />
                  <RedoToolbar />
                </div>
              </div>
            </TooltipProvider>
          </ToolbarProvider>
        </div>
      </div>
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
        (section: NonNullable<CatalogNodeData["sections"]>[0], sectionIndex: number) => (
          <div
            key={sectionIndex}
            className={`${styles.sectionContainer} my-2 flex flex-col gap-4 p-2`}
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => {
                    const newSections = [...(typedData.sections || [])];
                    newSections.splice(sectionIndex, 1);
                    handleInputChange("sections", newSections);
                  }}
                >
                  <IconX size={16} />
                </Button>
              }
            />
            <p className="text-xs text-muted-foreground">
              Catalog Multi product message support up to 10 sections, with a minimum of 1 product
              per section and a maximum of 30 products across all sections.
            </p>
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
          </div>
        ),
      )}
      {typedData.type === CatalogMessages.MultiProduct && (
        <Button
          variant="outline"
          disabled={(typedData.sections?.length ?? 0) >= 10}
          onClick={() => {
            const newSections = [
              ...(typedData.sections || []),
              { title: "", rows: [] as ListRow[] },
            ];
            handleInputChange("sections", newSections);
          }}
          className="mt-2"
        >
          + Add Section
        </Button>
      )}
    </div>
  );
};

// Instagram Generic Template Node Editor
const InstagramGenericTemplateNodeEditor: React.FC<
  NodeComponentProps<"instagramGenericTemplateNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Template Elements (Cards)</p>
      <p className="text-xs text-muted-foreground">
        Create cards with images, text, and buttons for Instagram messaging
      </p>

      {(typedData.elements || []).map((element, index: number) => (
        <div
          key={index}
          className="flex flex-col gap-4 p-2"
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <p className="text-sm font-medium">Card {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={() => {
                const newElements = [...(typedData.elements || [])];
                newElements.splice(index, 1);
                handleInputChange("elements", newElements);
              }}
            >
              <IconX size={16} />
            </Button>
          </div>

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

          <p className="mt-2 text-xs font-medium">Buttons</p>
          {(element.buttons || []).map((button, btnIndex: number) => (
            <div key={btnIndex} className="flex flex-wrap items-center gap-2">
              <Select
                size="xs"
                value={button.type}
                onChange={(value) => {
                  const newElements = [...(typedData.elements || [])];
                  newElements[index]!.buttons![btnIndex]!.type = value as "web_url" | "postback";
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
                  newElements[index]!.buttons![btnIndex]!.title = e.target.value;
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
                    newElements[index]!.buttons![btnIndex]!.url = e.target.value;
                    handleInputChange("elements", newElements);
                  }}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const newElements = [...(typedData.elements || [])];
                  newElements[index]!.buttons!.splice(btnIndex, 1);
                  handleInputChange("elements", newElements);
                }}
              >
                <IconX size={14} />
              </Button>
            </div>
          ))}
          <Button
            size="xs"
            variant="ghost"
            disabled={(element.buttons?.length ?? 0) >= 3}
            onClick={() => {
              const newElements = [...(typedData.elements || [])];
              if (!newElements[index]!.buttons) {
                newElements[index]!.buttons = [];
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
        </div>
      ))}

      <Button
        variant="outline"
        disabled={typedData.elements?.length >= 10}
        onClick={() => {
          const newElements = [...(typedData.elements || []), { title: "", buttons: [] }];
          handleInputChange("elements", newElements);
        }}
      >
        + Add Card
      </Button>
    </div>
  );
};

// Instagram Quick Reply Node Editor
const InstagramQuickReplyNodeEditor: React.FC<NodeComponentProps<"instagramQuickReplyNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;

  return (
    <div className="flex flex-col gap-2">
      <ContainedTextField
        label="Message Text"
        placeholder="Enter your message"
        required
        value={typedData.text || ""}
        onChange={(e) => handleInputChange("text", e.target.value)}
      />

      <p className="mt-2 text-sm font-medium">Quick Replies</p>
      <p className="text-xs text-muted-foreground">Add up to 13 quick reply buttons</p>

      {(typedData.quick_replies || []).map((reply, index: number) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
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
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              const newReplies = [...(typedData.quick_replies || [])];
              newReplies.splice(index, 1);
              handleInputChange("quick_replies", newReplies);
            }}
          >
            <IconX size={14} />
          </Button>
        </div>
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
    </div>
  );
};

// Instagram Story Reply Node Editor
const InstagramStoryReplyNodeEditor: React.FC<NodeComponentProps<"instagramStoryReplyNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;

  return (
    <div className="flex flex-col gap-2">
      <Switch
        label="Story Mention"
        description="Enable if this is a response to a story mention"
        checked={typedData.story_mention || false}
        onChange={(e) => handleInputChange("story_mention", e.currentTarget.checked)}
      />

      <ContainedTextField
        label="Reply Text"
        placeholder="Enter your reply message"
        required
        value={typedData.text || ""}
        onChange={(e) => handleInputChange("text", e.target.value)}
      />

      <p className="text-xs text-muted-foreground">
        This node will send a message in response to Instagram story replies or mentions
      </p>
    </div>
  );
};

// Instagram Product Template Node Editor
const InstagramProductTemplateNodeEditor: React.FC<
  NodeComponentProps<"instagramProductTemplateNode">
> = ({ nodeData, handleInputChange }) => {
  const typedData = nodeData;
  const params = useParams({ strict: false });
  const flowbotId = params.flowbotId as string;
  const { data: automation, isPending } = useWaAutomatedReplyById(flowbotId);
  const { data: catalogData, isLoading } = useConnectedWaCatalog(
    typedData.whatsappSettingsPhoneId || automation?.whatsappSettingsPhoneId || "",
  );

  const products = useMemo(
    () =>
      catalogData
        ? catalogData.products.map((p: CatalogProduct) => ({
            value: p.retailer_id,
            label: p?.productProps?.title || p.retailer_id,
          }))
        : [],
    [catalogData],
  );

  const selectedIds = useMemo(
    () => (typedData.elements || []).map((el) => el.id),
    [typedData.elements],
  );

  if (isPending || isLoading) return <RateupLoader />;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Products</p>
      <p className="text-xs text-muted-foreground">
        Select up to 10 products from your catalog. A single product sends a product message;
        multiple products send a carousel.
      </p>

      <ContainedMultiSelect
        label="Products"
        placeholder="Select products"
        data={products}
        value={selectedIds}
        onChange={(values) => {
          const newElements = values.map((id) => ({ id }));
          handleInputChange("elements", newElements);
        }}
        searchable
        maxValues={10}
      />
    </div>
  );
};

// Instagram Ice Breaker Node Editor
const InstagramIceBreakerNodeEditor: React.FC<NodeComponentProps<"instagramIceBreakerNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Ice Breakers</p>
      <p className="text-xs text-muted-foreground">
        Add conversation starters that appear in the Instagram chat. Users can tap these to start a
        conversation.
      </p>

      {(typedData.iceBreakers || []).map((iceBreaker, index: number) => (
        <div key={index} className="flex flex-wrap items-start gap-2">
          <div className="flex flex-1 flex-col gap-2">
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
          </div>
          <Button
            type="button"
            style={{ marginTop: "20px" }}
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            onClick={() => {
              const newIceBreakers = [...(typedData.iceBreakers || [])];
              newIceBreakers.splice(index, 1);
              handleInputChange("iceBreakers", newIceBreakers);
            }}
          >
            <IconTrash size={16} />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={() => {
          const newIceBreakers = [...(typedData.iceBreakers || []), { question: "", payload: "" }];
          handleInputChange("iceBreakers", newIceBreakers);
        }}
      >
        <IconPlus size={16} />
        Add Ice Breaker
      </Button>

      <p className="mt-2 text-xs text-muted-foreground">
        Note: Ice breakers are displayed to users when they first open a conversation with your
        Instagram account.
      </p>
    </div>
  );
};
