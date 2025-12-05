import React, { useEffect, useState } from "react";

import { useDebouncedState, useDebouncedValue } from "@mantine/hooks";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Activity,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  AddLifeCycleStage,
  LifecycleStage,
} from "@/app/dashboard/contacts/lifecycle/page";
import {
  useDeleteLifeCycleMutation,
  useUpdateLifeCycleMutation,
} from "@/backend/lifecycle/lifecycle.query";
import { useUpdateOrgDetailsMutation } from "@/backend/org/org.query";
import { useUser } from "@/context/UserContext";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import CustomAlertDialog from "../ui/custom/CustomAlertDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Field, FieldContent, FieldDescription, FieldLabel } from "../ui/field";
import { Switch } from "../ui/switch";

const LifecycleSetup = ({
  lifecycleStages,
  lostStages,
  canMoveStage,
  onDragEnd,
  setLifecycleSetup,
  canDeleteStage,
  handleDeleteStage,
}) => {
  const t = useTranslations();
  const [openAddLifecycleDialog, setOpenAddLifecycleDialog] = useState(false);
  const [activeStage, setActiveStage] = useState("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set(),
  );
  const { user } = useUser();
  const [enableLifecycle, setEnableLifecycle] = useState(
    user?.showLifecycle || false,
  );
  const [showLifecycle] = useDebouncedValue(enableLifecycle, 100);
  const updateOrg = useUpdateOrgDetailsMutation();

  const toggleDescription = (id: string) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDescriptions(newExpanded);
  };

  useEffect(() => {
    if (user.showLifecycle !== showLifecycle) {
      updateOrg.mutate(
        { showLifecycle },
        {
          onError: () => {
            setLifecycleSetup(user.showLifecycle);
          },
        },
      );
    }
  }, [showLifecycle]);
  return (
    <div className="flex flex-col h-full">
      <div className="border-b-1 pb-4">
        <div className="flex gap-2 items-center px-4">
          <div className="bg-gradient-to-br from-rateup-blue to-blue-600 rounded-md text-white w-8 h-8 flex items-center justify-center">
            <Activity className="text-[9px]" />
          </div>
          <div className="flex flex-col gap-1/2">
            <h1 className="text-xl">{t("Lifecycle")}</h1>
            <p className="text-xs text-muted-foreground">
              {t(
                "Track and manage Contacts through every stage of your sales process",
              )}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-grow min-h-0 overflow-auto items-center p-8">
        <Card className="p-4 my-2 mb-6">
          <Field className="" orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="lifecycle-enable">
                Show/Hide Lifecycle Stages
              </FieldLabel>
              <FieldDescription>
                Display Lifecycle Stages in the Inbox and Contacts modules.
                Disabling this only hides the Stages. Your Contact data remains
                safe and unchanged.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="lifecycle-enable"
              checked={enableLifecycle}
              onCheckedChange={setEnableLifecycle}
            />
          </Field>
        </Card>
        <div className="border-1 rounded-xl">
          <div className="flex justify-between gap-2 border-b-1 p-4">
            <h3 className="text-base tracking-tight font-normal">
              {t("Set up Lifecycle Stages")}
            </h3>
            <div className="flex gap-2 ">
              <Button
                variant="ghost"
                className="hover:text-blue-500"
                onClick={() => setLifecycleSetup(false)}
              >
                {t("Cancel")}
              </Button>
              {/* <Button>{t("Save")}</Button> */}
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-8 border-r-1">
              <div className="flex gap-2 bg-green-50 p-2 rounded-md">
                <p>🏆</p>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">{t("Lifecycle Stages")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Organize and track Contacts through key stages of their journey.A default inbox filter will be created in the Inbox module.",
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-3 my-6 w-full">
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="lifecycle-stages">
                    {(provided) => (
                      <div
                        className="flex flex-col gap-2"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {lifecycleStages.map((stage, index) => {
                          const isMovable = canMoveStage(
                            stage,
                            index,
                            lifecycleStages,
                          );
                          return (
                            <Draggable
                              key={stage.id}
                              draggableId={stage.id}
                              index={index}
                              isDragDisabled={!isMovable}
                            >
                              {(provided, snapshot) => (
                                <LifeCycleStageCard
                                  stage={stage}
                                  index={index}
                                  provided={provided}
                                  isMovable={isMovable}
                                  expandedDescriptions={expandedDescriptions}
                                  toggleDescription={toggleDescription}
                                  canDeleteStage={canDeleteStage}
                                  handleDeleteStage={handleDeleteStage}
                                  lifecycleStages={lifecycleStages}
                                  lostStages={lostStages}
                                />
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              <Button
                onClick={() => {
                  setActiveStage("lifecycle");
                  setOpenAddLifecycleDialog(true);
                }}
                variant="outline"
                className="w-full py-2.5 text-sm text-muted-foreground hover:text-rateup-blue flex items-center justify-center gap-1.5 border border-dashed rounded-md hover:border-rateup-blue hover:bg-rateup-blue/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Stage
              </Button>
            </div>

            <div className="p-8">
              <div className="flex gap-2 bg-red-50 p-2 rounded-md">
                <p>😔</p>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">{t("Lost Stages")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Track where Contacts go after exiting your sales process.  No default inbox filter will be created in the Inbox module for Lost Stages.",
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-3 my-6 w-full">
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="lost-stages">
                    {(provided) => (
                      <div
                        className="flex flex-col gap-2"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {lostStages.map((stage, index) => {
                          const isMovable = canMoveStage(
                            stage,
                            index,
                            lostStages,
                          );
                          return (
                            <Draggable
                              key={stage.id}
                              draggableId={stage.id}
                              index={index}
                              isDragDisabled={!isMovable}
                            >
                              {(provided, snapshot) => (
                                <LifeCycleStageCard
                                  stage={stage}
                                  index={index}
                                  provided={provided}
                                  isMovable={isMovable}
                                  expandedDescriptions={expandedDescriptions}
                                  toggleDescription={toggleDescription}
                                  canDeleteStage={canDeleteStage}
                                  handleDeleteStage={handleDeleteStage}
                                  lifecycleStages={lifecycleStages}
                                  lostStages={lostStages}
                                />
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              <Button
                onClick={() => {
                  setActiveStage("lost");
                  setOpenAddLifecycleDialog(true);
                }}
                variant="outline"
                className="w-full py-2.5 text-sm text-muted-foreground hover:text-rateup-blue flex items-center justify-center gap-1.5 border border-dashed rounded-md hover:border-rateup-blue hover:bg-rateup-blue/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Stage
              </Button>
            </div>
          </div>
        </div>
      </div>
      <AddLifeCycleStage
        opened={openAddLifecycleDialog}
        setOpened={setOpenAddLifecycleDialog}
        lifecycleStages={lifecycleStages}
        lostStages={lostStages}
        activeStage={activeStage}
      />
    </div>
  );
};

const LifeCycleStageCard = ({
  stage,
  index,
  provided,
  isMovable,
  toggleDescription,
  expandedDescriptions,
  canDeleteStage,
  handleDeleteStage,
  lifecycleStages,
  lostStages,
}) => {
  console.log("stage", stage);
  const [description, setDescription] = useState(stage.description || "");
  const [updatedDescription] = useDebouncedValue(description, 1000);
  const updateLifecycle = useUpdateLifeCycleMutation();

  const handleUpdateStage = async (updates: Partial<LifecycleStage>) => {
    updateLifecycle.mutate(
      { id: stage.id, data: updates },
      {
        onSuccess: () => {
          toast.success("description updated");
        },
        onError: () => {
          toast.error("description update failed");
        },
      },
    );
  };
  useEffect(() => {
    if (stage.description !== updatedDescription)
      handleUpdateStage({ ...stage, description: updatedDescription });
  }, [updatedDescription]);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={{
        ...provided.draggableProps.style,
        opacity: isMovable ? 1 : 0.7,
      }}
      className={`flex gap-2 items-center w-full`}
    >
      <div key={stage.id} className="flex-1 min-w-0 flex-col">
        <span className="text-[11px] text-muted-foreground font-medium block ml-10">
          Stage {index + 1}
        </span>
        <div className="flex items-center justify-between gap-3 group py-2 px-2 rounded-md hover:bg-gray-50 transition-colors">
          <div {...provided.dragHandleProps}>
            <GripVertical
              className={`w-4 h-4 ${isMovable ? "text-gray-400 " : "text-gray-300"} flex-shrink-0 ${isMovable ? "cursor-grab" : ""}`}
            />
          </div>
          <div
            style={{ backgroundColor: stage.color }}
            className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm`}
          >
            <span>{stage.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{stage.name}</p>
          </div>
          {stage.category === "won" && (
            <Badge className="bg-green-100 text-green-700 text-[10px] h-5 px-2.5 hover:bg-green-100 border-0 font-medium">
              Won stage
            </Badge>
          )}
          {stage.isDefault && (
            <Badge variant="outline" color="gray">
              Default
            </Badge>
          )}
          <LifecycleStageCardMenu
            {...{
              stage,
              canDeleteStage,
              handleDeleteStage,
              lifecycleStages,
              lostStages,
            }}
          />
        </div>
        <Button
          onClick={() => toggleDescription(stage.id)}
          className="text-[7px] text-rateup-blue  ml-14"
          variant="link"
        >
          Show description
        </Button>
        {expandedDescriptions.has(stage.id) && (
          <div className="ml-14 mt-2">
            <textarea
              className="w-full text-xs border rounded-md px-3 py-2 min-h-[70px] resize-none focus:outline-none focus:ring-2 focus:ring-rateup-blue/20 focus:border-rateup-blue"
              placeholder="Add a description for this stage..."
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const LifecycleStageCardMenu = ({
  stage,
  canDeleteStage,
  handleDeleteStage,
  lifecycleStages,
  lostStages,
}) => {
  const updateLifecycle = useUpdateLifeCycleMutation();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const handleUpdateStage = async (
    updates: Partial<LifecycleStage>,
    onSuccess,
    onError,
  ) => {
    updateLifecycle.mutate(
      { id: stage.id, data: updates },
      {
        onSuccess,
        onError,
      },
    );
  };
  function setAsWonStage() {
    handleUpdateStage(
      { ...stage, category: "won" },
      () => {
        toast.success("Set stage as won stage");
      },
      () => {
        toast.error("Unable to set to won stage");
      },
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setEditOpen(true);
          }}
        >
          <Pencil className="w-3.5 h-3.5 mr-2" />
          Edit
        </DropdownMenuItem>
        {stage.category !== "lost" && (
          <DropdownMenuItem onClick={setAsWonStage}>
            <UserCheck className="w-3.5 h-3.5 mr-2" />
            Set as won stage
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className="text-red-600"
          onClick={() => setDeleteOpen(true)}
          disabled={!canDeleteStage(stage)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CustomAlertDialog
        buttonTitle="Delete"
        description="Are you sure you want to delete this lifycycle stage?"
        onAction={() => handleDeleteStage(stage)}
        opened={deleteOpen}
        setOpened={setDeleteOpen}
        title="Delete Lifecycle Stage"
        buttonColor="bg-red-500"
      />
      <AddLifeCycleStage
        activeStage={stage.category === "lost" ? "lost" : "lifecycle"}
        lifecycleStages={lifecycleStages}
        lostStages={lostStages}
        opened={editOpen}
        setOpened={setEditOpen}
        stage={stage}
      />
    </DropdownMenu>
  );
};
export default LifecycleSetup;
