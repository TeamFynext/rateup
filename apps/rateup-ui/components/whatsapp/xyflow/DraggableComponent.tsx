import React, { useMemo, useRef, useState } from "react";

import {
  ActionIcon,
  Box,
  Card,
  Group,
  HoverCard,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDeviceFloppy,
  IconEdit,
  IconGripVertical,
  IconMinus,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Handle, Position } from "@xyflow/react";

import {
  RateupButtonPrimary,
  RateupFileUploadButton,
} from "@/components/Button/RateupButtons";
import { LengthTracker } from "@/components/input/LengthTracker";
import { TeamSelector } from "@/components/input/TeamSelector";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout";
import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";
import useTranslations from "@/dictionaries/useTranslation";
import useReplyStore, {
  ReplyType,
} from "@/pages/dashboard/whatsapp/automated-replies/store";
import { deleteUploadedFiles, uploadFile } from "@/utils/file-upload/upload";
import { showErrorToast } from "@/utils/notifications";

import { FileConverter } from "../flow-v2/input/DataSource";
import styles from "./DraggableComponent.module.css";
import { ComponentType, RenderMenuDropdown } from "./ScreenNode";

const DraggableComponent = ({
  component,
  data,
  setNodes,
  id,
  dragHandleProps,
  addComponentNode,
  index,
  options,
  isTicketFeatureActive,
}) => {
  const { setId, close, setType, open } = useReplyStore();
  const { translations } = useTranslations();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [imageError, setImageError] = useState("");
  const resetRef = useRef(null);
  const [opened, { toggle, close: closeModal }] = useDisclosure();
  const [templateIdWithTeamId, setTemplateIdWithTeamId] = useState({
    teamId: null,
    templateId: null,
  });

  const handleAddField = (len) => {
    if (component.name.length < len) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  components: node.data.components.map((comp, compIndex) =>
                    compIndex === index
                      ? {
                          ...comp,
                          name: [
                            ...comp.name,
                            { id: crypto.randomUUID(), value: "" },
                          ],
                        }
                      : comp,
                  ),
                },
              }
            : node,
        ),
      );
    }
  };

  const handleRemoveField = (fieldId) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                components: node.data.components.map((comp, compIndex) =>
                  compIndex === index
                    ? {
                        ...comp,
                        name: comp.name.filter((field) => field.id !== fieldId),
                      }
                    : comp,
                ),
              },
            }
          : node,
      ),
    );
  };

  const handleFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > 300000) {
        showErrorToast("Max image size is 300KB", "file-size");
        return setImageError("Max 300KB");
      }
      setImageError("");
      const base64String = await FileConverter.fileToBase64(file);
      setImage(base64String);
      setFileContent(file);
    } catch (error) {
      showErrorToast(
        translations["Error converting file to Base64:"] +
          JSON.stringify(error),
        "file-converting",
      );
    }
  };
  const clearFile = async () => {
    setLoading(true);
    if (!image?.image) {
      setImage(null);
      setFileContent(null);
      setLoading(false);
      resetRef.current?.();
      return;
    }
    await deleteUploadedFiles({ fileKeyArray: [{ Key: image?.image }] });
    setImage(null);
    setFileContent(null);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                components: node?.data?.components?.map((comp, compIndex) => {
                  return compIndex === index
                    ? {
                        ...comp,
                        name: comp.name.map((field, fieldIndex) =>
                          fieldIndex === 0
                            ? { ...field, value: { image: "" } }
                            : field,
                        ),
                      }
                    : comp;
                }),
              },
            }
          : node,
      ),
    );
    setLoading(false);
    resetRef.current?.();
  };
  const uploadFileData = async () => {
    try {
      if (!fileContent) return;
      setLoading(true);
      clearFile();
      const publicImageLink = await uploadFile(fileContent);
      setImage(publicImageLink);
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  components: node.data.components.map((comp, compIndex) =>
                    compIndex === index
                      ? {
                          ...comp,
                          name: comp.name.map((field, fieldIndex) =>
                            fieldIndex === 0
                              ? { ...field, value: publicImageLink }
                              : field,
                          ),
                        }
                      : comp,
                  ),
                },
              }
            : node,
        ),
      );
      setLoading(false);
    } catch (error) {
      setLoading(false);
      showErrorToast(
        translations["Error uploading file to server:"] + JSON.stringify(error),
        "file-uploading",
      );
    }
  };
  const handleInputChange = (fieldId, value) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                components: node.data.components.map((comp, compIndex) =>
                  compIndex === index
                    ? {
                        ...comp,
                        name: comp.name.map((field) =>
                          field.id === fieldId ? { ...field, value } : field,
                        ),
                      }
                    : comp,
                ),
              },
            }
          : node,
      ),
    );
  };
  const renderDynamicTextFields = (len = 4, withImage = false) => (
    <Stack gap={"xs"} onClick={(e) => e.stopPropagation()}>
      {component?.name?.map((field, i) => {
        let parsedValue = parseJsonToReact(field.value);
        let index = withImage ? i : i + 1;
        switch (index) {
          case 0:
            return (
              <RateupFileUploadButton
                clearFile={clearFile}
                handleFileChange={handleFileChange}
                resetRef={resetRef}
                fileSrc={image ?? field.value}
                error={imageError}
                rightSection={
                  <ActionIcon
                    title="Save"
                    radius={"md"}
                    size={"lg"}
                    onClick={uploadFileData}
                    loading={loading}
                    disabled={image?.image || !image}
                  >
                    <IconDeviceFloppy />
                  </ActionIcon>
                }
              />
            );
          case 1:
            return (
              <Card
                shadow="sm"
                radius="md"
                p={"xs"}
                flex={1}
                withBorder
                onClick={() => {
                  setId(field.id);
                  setType(i === 0 ? ReplyType.Editor : ReplyType.Text);
                  open();
                }}
              >
                {parsedValue ? (
                  parsedValue
                ) : (
                  <Text c={"dimmed"} fz={"sm"}>
                    Enter Text
                  </Text>
                )}
              </Card>
            );

          default:
            return (
              <Group key={field.id} gap={4}>
                <ActionIcon
                  title="Delete"
                  radius={"sm"}
                  variant="light"
                  onClick={() => handleRemoveField(field.id)}
                >
                  <IconMinus />
                </ActionIcon>
                <TextInput
                  placeholder={"Enter the button text"}
                  value={field.value}
                  onClick={() => open && close()}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  flex={1}
                  maxLength={len > 4 ? 24 : 20}
                  rightSection={
                    i > 0 && (
                      <>
                        <LengthTracker
                          maxValue={len > 4 ? 24 : 20}
                          length={field.value?.length}
                        />
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={field.id}
                          className={styles.handle_style}
                        />
                      </>
                    )
                  }
                  styles={{
                    section: {
                      width: 60,
                    },

                    input: {
                      width: "calc(100% - 30px)",
                      border: "none",
                    },
                    root: {
                      border: "1px solid #e3e3e3",
                      borderRadius: 4,
                    },
                  }}
                />
              </Group>
            );
        }
      })}
      {component?.name?.length < len && (
        <RateupButtonPrimary
          title={
            withImage && component.name.length === 1 ? "Add Text" : "Add Button"
          }
          radius={"sm"}
          leftIcon={<IconPlus />}
          onClick={() => handleAddField(len)}
        />
      )}
    </Stack>
  );

  const renderInputField = (type, label, options) => {
    switch (type) {
      case ComponentType.BasicText:
        return renderDynamicTextFields();
      case ComponentType.List:
        return renderDynamicTextFields(11);
      case ComponentType.Image:
        return renderDynamicTextFields(3, true);
      case ComponentType.Flow:
      case ComponentType.Template:
        return (
          <Group>
            <Select
              data={options || []}
              label={label}
              allowDeselect={false}
              placeholder={`Select ${label.toLowerCase()}`}
              value={component.name}
              onChange={(value, values: any) => {
                if (type !== ComponentType.Flow) close();
                if (values?.flowId) {
                  setTemplateIdWithTeamId((prev) => ({
                    ...prev,
                    templateId: values?.value,
                  }));
                  return toggle();
                }
                setNodes((nodes) =>
                  nodes.map((node) =>
                    node.id === id
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            components: node.data.components.map(
                              (comp, compIndex) =>
                                compIndex === index
                                  ? {
                                      ...comp,
                                      name: value,
                                      teamId: templateIdWithTeamId?.teamId,
                                    }
                                  : comp,
                            ),
                          },
                        }
                      : node,
                  ),
                );
              }}
              flex={1}
            />
            <SimpleModalLayout
              opened={opened}
              onClose={() => {
                closeModal();
                setTemplateIdWithTeamId({ teamId: null, templateId: null });
              }}
              title="Authentication"
            >
              <Stack>
                <TeamSelector
                  value={templateIdWithTeamId.teamId}
                  onChange={(id) => {
                    setTemplateIdWithTeamId((prev) => ({
                      ...prev,
                      teamId: id,
                    }));
                  }}
                />
                <RateupButtonPrimary
                  title="Select"
                  onClick={() => {
                    setNodes((nodes) =>
                      nodes.map((node) =>
                        node.id === id
                          ? {
                              ...node,
                              data: {
                                ...node.data,
                                components: node.data.components.map(
                                  (comp, compIndex) =>
                                    compIndex === index
                                      ? {
                                          ...comp,
                                          name: templateIdWithTeamId.templateId,
                                          teamId: templateIdWithTeamId?.teamId,
                                        }
                                      : comp,
                                ),
                              },
                            }
                          : node,
                      ),
                    );
                    closeModal();
                  }}
                />
              </Stack>
            </SimpleModalLayout>
            <ActionIcon
              display={type === ComponentType.Flow ? "none" : "block"}
              mt={"lg"}
              variant="light"
              onClick={() => {
                setId(component.name);
                open();
              }}
            >
              <IconEdit />
            </ActionIcon>
          </Group>
        );
      case ComponentType.Ticket:
        return (
          <TicketColumnSelector
            component={component}
            id={id}
            options={options}
            setNodes={setNodes}
            index={index}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        {...dragHandleProps}
        style={{
          display: "none",
        }}
      />
      <HoverCard shadow="md" position="left" withArrow>
        <HoverCard.Target>
          <Box>
            <Card shadow="sm" radius="md" withBorder>
              {renderInputField(component.type, component.type, options)}
            </Card>
          </Box>
        </HoverCard.Target>
        <HoverCard.Dropdown p={4}>
          <Stack gap={0}>
            <ActionIcon variant="transparent" {...dragHandleProps}>
              <IconGripVertical size={18} />
            </ActionIcon>
            <ActionIcon
              variant="transparent"
              onClick={() => {
                const updatedComponents = data.components.filter(
                  (comp) => comp.id !== component.id,
                );
                setNodes((nodes) =>
                  nodes.map((node) =>
                    node.id === id
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            components: updatedComponents,
                          },
                        }
                      : node,
                  ),
                );
              }}
            >
              <IconTrash size={18} />
            </ActionIcon>

            <RenderMenuDropdown
              addComponentNode={addComponentNode}
              index={index}
              isTicketFeatureActive={isTicketFeatureActive}
            />
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    </>
  );
};

export default DraggableComponent;

const TicketColumnSelector = ({ component, setNodes, id, options, index }) => {
  const [selectedBoardId, setSelectedBoardId] = useState(
    component.boardId || null,
  );

  // Transform boards for Select component
  const boards = useMemo(
    () => options?.map((board) => ({ value: board.id, label: board.title })),
    [],
  );

  // Get columns for selected board
  const columns = useMemo(() => {
    const selectedBoard = options?.find(
      (board) => board.id === selectedBoardId,
    );
    return selectedBoard
      ? selectedBoard.ticketColumns.map((col) => ({
          value: col.id,
          label: col.title,
        }))
      : [];
  }, [selectedBoardId]);

  return (
    <Stack gap="xs">
      <Select
        label="Select Board"
        placeholder="Choose a board"
        value={component.boardId}
        data={boards}
        onChange={(boardId) => {
          setSelectedBoardId(boardId);
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      components: node.data.components.map((comp, compIndex) =>
                        compIndex === index
                          ? {
                              ...comp,
                              boardId,
                              columnId: null, // Reset column when board changes
                            }
                          : comp,
                      ),
                    },
                  }
                : node,
            ),
          );
        }}
      />
      {selectedBoardId && (
        <Select
          label="Select Column"
          placeholder="Choose a column"
          value={component.columnId}
          data={columns}
          onChange={(columnId) => {
            setNodes((nodes) =>
              nodes.map((node) =>
                node.id === id
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        components: node.data.components.map(
                          (comp, compIndex) =>
                            compIndex === index
                              ? {
                                  ...comp,
                                  columnId,
                                }
                              : comp,
                        ),
                      },
                    }
                  : node,
              ),
            );
          }}
        />
      )}
    </Stack>
  );
};
