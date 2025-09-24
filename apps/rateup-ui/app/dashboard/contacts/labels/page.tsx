"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

import {
  ActionIcon,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Popover,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Edit2,
  GripVertical,
  Plus,
  Save,
  Trash2,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";

import {
  useCreateLabelMutation,
  useDeleteLabelMutation,
  useUpdateLabelMutation,
} from "@/backend/label/label.query";
import { useLabelsContext } from "@/context/LabelsContext";
import { showErrorToast } from "@/utils/notifications";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

// Zod schemas
const stageSchema = z.object({
  name: z
    .string()
    .min(1, "Stage name is required")
    .max(50, "Stage name too long"),
  category: z.enum(["active", "won", "lost"]),
  emoji: z.string().min(1, "Emoji is required"),
  description: z.string().max(200, "Description too long").optional(),
});

type StageFormData = z.infer<typeof stageSchema>;

interface LifecycleStage {
  id?: string;
  name: string;
  ordering: number;
  isDefault: boolean;
  category: "active" | "won" | "lost";
  emoji: string;
  description: string;
  isWon: boolean;
}

const ContactSettings = () => {
  const labels = useLabelsContext();
  const updateLabel = useUpdateLabelMutation();
  const createLabel = useCreateLabelMutation();
  const deleteLabel = useDeleteLabelMutation();
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("lifecycle");

  // Add stage form
  const addStageForm = useForm<StageFormData>({
    validate: zod4Resolver(stageSchema),
    initialValues: {
      name: "",
      category: "active" as const,
      emoji: "🆕",
      description: "",
    },
  });

  // Separate stages by category
  const lifecycleStages = labels
    .filter((stage) => stage.category === "active" || stage.category === "won")
    .sort((a, b) => a.ordering - b.ordering);
  const lostStages = labels
    .filter((stage) => stage.category === "lost")
    .sort((a, b) => a.ordering - b.ordering);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sourceDroppableId = result.source.droppableId;
    const destDroppableId = result.destination.droppableId;

    // Get the appropriate stage array
    const sourceStages =
      sourceDroppableId === "lifecycle-stages" ? lifecycleStages : lostStages;
    const destStages =
      destDroppableId === "lifecycle-stages" ? lifecycleStages : lostStages;

    // Don't allow moving between different droppables
    if (sourceDroppableId !== destDroppableId) return;

    const draggedStage = sourceStages[result.source.index];

    // Don't allow moving the last lifecycle stage if it's a won stage
    if (sourceDroppableId === "lifecycle-stages") {
      const isLastStage = result.source.index === lifecycleStages.length - 1;
      const isWonStage = draggedStage.category === "won";
      if (isLastStage && isWonStage) return;

      // Don't allow moving to the last position if it would displace a won stage
      const wouldDisplaceWonStage =
        result.destination.index === lifecycleStages.length - 1 &&
        lifecycleStages[lifecycleStages.length - 1].category === "won";
      if (wouldDisplaceWonStage && draggedStage.category !== "won") return;
    }

    const items = Array.from(sourceStages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update ordering in the backend would go here
    try {
      // Implementation for updating ordering
    } catch (error) {
      console.error("Failed to update stage ordering:", error);
    }
  };

  const handleAddStage = async (values: StageFormData) => {
    const totalStages = labels.length;

    if (totalStages >= 10) {
      showErrorToast("Maximum 10 stages allowed in total");
      return;
    }

    const category = activeTab === "lifecycle" ? values.category : "lost";
    const currentStages =
      activeTab === "lifecycle" ? lifecycleStages : lostStages;

    const newStageData: LifecycleStage = {
      name: values.name,
      ordering: currentStages.length - 1 <= 0 ? 1 : currentStages.length - 1,
      isDefault: false,
      category: category as "active" | "won" | "lost",
      emoji: values.emoji,
      description: values.description || "",
      isWon: category === "won",
    };

    createLabel.mutate(newStageData, {
      onSettled: () => {
        setIsAddingStage(false);
        addStageForm.reset();
      },
    });
  };

  const handleDeleteStage = async (id: string) => {
    const stage = labels.find((s) => s.id === id);
    if (stage?.isDefault) {
      showErrorToast("Cannot delete default stage");
      return;
    }

    // Don't allow deleting the last won stage in lifecycle
    if (stage?.category === "won") {
      const wonStages = lifecycleStages.filter((s) => s.category === "won");
      if (wonStages.length === 1) {
        showErrorToast(
          "Cannot delete the last won stage. There must be at least one won stage.",
        );
        return;
      }
    }

    deleteLabel.mutate(id);
  };

  const handleUpdateStage = async (
    id: string,
    updates: Partial<LifecycleStage>,
  ) => {
    updateLabel.mutate(
      { id, data: updates },
      {
        onSettled: () => {
          setEditingStage(null);
        },
      },
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "won":
        return "green";
      case "lost":
        return "red";
      default:
        return "blue";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "won":
        return <Trophy className="w-4 h-4" />;
      case "lost":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const canDeleteStage = (stage: LifecycleStage) => {
    if (stage.isDefault) return false;
    if (stage.category === "won") {
      const wonStages = lifecycleStages.filter((s) => s.category === "won");
      return wonStages.length > 1;
    }
    return true;
  };

  const canMoveStage = (
    stage: LifecycleStage,
    index: number,
    stages: LifecycleStage[],
  ) => {
    if (stage.category === "won" && index === stages.length - 1) {
      return false; // Last won stage cannot be moved
    }
    return true;
  };

  const renderStageCard = (
    stage: LifecycleStage,
    index: number,
    stages: LifecycleStage[],
    provided: any,
    snapshot: any,
  ) => (
    <Paper
      ref={provided.innerRef}
      {...provided.draggableProps}
      shadow={snapshot.isDragging ? "lg" : "xs"}
      p="xs"
      withBorder
      style={{
        ...provided.draggableProps.style,
        opacity: canMoveStage(stage, index, stages) ? 1 : 0.7,
      }}
    >
      {editingStage === stage.id ? (
        <EditStageForm
          stage={stage}
          onSave={(updates) => handleUpdateStage(stage.id, updates)}
          onCancel={() => setEditingStage(null)}
        />
      ) : (
        <Group gap="xs" wrap="nowrap">
          <div {...provided.dragHandleProps}>
            <GripVertical
              size={16}
              color={
                canMoveStage(stage, index, stages)
                  ? "var(--mantine-color-gray-4)"
                  : "var(--mantine-color-gray-6)"
              }
              style={{
                cursor: canMoveStage(stage, index, stages)
                  ? "grab"
                  : "not-allowed",
              }}
            />
          </div>
          <Text size="lg">{stage.emoji}</Text>
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Text fw={500} size="sm" truncate>
                {stage.name}
              </Text>
              <Badge
                size="xs"
                color={getCategoryColor(stage.category)}
                leftSection={getCategoryIcon(stage.category)}
              >
                {stage.category}
              </Badge>
              {stage.isDefault && (
                <Badge size="xs" variant="outline" color="gray">
                  Default
                </Badge>
              )}
            </Group>
            {stage.description && (
              <Text size="xs" c="dimmed" truncate title={stage.description}>
                {stage.description}
              </Text>
            )}
          </Stack>
          <Group gap="xs">
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setEditingStage(stage.id)}
            >
              <Edit2 size={14} />
            </ActionIcon>
            {canDeleteStage(stage) && (
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={() => handleDeleteStage(stage.id)}
              >
                <Trash2 size={14} />
              </ActionIcon>
            )}
          </Group>
        </Group>
      )}
    </Paper>
  );

  const renderAddStageForm = () => (
    <Paper p="sm" withBorder mb="sm" bg="gray.0">
      <form onSubmit={addStageForm.onSubmit(handleAddStage)}>
        <Stack gap="xs">
          <Group gap="xs">
            <TextInput
              size="sm"
              placeholder="Stage name"
              style={{ flex: 1 }}
              {...addStageForm.getInputProps("name")}
            />
            <Popover position="bottom" withArrow>
              <Popover.Target>
                <Button size="sm" variant="outline" px="xs">
                  {addStageForm.values.emoji}
                </Button>
              </Popover.Target>
              <Popover.Dropdown p={0}>
                <EmojiPicker
                  onEmojiClick={(emojiData) =>
                    addStageForm.setFieldValue("emoji", emojiData.emoji)
                  }
                />
              </Popover.Dropdown>
            </Popover>
          </Group>

          <Group gap="xs">
            {activeTab === "lifecycle" && (
              <Select
                size="sm"
                data={[
                  { value: "active", label: "Active" },
                  { value: "won", label: "Won" },
                ]}
                style={{ flex: 1 }}
                {...addStageForm.getInputProps("category")}
              />
            )}
            <TextInput
              size="sm"
              placeholder="Description (optional)"
              style={{ flex: 2 }}
              {...addStageForm.getInputProps("description")}
            />
          </Group>

          <Group gap="xs">
            <Button size="xs" type="submit" loading={createLabel.isPending}>
              <Save size={12} style={{ marginRight: 4 }} /> Save
            </Button>
            <Button
              size="xs"
              variant="light"
              onClick={() => {
                setIsAddingStage(false);
                addStageForm.reset();
              }}
            >
              <X size={12} style={{ marginRight: 4 }} /> Cancel
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );

  return (
    <Container size="md" p="md">
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value || "lifecycle")}
        variant="pills"
        styles={{
          tab: {
            border: "1px solid var(--mantine-color-gray-3)",
            borderRadius: 8,
          },
        }}
      >
        <Tabs.List grow>
          <Tabs.Tab value="lifecycle">
            Lifecycle Stages ({lifecycleStages.length})
          </Tabs.Tab>
          <Tabs.Tab value="lost">Lost Stages ({lostStages.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="lifecycle" pt="sm">
          {isAddingStage && activeTab === "lifecycle" && renderAddStageForm()}

          {!isAddingStage && (
            <Group mb="sm">
              <Button
                size="sm"
                leftSection={<Plus size={14} />}
                onClick={() => setIsAddingStage(true)}
              >
                Add Stage
              </Button>
            </Group>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="lifecycle-stages">
              {(provided) => (
                <Stack
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  gap="xs"
                >
                  {lifecycleStages.map((stage, index) => (
                    <Draggable
                      key={stage.id}
                      draggableId={stage.id}
                      index={index}
                      isDragDisabled={
                        !canMoveStage(stage, index, lifecycleStages)
                      }
                    >
                      {(provided, snapshot) =>
                        renderStageCard(
                          stage,
                          index,
                          lifecycleStages,
                          provided,
                          snapshot,
                        )
                      }
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>
        </Tabs.Panel>

        <Tabs.Panel value="lost" pt="sm">
          {isAddingStage && activeTab === "lost" && renderAddStageForm()}

          {!isAddingStage && (
            <Group mb="sm">
              <Button
                size="sm"
                leftSection={<Plus size={14} />}
                onClick={() => setIsAddingStage(true)}
              >
                Add Stage
              </Button>
            </Group>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="lost-stages">
              {(provided) => (
                <Stack
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  gap="xs"
                >
                  {lostStages.map((stage, index) => (
                    <Draggable
                      key={stage.id}
                      draggableId={stage.id}
                      index={index}
                      isDragDisabled={!canMoveStage(stage, index, lostStages)}
                    >
                      {(provided, snapshot) =>
                        renderStageCard(
                          stage,
                          index,
                          lostStages,
                          provided,
                          snapshot,
                        )
                      }
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

const EditStageForm = ({
  stage,
  onSave,
  onCancel,
}: {
  stage: LifecycleStage;
  onSave: (updates: Partial<LifecycleStage>) => void;
  onCancel: () => void;
}) => {
  const editStageForm = useForm<StageFormData>({
    validate: zod4Resolver(stageSchema),
    initialValues: {
      name: stage.name,
      category: stage.category,
      emoji: stage.emoji,
      description: stage.description,
    },
  });

  const isLifecycleStage =
    stage.category === "active" || stage.category === "won";

  const handleSubmit = (values: StageFormData) => {
    onSave(values);
  };

  return (
    <form onSubmit={editStageForm.onSubmit(handleSubmit)}>
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap">
          <TextInput
            size="sm"
            style={{ flex: 1 }}
            {...editStageForm.getInputProps("name")}
          />
          <Popover position="bottom" withArrow>
            <Popover.Target>
              <Button size="sm" variant="outline" px="xs">
                {editStageForm.values.emoji}
              </Button>
            </Popover.Target>
            <Popover.Dropdown p={0}>
              <EmojiPicker
                onEmojiClick={(emojiData) =>
                  editStageForm.setFieldValue("emoji", emojiData.emoji)
                }
              />
            </Popover.Dropdown>
          </Popover>
        </Group>

        <Group gap="xs">
          {isLifecycleStage && (
            <Select
              size="sm"
              data={[
                { value: "active", label: "Active" },
                { value: "won", label: "Won" },
              ]}
              disabled={stage.isDefault}
              style={{ flex: 1 }}
              {...editStageForm.getInputProps("category")}
            />
          )}
          <TextInput
            size="sm"
            placeholder="Description"
            style={{ flex: 2 }}
            {...editStageForm.getInputProps("description")}
          />
        </Group>

        <Group gap="xs">
          <Button size="xs" type="submit">
            <Save size={12} style={{ marginRight: 4 }} /> Save
          </Button>
          <Button size="xs" variant="light" onClick={onCancel}>
            <X size={12} style={{ marginRight: 4 }} /> Cancel
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

export default ContactSettings;
