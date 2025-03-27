"use client";

import { useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Button,
  FileButton,
  Group,
  Image,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import {
  ContainedDatePickerInput,
  ContainedSelection,
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import WaTextEditor from "@/components/RichTextEditor/waTextEditor";
import { FileConverter } from "@/components/whatsapp/flow-v2/input/DataSource";
import { TicketColumnSelector } from "@/components/whatsapp/xyflow/DraggableComponent";
import useTranslations from "@/dictionaries/useTranslation";
import {
  deleteUploadedFiles,
  getFileUrlFromKey,
  uploadFile,
} from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

import {
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
  const { translations } = useTranslations();
  const { data: subscription } = useSubscription();
  const { data: boardData } = useBoardsQueries();
  const [nodeData, setNodeData] = useState<NodeData>(node.data);

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
    // Use the node type as a type assertion to TypeScript
    const nodeType = node.type as NodeType;

    switch (nodeType) {
      case "textNode": {
        const typedData = nodeData as NodeTypeMap["textNode"];

        return (
          <div className={styles.editorSection}>
            <ContainedTextArea
              rows={5}
              maxLength={4096}
              label={"Message Text"}
              value={typedData.body || ""}
              onChange={(e) =>
                handleInputChange<"textNode">("body", e.target.value)
              }
              placeholder="Enter your message text here..."
              description={"Supports URLs with maximum 4096 characters."}
            />
            {/* <WaTextEditor
              content={typedData.body || ""}
              handleInputChange={(e) =>
                handleInputChange<"textNode">("body", e.target.value)
              }
            /> */}
            <Text fz={"xs"} ta={"right"}>
              {typedData.body?.length || 0}/4096 characters
            </Text>
            <Switch
              label="Enable link preview"
              checked={typedData.previewUrl || false}
              onChange={(e) =>
                handleInputChange<"textNode">("previewUrl", e.target.checked)
              }
              description={
                "Enable link preview to show URL previews in WhatsApp."
              }
            />
          </div>
        );
      }

      case "quickReplyNode": {
        const typedData = nodeData as NodeTypeMap["quickReplyNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="question">Question</label>
            <input
              id="question"
              type="text"
              value={typedData.question || ""}
              onChange={(e) =>
                handleInputChange<"quickReplyNode">("question", e.target.value)
              }
              placeholder="Enter your question..."
            />

            <label>Options</label>
            {(typedData.options || []).map((option: string, index: number) => (
              <div key={index} className={styles.optionRow}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(typedData.options || [])];
                    newOptions[index] = e.target.value;
                    handleInputChange<"quickReplyNode">("options", newOptions);
                  }}
                  placeholder={`Option ${index + 1}`}
                />
                <button
                  className={styles.removeButton}
                  onClick={() => {
                    const newOptions = [...(typedData.options || [])];
                    newOptions.splice(index, 1);
                    handleInputChange<"quickReplyNode">("options", newOptions);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className={styles.addButton}
              onClick={() => {
                const newOptions = [...(typedData.options || []), ""];
                handleInputChange<"quickReplyNode">("options", newOptions);
              }}
            >
              + Add Option
            </button>
          </div>
        );
      }

      case "conditionalNode": {
        const typedData = nodeData as NodeTypeMap["conditionalNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="condition">Condition</label>
            <input
              id="condition"
              type="text"
              value={typedData.condition || ""}
              onChange={(e) =>
                handleInputChange<"conditionalNode">(
                  "condition",
                  e.target.value,
                )
              }
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
      }

      case "textInputNode":
      case "numberInputNode":
      case "emailInputNode":
      case "phoneInputNode":
      case "dateInputNode": {
        const typedData = nodeData as NodeTypeMap[typeof nodeType];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="question">Question</label>
            <input
              id="question"
              type="text"
              value={typedData.question || ""}
              onChange={(e) =>
                handleInputChange<typeof nodeType>("question", e.target.value)
              }
              placeholder="Enter your question..."
            />

            <label htmlFor="variableName">Save Answer to Variable</label>
            <input
              id="variableName"
              type="text"
              value={typedData.variableName || ""}
              onChange={(e) =>
                handleInputChange<typeof nodeType>(
                  "variableName",
                  e.target.value,
                )
              }
              placeholder="Variable name (e.g., user_email)"
            />

            <label htmlFor="validation">Validation (optional)</label>
            <input
              id="validation"
              type="text"
              value={typedData.validation || ""}
              onChange={(e) =>
                handleInputChange<typeof nodeType>("validation", e.target.value)
              }
              placeholder="Regex pattern or validation rule"
            />
          </div>
        );
      }

      case "delayNode": {
        const typedData = nodeData as NodeTypeMap["delayNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="delayTime">Delay Time (seconds)</label>
            <input
              id="delayTime"
              type="number"
              min="1"
              value={typedData.delayTime || 5}
              onChange={(e) =>
                handleInputChange<"delayNode">(
                  "delayTime",
                  Number.parseInt(e.target.value),
                )
              }
            />
          </div>
        );
      }

      case "imageNode":
      case "videoNode":
      case "documentNode":
      case "audioNode": {
        return (
          <MediaNode
            handleInputChange={handleInputChange}
            nodeData={nodeData}
            nodeType={nodeType}
          />
        );
      }

      case "startNode": {
        const typedData = nodeData as NodeTypeMap["startNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="startMessage">Start Message (optional)</label>
            <textarea
              id="startMessage"
              value={typedData.startMessage || ""}
              onChange={(e) =>
                handleInputChange<"startNode">("startMessage", e.target.value)
              }
              rows={3}
              placeholder="Enter an optional start message..."
            />

            <label htmlFor="recipient">Recipient Phone Number</label>
            <input
              id="recipient"
              type="text"
              value={typedData.recipient || ""}
              onChange={(e) =>
                handleInputChange<"startNode">("recipient", e.target.value)
              }
              placeholder="Enter recipient phone number (e.g., +16505551234)"
            />
          </div>
        );
      }

      case "endNode": {
        const typedData = nodeData as NodeTypeMap["endNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="endMessage">End Message (optional)</label>
            <textarea
              id="endMessage"
              value={typedData.endMessage || ""}
              onChange={(e) =>
                handleInputChange<"endNode">("endMessage", e.target.value)
              }
              rows={3}
              placeholder="Enter an optional end message..."
            />
          </div>
        );
      }

      case "buttonNode": {
        const typedData = nodeData as NodeTypeMap["buttonNode"];
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
          <Stack gap={"xs"}>
            <ContainedSelection
              label="Header Type"
              placeholder="Select header type"
              data={[
                { value: "none", label: "None" },
                { value: "text", label: "Text" },
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
                { value: "document", label: "Document" },
              ]}
              value={typedData.headerType || "none"}
              onChange={(value) => {
                handleInputChange<"buttonNode">("headerType", value);
              }}
              description="Type of header content to display"
            />
            {!typedData.headerType ? (
              <></>
            ) : typedData.headerType !== "text" ? (
              <MediaNode
                handleInputChange={handleInputChange}
                nodeData={typedData || ""}
                nodeType={getType()}
              />
            ) : (
              <WaTextEditor
                handleInputChange={(e) =>
                  handleInputChange<"buttonNode">("header", e)
                }
                content={typedData.header || ""}
                placeholder="Enter header text..."
                label="Header Text"
                max={60}
              />
            )}
            <WaTextEditor
              handleInputChange={(e) =>
                handleInputChange<"buttonNode">("body", e)
              }
              content={typedData.body || ""}
              placeholder="Enter message text..."
              label="Body Text"
              max={1024}
            />

            <WaTextEditor
              handleInputChange={(e) =>
                handleInputChange<"buttonNode">("footer", e)
              }
              content={typedData.footer || ""}
              placeholder="Enter footer text..."
              label="Footer (optional)"
              max={60}
            />

            <label>Buttons</label>
            {(typedData.buttons || []).map((button: any, index: number) => (
              <div key={index} className={styles.optionRow}>
                <ContainedTextField
                  flex={1}
                  type="text"
                  value={
                    typeof button === "object" ? button.title || "" : button
                  }
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
                    handleInputChange<"buttonNode">("buttons", newButtons);
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
                        handleInputChange<"buttonNode">("buttons", newButtons);
                      }}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  }
                />
              </div>
            ))}
            <button
              className={styles.addButton}
              disabled={typedData.buttons?.length >= 3}
              onClick={() => {
                const newButtons = [
                  ...(typedData.buttons || []),
                  { id: `button-${Date.now()}`, title: "" },
                ];
                handleInputChange<"buttonNode">("buttons", newButtons);
              }}
            >
              + Add Button
            </button>
          </Stack>
        );
      }

      case "listNode": {
        const typedData = nodeData as NodeTypeMap["listNode"];
        const getTotalRowCount = (sections: any[] = []) => {
          return sections.reduce((count, section) => {
            return count + (section.rows?.length || 0);
          }, 0);
        };
        return (
          <Stack gap={"xs"}>
            <WaTextEditor
              handleInputChange={(e) =>
                handleInputChange<"listNode">("header", e)
              }
              content={typedData.header || ""}
              placeholder="Enter header text..."
              label="Header Text"
              max={60}
            />
            <WaTextEditor
              handleInputChange={(e) =>
                handleInputChange<"listNode">("body", e)
              }
              content={typedData.body || ""}
              placeholder="Enter message text..."
              label="Body Text"
              max={1024}
            />

            <WaTextEditor
              handleInputChange={(e) =>
                handleInputChange<"listNode">("footer", e)
              }
              content={typedData.footer || ""}
              placeholder="Enter footer text..."
              label="Footer (optional)"
              max={60}
            />

            <ContainedTextField
              label="Button Text"
              placeholder="Enter button text"
              value={typedData.button || ""}
              onChange={(e) =>
                handleInputChange<"listNode">("button", e.target.value)
              }
              maxLength={20}
              description="Button text shown at the bottom of the list (max 20 characters)"
            />

            <Text fw={500} mt="md">
              Sections
            </Text>
            <Text size="xs" c="dimmed">
              Interactive list messages support up to 10 sections, with up to 10
              rows across all sections combined
            </Text>

            {(typedData.sections || []).map(
              (section: any, sectionIndex: number) => (
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
                      handleInputChange<"listNode">("sections", newSections);
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
                          handleInputChange<"listNode">(
                            "sections",
                            newSections,
                          );
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
                            handleInputChange<"listNode">(
                              "sections",
                              newSections,
                            );
                          }}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                      {/* <ContainedTextField
                        label="Row ID"
                        placeholder="Enter row ID"
                        value={row.id || ""}
                        onChange={(e) => {
                          const newSections = [...(typedData.sections || [])];
                          newSections[sectionIndex].rows[rowIndex] = {
                            ...newSections[sectionIndex].rows[rowIndex],
                            id: e.target.value,
                          };
                          handleInputChange<"listNode">(
                            "sections",
                            newSections,
                          );
                        }}
                        maxLength={200}
                        description="Unique identifier for this row"
                      /> */}
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
                          handleInputChange<"listNode">(
                            "sections",
                            newSections,
                          );
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
                          handleInputChange<"listNode">(
                            "sections",
                            newSections,
                          );
                        }}
                        maxLength={72}
                        description="Max 72 characters"
                      />
                    </Stack>
                  ))}
                  <Button
                    variant="light"
                    size="xs"
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
                      handleInputChange<"listNode">("sections", newSections);
                    }}
                  >
                    + Add Row
                  </Button>
                </Stack>
              ),
            )}

            <Button
              variant="outline"
              disabled={typedData.sections?.length >= 10}
              onClick={() => {
                const newSections = [
                  ...(typedData.sections || []),
                  { title: "", rows: [] },
                ];
                handleInputChange<"listNode">("sections", newSections);
              }}
              mt="md"
            >
              + Add Section
            </Button>

            <Group position="center" mt="xl">
              <Button
                color="teal"
                onClick={() => {
                  const data = {
                    button: "Shipping Options",
                    sections: [
                      {
                        title: "I want it ASAP!",
                        rows: [
                          {
                            id: "priority_express",
                            title: "Priority Mail Express",
                            description: "Next Day to 2 Days",
                          },
                          {
                            id: "priority_mail",
                            title: "Priority Mail",
                            description: "1–3 Days",
                          },
                        ],
                      },
                      {
                        title: "I can wait a bit",
                        rows: [
                          {
                            id: "usps_ground_advantage",
                            title: "USPS Ground Advantage",
                            description: "2–5 Days",
                          },
                          {
                            id: "media_mail",
                            title: "Media Mail",
                            description: "2–8 Days",
                          },
                        ],
                      },
                    ],
                  };

                  handleInputChange<"listNode">("button", data.button);
                  handleInputChange<"listNode">("sections", data.sections);
                }}
              >
                Load Sample Data
              </Button>
            </Group>
          </Stack>
        );
      }

      case "stickerNode": {
        const typedData = nodeData as NodeTypeMap["stickerNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="stickerId">Sticker ID</label>
            <input
              id="stickerId"
              type="text"
              value={typedData.stickerId || ""}
              onChange={(e) =>
                handleInputChange<"stickerNode">("stickerId", e.target.value)
              }
              placeholder="Enter sticker ID..."
            />
          </div>
        );
      }

      case "ctaUrlNode": {
        const typedData = nodeData as NodeTypeMap["ctaUrlNode"];

        return (
          <Stack gap={"xs"}>
            <WaTextEditor
              handleInputChange={(e) =>
                handleInputChange<"ctaUrlNode">("header", e)
              }
              content={typedData.header || ""}
              placeholder="Enter header text..."
              label="Header Text"
              max={60}
            />

            <WaTextEditor
              handleInputChange={(e) =>
                handleInputChange<"ctaUrlNode">("body", e)
              }
              content={typedData.body || ""}
              placeholder="Enter message text..."
              label="Body Text"
              max={1024}
            />

            <WaTextEditor
              handleInputChange={(e) =>
                handleInputChange<"ctaUrlNode">("footer", e)
              }
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
                handleInputChange<"ctaUrlNode">("display_text", e.target.value);
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
                handleInputChange<"ctaUrlNode">("url", e.target.value);
              }}
              description="The URL that will open when the button is clicked"
            />
          </Stack>
        );
      }

      case "templateNode": {
        const typedData = nodeData as NodeTypeMap["templateNode"];
        const templateData =
          templates?.map((t) => ({
            label: t.data?.name,
            value: t.id,
            flowId: t.data?.components?.find((c) => c.type === "BUTTONS")
              ?.buttons?.[0]?.["flow_id"],
          })) || [];
        return (
          <Stack>
            <ContainedSelection
              data={templateData}
              label="Template"
              allowDeselect={false}
              placeholder={`Select Template`}
              value={typedData?.template?.id || ""}
              onChange={(value, values) => {
                handleInputChange<"templateNode">("template", {
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
                  handleInputChange<"templateNode">("teamId", id);
                }}
                w={"100%"}
              />
            )}
          </Stack>
        );
      }

      case "reactionNode": {
        const typedData = nodeData as NodeTypeMap["reactionNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="emoji">Emoji</label>
            <input
              id="emoji"
              type="text"
              value={typedData.emoji || ""}
              onChange={(e) =>
                handleInputChange<"reactionNode">("emoji", e.target.value)
              }
              placeholder="Enter emoji (e.g., 👍)..."
            />

            <label htmlFor="messageId">Message ID</label>
            <input
              id="messageId"
              type="text"
              value={typedData.messageId || ""}
              onChange={(e) =>
                handleInputChange<"reactionNode">("messageId", e.target.value)
              }
              placeholder="Enter message ID to react to..."
            />
          </div>
        );
      }

      case "locationNode": {
        const typedData = nodeData as NodeTypeMap["locationNode"];

        return (
          <Stack gap="xs">
            <ContainedTextField
              label="Location Name"
              placeholder="Enter location name..."
              value={typedData.name || ""}
              onChange={(e) =>
                handleInputChange<"locationNode">("name", e.target.value)
              }
              description="Name of the location to be shared"
            />

            <Group grow>
              <ContainedTextField
                label="Latitude"
                required
                placeholder="e.g., 37.7749"
                value={typedData.latitude || ""}
                onChange={(e) =>
                  handleInputChange<"locationNode">("latitude", e.target.value)
                }
                description="Decimal latitude coordinate"
              />

              <ContainedTextField
                label="Longitude"
                required
                placeholder="e.g., -122.4194"
                value={typedData.longitude || ""}
                onChange={(e) =>
                  handleInputChange<"locationNode">("longitude", e.target.value)
                }
                description="Decimal longitude coordinate"
              />
            </Group>

            <ContainedTextField
              label="Address (optional)"
              placeholder="Enter full address..."
              value={typedData.address || ""}
              onChange={(e) =>
                handleInputChange<"locationNode">("address", e.target.value)
              }
              description="Full address that corresponds to these coordinates"
            />

            <Text size="xs" c="dimmed" mt="sm">
              Note: Both latitude and longitude are required for a valid
              location message
            </Text>
          </Stack>
        );
      }

      case "locationRequestNode": {
        const typedData = nodeData as NodeTypeMap["locationRequestNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="message">Request Message</label>
            <textarea
              id="message"
              value={typedData.message || ""}
              onChange={(e) =>
                handleInputChange<"locationRequestNode">(
                  "message",
                  e.target.value,
                )
              }
              rows={3}
              placeholder="Enter location request message..."
            />
          </div>
        );
      }

      case "addressNode": {
        const typedData = nodeData as NodeTypeMap["addressNode"];

        return (
          <div className={styles.editorSection}>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={typedData.name || ""}
              onChange={(e) =>
                handleInputChange<"addressNode">("name", e.target.value)
              }
              placeholder="Enter name..."
            />

            <label htmlFor="street">Street</label>
            <input
              id="street"
              type="text"
              value={typedData.street || ""}
              onChange={(e) =>
                handleInputChange<"addressNode">("street", e.target.value)
              }
              placeholder="Enter street..."
            />

            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              value={typedData.city || ""}
              onChange={(e) =>
                handleInputChange<"addressNode">("city", e.target.value)
              }
              placeholder="Enter city..."
            />

            <label htmlFor="state">State</label>
            <input
              id="state"
              type="text"
              value={typedData.state || ""}
              onChange={(e) =>
                handleInputChange<"addressNode">("state", e.target.value)
              }
              placeholder="Enter state..."
            />

            <label htmlFor="zip">ZIP Code</label>
            <input
              id="zip"
              type="text"
              value={typedData.zip || ""}
              onChange={(e) =>
                handleInputChange<"addressNode">("zip", e.target.value)
              }
              placeholder="Enter ZIP code..."
            />

            <label htmlFor="country">Country</label>
            <input
              id="country"
              type="text"
              value={typedData.country || ""}
              onChange={(e) =>
                handleInputChange<"addressNode">("country", e.target.value)
              }
              placeholder="Enter country..."
            />
          </div>
        );
      }

      case "contactsNode": {
        const typedData = nodeData as NodeTypeMap["contactsNode"];

        return (
          <Stack gap="xs">
            <Text fw={500} mt="xs">
              Contacts
            </Text>
            <Text size="xs" c="dimmed">
              Create a contact card to share with your users
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
                label="Full Name *"
                required
                placeholder="Enter full name"
                value={typedData.name?.formatted_name || ""}
                onChange={(e) => {
                  const updatedName = {
                    ...(typedData.name || {}),
                    formatted_name: e.target.value,
                  };
                  handleInputChange<"contactsNode">("name", updatedName);
                }}
                description="Required - Full name as it should appear"
              />

              <ContainedTextField
                label="First Name"
                placeholder="First name"
                value={typedData.name?.first_name || ""}
                onChange={(e) => {
                  const updatedName = {
                    ...(typedData.name || {}),
                    first_name: e.target.value,
                  };
                  handleInputChange<"contactsNode">("name", updatedName);
                }}
              />
              <ContainedTextField
                label="Last Name"
                placeholder="Last name"
                value={typedData.name?.last_name || ""}
                onChange={(e) => {
                  const updatedName = {
                    ...(typedData.name || {}),
                    last_name: e.target.value,
                  };
                  handleInputChange<"contactsNode">("name", updatedName);
                }}
              />

              <ContainedTextField
                label="Middle Name"
                placeholder="Middle name"
                value={typedData.name?.middle_name || ""}
                onChange={(e) => {
                  const updatedName = {
                    ...(typedData.name || {}),
                    middle_name: e.target.value,
                  };
                  handleInputChange<"contactsNode">("name", updatedName);
                }}
              />
              <ContainedTextField
                label="Prefix"
                placeholder="e.g., Dr., Mr."
                value={typedData.name?.prefix || ""}
                onChange={(e) => {
                  const updatedName = {
                    ...(typedData.name || {}),
                    prefix: e.target.value,
                  };
                  handleInputChange<"contactsNode">("name", updatedName);
                }}
              />
              <ContainedTextField
                label="Suffix"
                placeholder="e.g., Jr., Ph.D."
                value={typedData.name?.suffix || ""}
                onChange={(e) => {
                  const updatedName = {
                    ...(typedData.name || {}),
                    suffix: e.target.value,
                  };
                  handleInputChange<"contactsNode">("name", updatedName);
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
                value={typedData.org?.company || ""}
                onChange={(e) => {
                  const updatedOrg = {
                    ...(typedData.org || {}),
                    company: e.target.value,
                  };
                  handleInputChange<"contactsNode">("org", updatedOrg);
                }}
              />

              <ContainedTextField
                label="Department"
                placeholder="Department name"
                value={typedData.org?.department || ""}
                onChange={(e) => {
                  const updatedOrg = {
                    ...(typedData.org || {}),
                    department: e.target.value,
                  };
                  handleInputChange<"contactsNode">("org", updatedOrg);
                }}
              />
              <ContainedTextField
                label="Job Title"
                placeholder="Job title"
                value={typedData.org?.title || ""}
                onChange={(e) => {
                  const updatedOrg = {
                    ...(typedData.org || {}),
                    title: e.target.value,
                  };
                  handleInputChange<"contactsNode">("org", updatedOrg);
                }}
              />
            </Stack>

            {/* Birthday */}
            <ContainedDatePickerInput
              label="Birthday"
              placeholder="YYYY-MM-DD"
              value={
                typedData.birthday ? new Date(typedData.birthday) : undefined
              }
              onChange={(e) =>
                handleInputChange<"contactsNode">(
                  "birthday",
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
                      ...(typedData.phones || []),
                      { phone: "", type: "CELL" },
                    ];
                    handleInputChange<"contactsNode">("phones", phones);
                  }}
                >
                  + Add Phone
                </Button>
              </Group>

              {(typedData.phones || []).map((phone, index) => (
                <Stack key={index}>
                  <ContainedTextField
                    label={`Phone ${index + 1}`}
                    placeholder="Phone number with country code"
                    style={{ flex: 2 }}
                    value={phone.phone || ""}
                    onChange={(e) => {
                      const phones = [...(typedData.phones || [])];
                      phones[index] = {
                        ...phones[index],
                        phone: e.target.value,
                      };
                      handleInputChange<"contactsNode">("phones", phones);
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
                      const phones = [...(typedData.phones || [])];
                      phones[index] = { ...phones[index], type: value };
                      handleInputChange<"contactsNode">("phones", phones);
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => {
                      const phones = [...(typedData.phones || [])];
                      phones.splice(index, 1);
                      handleInputChange<"contactsNode">("phones", phones);
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
                      ...(typedData.emails || []),
                      { email: "", type: "WORK" },
                    ];
                    handleInputChange<"contactsNode">("emails", emails);
                  }}
                >
                  + Add Email
                </Button>
              </Group>

              {(typedData.emails || []).map((email, index) => (
                <Stack key={index}>
                  <ContainedTextField
                    label={`Email ${index + 1}`}
                    placeholder="Email address"
                    style={{ flex: 2 }}
                    value={email.email || ""}
                    onChange={(e) => {
                      const emails = [...(typedData.emails || [])];
                      emails[index] = {
                        ...emails[index],
                        email: e.target.value,
                      };
                      handleInputChange<"contactsNode">("emails", emails);
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
                      const emails = [...(typedData.emails || [])];
                      emails[index] = { ...emails[index], type: value };
                      handleInputChange<"contactsNode">("emails", emails);
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => {
                      const emails = [...(typedData.emails || [])];
                      emails.splice(index, 1);
                      handleInputChange<"contactsNode">("emails", emails);
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
                      ...(typedData.addresses || []),
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
                    handleInputChange<"contactsNode">("addresses", addresses);
                  }}
                >
                  + Add Address
                </Button>
              </Group>

              {(typedData.addresses || []).map((address, index) => (
                <Stack key={index} gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Address {index + 1}</Text>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => {
                        const addresses = [...(typedData.addresses || [])];
                        addresses.splice(index, 1);
                        handleInputChange<"contactsNode">(
                          "addresses",
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
                      const addresses = [...(typedData.addresses || [])];
                      addresses[index] = {
                        ...addresses[index],
                        street: e.target.value,
                      };
                      handleInputChange<"contactsNode">("addresses", addresses);
                    }}
                  />

                  <Group grow>
                    <ContainedTextField
                      label="City"
                      placeholder="City"
                      value={address.city || ""}
                      onChange={(e) => {
                        const addresses = [...(typedData.addresses || [])];
                        addresses[index] = {
                          ...addresses[index],
                          city: e.target.value,
                        };
                        handleInputChange<"contactsNode">(
                          "addresses",
                          addresses,
                        );
                      }}
                    />
                    <ContainedTextField
                      label="State"
                      placeholder="State/Province"
                      value={address.state || ""}
                      onChange={(e) => {
                        const addresses = [...(typedData.addresses || [])];
                        addresses[index] = {
                          ...addresses[index],
                          state: e.target.value,
                        };
                        handleInputChange<"contactsNode">(
                          "addresses",
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
                        const addresses = [...(typedData.addresses || [])];
                        addresses[index] = {
                          ...addresses[index],
                          zip: e.target.value,
                        };
                        handleInputChange<"contactsNode">(
                          "addresses",
                          addresses,
                        );
                      }}
                    />
                    <ContainedTextField
                      label="Country"
                      placeholder="Country name"
                      value={address.country || ""}
                      onChange={(e) => {
                        const addresses = [...(typedData.addresses || [])];
                        addresses[index] = {
                          ...addresses[index],
                          country: e.target.value,
                        };
                        handleInputChange<"contactsNode">(
                          "addresses",
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
                        const addresses = [...(typedData.addresses || [])];
                        addresses[index] = {
                          ...addresses[index],
                          country_code: e.target.value.toUpperCase(),
                        };
                        handleInputChange<"contactsNode">(
                          "addresses",
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
                      const addresses = [...(typedData.addresses || [])];
                      addresses[index] = { ...addresses[index], type: value };
                      handleInputChange<"contactsNode">("addresses", addresses);
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
                      ...(typedData.urls || []),
                      { url: "", type: "WORK" },
                    ];
                    handleInputChange<"contactsNode">("urls", urls);
                  }}
                >
                  + Add Website
                </Button>
              </Group>

              {(typedData.urls || []).map((url, index) => (
                <Stack key={index}>
                  <ContainedTextField
                    label={`Website ${index + 1}`}
                    placeholder="https://..."
                    style={{ flex: 2 }}
                    value={url.url || ""}
                    onChange={(e) => {
                      const urls = [...(typedData.urls || [])];
                      urls[index] = { ...urls[index], url: e.target.value };
                      handleInputChange<"contactsNode">("urls", urls);
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
                    onChange={(
                      value: "WORK" | "HOME" | "OTHER" | "PROFILE",
                    ) => {
                      const urls = [...(typedData.urls || [])];
                      urls[index] = { ...urls[index], type: value };
                      handleInputChange<"contactsNode">("urls", urls);
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => {
                      const urls = [...(typedData.urls || [])];
                      urls.splice(index, 1);
                      handleInputChange<"contactsNode">("urls", urls);
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Stack>
              ))}
            </Stack>
          </Stack>
        );
      }
      case "ticket": {
        const typedData = nodeData as NodeTypeMap["ticket"];
        return (
          <TicketColumnSelector
            component={"component"}
            id={"id"}
            options={"options"}
            setNodes={"setNodes"}
            index={"index"}
          />
        );
      }

      case "flowNode": {
        const typedData = nodeData as NodeTypeMap["flowNode"];
        return (
          <Group>
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
                handleInputChange<"flowNode">("flow", {
                  id: value,
                  name: values.label,
                });
              }}
              flex={1}
            />
            <TeamSelector
              value={typedData.teamId}
              onChange={(id) => {
                handleInputChange<"flowNode">("teamId", id);
              }}
              w={"100%"}
            />
          </Group>
        );
      }

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
        <h3>Edit {nodeData.label}</h3>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.editorContent}>
        <div className={styles.editorSection}>
          <label htmlFor="label">Node Label</label>
          <input
            id="label"
            type="text"
            value={nodeData.label || ""}
            onChange={(e) => handleInputChange("label", e.target.value)}
            placeholder="Enter node label..."
            disabled
          />
        </div>

        {renderEditor()}
      </div>

      <div className={styles.editorFooter}>
        <button className={styles.saveButton} onClick={handleDone}>
          Done
        </button>
      </div>
    </div>
  );
}

const MediaNode = ({ handleInputChange, nodeData, nodeType }) => {
  const typedData = nodeData;
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const { translations } = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const resetRef = useRef<() => void>(null);

  const clearFile = async () => {
    if (!file) {
      setFile(null);
      return;
    }
    await deleteUploadedFiles({ fileKeyArray: [{ Key: file }] });
    setFile(null);
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
      setMedia(publicMediaLink);
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
    <div className={styles.editorSection}>
      {nodeType === "imageNode" && (media || typedData?.link) && (
        <Image
          src={media ?? getFileUrlFromKey(typedData?.link)}
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
          {(props) => <Button {...props}>Upload MediaFile</Button>}
        </FileButton>
        <Button disabled={!file} color="red" onClick={clearFile}>
          Reset
        </Button>
      </Group>

      {file && (
        <Stack>
          <Text size="sm" ta="center" mt="sm">
            Picked file: {file.name}
          </Text>
          <Button
            onClick={uploadFileData}
            disabled={loading}
            leftIcon={<IconDeviceFloppy />}
          >
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </Stack>
      )}
      {nodeType !== "audioNode" && (
        <ContainedTextField
          mt={"sm"}
          label={"Caption (optional)"}
          value={typedData.caption || ""}
          onChange={(e) => handleInputChange("caption", e.target.value)}
          maxLength={1024}
          placeholder="Enter caption..."
          description={"Supports caption with maximum 1024 characters."}
        />
      )}
      {nodeType === "documentNode" && (
        <ContainedTextField
          mt={"sm"}
          label={"FileName (optional)"}
          value={typedData.filename || ""}
          onChange={(e) => handleInputChange("filename", e.target.value)}
          maxLength={1024}
          placeholder="Enter FileName..."
          description={"Supports FileName with maximum 1024 characters."}
        />
      )}
    </div>
  );
};
