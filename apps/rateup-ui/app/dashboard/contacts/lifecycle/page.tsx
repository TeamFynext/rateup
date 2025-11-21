"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import {
  Group,
  Badge as MantineBadge,
  Select as MantineSelect,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Activity,
  ArrowUpDown,
  GripVertical,
  Plus,
  Save,
  Tag,
  Trash2,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";

import {
  useCreateLifeCycleMutation,
  useDeleteLifeCycleMutation,
  useLifecyclesWithContactCount,
  useReorderLifeCycleMutation,
  useUpdateLifeCycleMutation,
} from "@/backend/lifecycle/lifecycle.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CustomAlertDialog from "@/components/ui/custom/CustomAlertDialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progressnew";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLifecycleContext } from "@/context/LifecycleContext";
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

function getColorClasses(str: string) {
  const colors: Record<
    string,
    { bg: string; text: string; border: string; hover: string }
  > = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-300",
      hover: "hover:bg-blue-50",
    },
    cyan: {
      bg: "bg-cyan-100",
      text: "text-cyan-700",
      border: "border-cyan-300",
      hover: "hover:bg-cyan-50",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-300",
      hover: "hover:bg-green-50",
    },
    emerald: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-300",
      hover: "hover:bg-emerald-50",
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-300",
      hover: "hover:bg-orange-50",
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-300",
      hover: "hover:bg-red-50",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-300",
      hover: "hover:bg-purple-50",
    },
    pink: {
      bg: "bg-pink-100",
      text: "text-pink-700",
      border: "border-pink-300",
      hover: "hover:bg-pink-50",
    },
  };

  const keys = Object.keys(colors);
  console.log("str", str);

  const getStringHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const index = str ? getStringHash(str) % keys.length : 0;
  return colors[keys[index]];
}

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

const LifecycleStageCard = ({
  stage,
  selectedStage,
  setSelectedStage,
  totalContacts,
  lifecycleStages,
}) => {
  const colors = getColorClasses(stage?.name);
  const percentage = (stage._count.contacts / totalContacts) * 100;
  const [openedEdit, setOpenedEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteLifecycle = useDeleteLifeCycleMutation();
  const handleDeleteStage = async () => {
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

    deleteLifecycle.mutate(stage.id);
  };
  const canDeleteStage = (stage: LifecycleStage) => {
    if (stage.isDefault) return false;
    if (stage.category === "won") {
      const wonStages = lifecycleStages.filter((s) => s.category === "won");
      return wonStages.length > 1;
    }
    return true;
  };

  return (
    <Card
      key={stage.id}
      className={`p-4 cursor-pointer transition-all ${selectedStage === stage.id ? "ring-2 ring-rateup-blue" : ""} ${colors.hover}`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedStage(selectedStage === stage.id ? null : stage.id);
        setOpenedEdit(true);
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-lg">{stage.emoji}</p>
        <div className="flex items-center gap-1">
          <Badge
            style={{
              backgroundColor: getCategoryColor(stage.category),
            }}
          >
            {getCategoryIcon(stage.category)}
            {stage.category}
          </Badge>
          {stage.isDefault && (
            <Badge variant="outline" color="gray">
              Default
            </Badge>
          )}
          {canDeleteStage(stage) && (
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="text-red-500" />
            </Button>
          )}
        </div>
      </div>

      <h3 className="mb-2">{stage.name}</h3>

      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <span className="text-2xl">{stage.count}</span>
          <span className="text-sm text-muted-foreground">{percentage}%</span>
        </div>

        <Progress value={percentage} className="h-2" />

        <p className="text-xs text-muted-foreground">{stage.description}</p>

        {/* <div className="flex items-center gap-2 pt-2 border-t">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Avg: {stage.avgDuration}</span>
        </div> */}
      </div>
      <EditLifecycleStage
        stage={stage}
        opened={openedEdit}
        setOpened={setOpenedEdit}
      />
      <CustomAlertDialog
        buttonTitle="Delete"
        description="Are you sure you want to delete this lifycycle stage?"
        onAction={handleDeleteStage}
        opened={deleteOpen}
        setOpened={setDeleteOpen}
        title="Delete Lifecycle Stage"
        buttonColor="bg-red-500"
      />
    </Card>
  );
};
const ContactSettings = () => {
  const { data: lifecycles, isLoading } = useLifecyclesWithContactCount();

  // Separate stages by category
  const lifecycleStages = lifecycles
    ?.filter((stage) => stage.category === "active" || stage.category === "won")
    .sort((a, b) => a.ordering - b.ordering);
  const lostStages = lifecycles
    ?.filter((stage) => stage.category === "lost")
    .sort((a, b) => a.ordering - b.ordering);

  const totalContacts = useMemo(
    () =>
      lifecycles?.reduce((sum, stage) => sum + stage?._count?.contacts, 0) ?? 0,
    [],
  );
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const [isAddFormOpened, setIsOpenedAddForm] = useState(false);
  const [isOpenedOrderModal, setIsOpenedOrderModal] = useState(false);

  if (isLoading) return <Spinner />;
  if (lifecycles.length === 0) {
    return (
      <div className="grid place-content-center py-12 h-full">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No lifecycle stages yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first lifecycle stage to start track and manage customer
            journey.
          </p>
          <Button
            onClick={() => {
              setIsOpenedAddForm(true);
            }}
            className="bg-rateup-blue"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Lifecycle Stage
          </Button>
          <AddLifeCycleStage
            lifecycleStages={lifecycleStages}
            lostStages={lostStages}
            opened={isAddFormOpened}
            setOpened={setIsOpenedAddForm}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full overflow-auto p-1">
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="mb-1">Lifecycle Management</h2>
            <p className="text-sm text-muted-foreground">
              Track and manage customer journey across different lifecycle
              stages
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsOpenedAddForm(true)}
              className="bg-rateup-blue"
            >
              <Plus />
              <span className="text-sm">Add Lifecycle Stage</span>
            </Button>
            <Button
              onClick={() => setIsOpenedOrderModal(true)}
              className="bg-rateup-blue"
            >
              <ArrowUpDown />
              <span className="text-sm">Manage Order</span>
            </Button>
            <AddLifeCycleStage
              lifecycleStages={lifecycleStages}
              lostStages={lostStages}
              opened={isAddFormOpened}
              setOpened={setIsOpenedAddForm}
            />
            <ReorderLifeCycleStage
              lifecycleStages={lifecycleStages}
              lostStages={lostStages}
              opened={isOpenedOrderModal}
              setOpened={setIsOpenedOrderModal}
            />
          </div>
        </div>
      </Card>
      <div>
        <div className="mb-4">
          <h3 className="mb-1">Lifecycle Stages</h3>
          <p className="text-sm text-muted-foreground">
            Distribution of contacts across different lifecycle stages
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {lifecycleStages?.map((stage) => {
            return (
              <LifecycleStageCard
                key={stage.id}
                lifecycleStages={lifecycleStages}
                selectedStage={selectedStage}
                setSelectedStage={setSelectedStage}
                stage={stage}
                totalContacts={totalContacts}
              />
            );
          })}
        </div>
      </div>
      {lostStages.length > 0 && (
        <div>
          <div className="mb-4">
            <h3 className="mb-1">Lost Stages</h3>
            <p className="text-sm text-muted-foreground">
              Distribution of contacts across different lost stages
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {lostStages?.map((stage) => {
              return (
                <LifecycleStageCard
                  key={stage.id}
                  lifecycleStages={lifecycleStages}
                  selectedStage={selectedStage}
                  setSelectedStage={setSelectedStage}
                  stage={stage}
                  totalContacts={totalContacts}
                />
              );
            })}
          </div>
        </div>
      )}
      <div>
        <div className="mb-4">
          <h3 className="mb-1">Customer Journey Funnel</h3>
          <p className="text-sm text-muted-foreground">
            Visualize how contacts progress through your customer journey
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-2">
            {lifecycles.map((stage, index) => {
              const width = 100 - index * 12;
              const colors = getColorClasses(stage.name);
              const percentage = (stage._count.contacts / totalContacts) * 100;

              return (
                <div key={stage.id} className="flex items-center gap-4">
                  <div className="w-32 text-sm">{stage?.name}</div>
                  <div className="flex-1">
                    <div
                      className={`${colors.bg} ${colors.text} p-3 rounded transition-all hover:scale-[1.02]`}
                      style={{ width: `${width}%` }}
                    >
                      <div className="flex items-center justify-between">
                        <span>{stage._count.contacts} contacts</span>
                        <span>{percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

const renderAddStageForm = ({ lifecycleStages, lostStages, onSave }) => {
  const lifecycles = useLifecycleContext();
  const createLifecycle = useCreateLifeCycleMutation();
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

  const handleAddStage = async (values: StageFormData) => {
    const totalStages = lifecycles.length;

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

    createLifecycle.mutate(newStageData, {
      onSuccess: () => {
        onSave();
      },
      onSettled: () => {
        addStageForm.reset();
      },
    });
  };

  return (
    <Card className="p-2 mb-1 bg-gray-100">
      <form onSubmit={addStageForm.onSubmit(handleAddStage)}>
        <div className="flex flex-col gap-2">
          <div className="flex w-full">
            <Button
              type="button"
              className="rounded-xs py-1 w-1/2"
              onClick={() => setActiveTab("lifecycle")}
              variant={activeTab === "lifecycle" ? "default" : "outline"}
            >
              <span className="text-sm">
                Lifecycle Stages({lifecycleStages.length})
              </span>
            </Button>
            <Button
              type="button"
              className="rounded-xs py-1 w-1/2"
              onClick={() => setActiveTab("lost")}
              variant={activeTab === "lost" ? "default" : "outline"}
            >
              <span className="text-sm">Lost Stages ({lostStages.length})</span>
            </Button>
          </div>
          <Group gap="xs">
            <TextInput
              size="sm"
              placeholder="Stage name"
              style={{ flex: 1 }}
              {...addStageForm.getInputProps("name")}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  {addStageForm.values.emoji}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" className="w-full">
                <EmojiPicker
                  onEmojiClick={(emojiData) =>
                    addStageForm.setFieldValue("emoji", emojiData.emoji)
                  }
                />
              </PopoverContent>
            </Popover>
          </Group>

          <Group gap="xs">
            {activeTab === "lifecycle" && (
              <MantineSelect
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
            <Button type="submit">
              {createLifecycle.isPending ? (
                <Spinner />
              ) : (
                <Save size={12} style={{ marginRight: 4 }} />
              )}{" "}
              Save
            </Button>
            <Button
              variant="secondary"
              type="reset"
              onClick={() => {
                addStageForm.reset();
              }}
            >
              <X size={12} style={{ marginRight: 4 }} /> Cancel
            </Button>
          </Group>
        </div>
      </form>
    </Card>
  );
};

const AddLifeCycleStage = ({
  lifecycleStages,
  lostStages,
  opened,
  setOpened,
}) => {
  function onSave() {
    setOpened(false);
  }

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add Lifecycle Stage</DialogTitle>
          <DialogDescription>
            Add lifecycle stage to track and manage customer journey
          </DialogDescription>
        </DialogHeader>
        {renderAddStageForm({ lifecycleStages, lostStages, onSave })}
      </DialogContent>
    </Dialog>
  );
};

const EditLifecycleStage = ({ opened, setOpened, stage }) => {
  function onSave() {
    setOpened(false);
  }
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Lifecycle Stage</DialogTitle>
          <DialogDescription>
            Edit lifecycle stage to track and manage customer journey
          </DialogDescription>
        </DialogHeader>
        {EditStageForm({ stage, onSave })}
      </DialogContent>
    </Dialog>
  );
};

const EditStageForm = ({
  stage,
  onSave,
  onCancel,
}: {
  stage: LifecycleStage;
  onSave?: () => void;
  onCancel?: () => void;
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

  const updateLifecycle = useUpdateLifeCycleMutation();

  const handleUpdateStage = async (updates: Partial<LifecycleStage>) => {
    updateLifecycle.mutate(
      { id: stage.id, data: updates },
      {
        onSuccess: () => {
          if (onSave) onSave();
        },
      },
    );
  };

  const isLifecycleStage =
    stage.category === "active" || stage.category === "won";

  const handleSubmit = (values: StageFormData) => {
    handleUpdateStage(values);
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
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                {editStageForm.values.emoji}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <EmojiPicker
                onEmojiClick={(emojiData) =>
                  editStageForm.setFieldValue("emoji", emojiData.emoji)
                }
              />
            </PopoverContent>
          </Popover>
        </Group>

        <Group gap="xs">
          {isLifecycleStage && (
            <Select
              value={editStageForm.values.category}
              onValueChange={(value) =>
                editStageForm.setFieldValue("category", value as any)
              }
              disabled={stage.isDefault}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="won">Won</SelectItem>
              </SelectContent>
            </Select>
          )}
          <TextInput
            size="sm"
            placeholder="Description"
            style={{ flex: 2 }}
            {...editStageForm.getInputProps("description")}
          />
        </Group>

        <Group gap="xs">
          <Button type="submit">
            {updateLifecycle.isPending ? (
              <Spinner />
            ) : (
              <Save size={12} style={{ marginRight: 4 }} />
            )}
            Save
          </Button>
          <Button
            type="reset"
            variant="secondary"
            onClick={() => {
              editStageForm.reset();
              if (onCancel) {
                onCancel();
              }
            }}
          >
            <X size={12} style={{ marginRight: 4 }} /> Cancel
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

const ReorderLifeCycleStage = ({
  lifecycleStages,
  lostStages,
  opened,
  setOpened,
}) => {
  const reorderLifeCycle = useReorderLifeCycleMutation();

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sourceDroppableId = result.source.droppableId;
    const destDroppableId = result.destination.droppableId;

    // Get the appropriate stage array
    const sourceStages =
      sourceDroppableId === "lifecycle-stages" ? lifecycleStages : lostStages;

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
        lifecycleStages.at(-1)?.category === "won";
      if (wouldDisplaceWonStage && draggedStage.category !== "won") return;
    }

    // No movement occurred
    if (result.source.index === result.destination.index) return;

    const items = Array.from(sourceStages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Create new items with updated ordering values
    const updatedItems = items.map((item: any, index) => ({
      ...item,
      ordering: index,
    }));

    // Pass only id and ordering to the mutation
    const reorderData = updatedItems.map((item) => ({
      id: item.id!,
      ordering: item.ordering,
      category: item.category,
    }));

    reorderLifeCycle.mutate(reorderData);
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
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={{
        ...provided.draggableProps.style,
        opacity: canMoveStage(stage, index, stages) ? 1 : 0.7,
      }}
      className={`${snapshot.isDragging ? "shadow-lg" : "shadow-xs"} p-1 rounded-md`}
    >
      <div className="flex gap-3 flex-nowrap py-2 items-center">
        <div {...provided.dragHandleProps}>
          <GripVertical
            size={18}
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
        <p className="text-lg">{stage.emoji}</p>
        <div className="flex flex-col flex-1 gap-1">
          <div className="flex gap-3 flex-nowrap items-center">
            <p className="text-sm font-semibold text-ellipsis">{stage.name}</p>
            <MantineBadge
              size="xs"
              color={getCategoryColor(stage.category)}
              leftSection={getCategoryIcon(stage.category)}
            >
              {stage.category}
            </MantineBadge>
            {stage.isDefault && (
              <MantineBadge size="xs" variant="outline" color="gray">
                Default
              </MantineBadge>
            )}
          </div>
          {stage.description && (
            <p className="text-xs text-muted-foreground text-ellipsis">
              {stage.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reorder Lifecycle stages</DialogTitle>
          <DialogDescription>Drag and drop to reorder stages</DialogDescription>
        </DialogHeader>
        <Tabs>
          <TabsList className="w-full">
            <TabsTrigger value="lifecycle">Lifecycle Stage</TabsTrigger>
            <TabsTrigger value="lost">Lost Stages</TabsTrigger>
          </TabsList>

          <TabsContent value="lifecycle" className="min-h-[12rem]">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable
                droppableId="lifecycle-stages"
                renderClone={(provided, snapshot, rubric) => {
                  const stage = lifecycleStages[rubric.source.index];
                  return renderStageCard(
                    stage,
                    rubric.source.index,
                    lifecycleStages,
                    provided,
                    snapshot,
                  );
                }}
              >
                {(provided) => (
                  <div
                    className="flex flex-col gap-2"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
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
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </TabsContent>
          <TabsContent value="lost" className="min-h-[12rem]">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ContactSettings;
