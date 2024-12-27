import React, { useRef, useState } from "react";

import {
  ActionIcon,
  Box,
  Card,
  Group,
  HoverCard,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import {
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
}) => {
  const { setId, close, setType, open } = useReplyStore();
  const { translations } = useTranslations();
  const [image, setImage] = useState(data.components[index].name ?? null);
  const [loading, setLoading] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [imageError, setImageError] = useState("");
  const resetRef = useRef(null);

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
      if (file.size > 300000) return setImageError("max image size is 300KB");
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
                components: node.data.components.map((comp, compIndex) => {
                  let { name = {}, ...rest } = comp;
                  return compIndex === index ? rest : comp;
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
      const publicImageLink = await uploadFile(fileContent);
      setImage({ image: publicImageLink });
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
                          name: {
                            image: publicImageLink,
                          },
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
  const renderDynamicTextFields = (len = 4) => (
    <Stack gap={"xs"} onClick={(e) => e.stopPropagation()}>
      {component.name.map((field, i) => {
        let parsedValue = parseJsonToReact(field.value);
        return (
          <Group key={field.id} gap={4}>
            {i > 0 && (
              <ActionIcon
                title="Delete"
                radius={"sm"}
                variant="light"
                onClick={() => handleRemoveField(field.id)}
              >
                <IconMinus />
              </ActionIcon>
            )}
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
                  {i === 0 ? "Enter Text" : "Enter button name"}
                </Text>
              )}
              {i > 0 && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={field.id}
                  className={styles.handle_style}
                />
              )}
            </Card>
          </Group>
        );
      })}
      {component.name.length < len && (
        <RateupButtonPrimary
          title="Add Button"
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
        return (
          <Stack>
            <RateupFileUploadButton
              clearFile={clearFile}
              handleFileChange={handleFileChange}
              resetRef={resetRef}
              fileSrc={image}
            />
            <RateupButtonPrimary
              title="Save"
              radius={"sm"}
              onClick={uploadFileData}
              loading={loading}
              disabled={image?.image || !image}
            />
          </Stack>
        );
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
              onChange={(value) => {
                if (type !== ComponentType.Flow) close();
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
                                  ? { ...comp, name: value }
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
            />
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    </>
  );
};

export default DraggableComponent;
