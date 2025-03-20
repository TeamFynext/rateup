import { memo, useState } from "react";

import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Paper,
  ScrollAreaAutosize,
  Text,
} from "@mantine/core";
import { IconDeviceLaptop, IconPlus, IconTrash } from "@tabler/icons-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Handle, NodeToolbar, Position } from "@xyflow/react";

import { SubscriptionFeaturePathName } from "@/types/enums";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useBoardsQueries } from "@/backend/tickets/tickets.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import useTranslations from "@/dictionaries/useTranslation";
import { hasFeature } from "@/utils/subscription/subscription";

import DraggableComponent from "./DraggableComponent";
import styles from "./ScreenNode.module.css";

export enum ComponentType {
  BasicText = "BasicText",
  Image = "Image",
  Flow = "Flow",
  Template = "Template",
  List = "List",
  Ticket = "Ticket",
}

const getItemStyle = (isDragging, draggableStyle) => ({
  userSelect: "none",
  paddingTop: 8,
  ...draggableStyle,
});

const getListStyle = (isDraggingOver) => ({
  // background: isDraggingOver ? "lightblue" : "lightgrey",
  width: 276,
});

const ScreenNode = ({ id, data, setNodes }) => {
  const { data: templates, isLoading } = useWaTemplates();
  const { data: flows, isPending } = useWaFlowsFromDb();
  const { translations } = useTranslations();
  const { data: subscription } = useSubscription();
  const { data: boardData } = useBoardsQueries();

  const addComponentNode = (type: ComponentType, index?: number) => {
    const newComponent = {
      id: crypto.randomUUID(),
      name: [
        {
          id: crypto.randomUUID(),
          value: "",
        },
      ],
      type: type,
      draggable: false,
    };
    const updatedComponents = data.components || [];
    if (index !== undefined) {
      updatedComponents.splice(index + 1, 0, newComponent);
    } else {
      updatedComponents.push(newComponent);
    }

    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, components: updatedComponents } }
          : node,
      ),
    );
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const updatedComponents = Array.from(data.components);
    const [movedComponent] = updatedComponents.splice(result.source.index, 1);
    updatedComponents.splice(result.destination.index, 0, movedComponent);

    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, components: updatedComponents } }
          : node,
      ),
    );
  };

  if (isLoading || isPending) return <RateupLoader />;

  return (
    <Box className={styles.cardBody}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handleLeft}
      />
      <NodeToolbar
        isVisible={data?.forceToolbarVisible || undefined}
        position={Position.Top}
        offset={5}
      >
        <Paper shadow="xl" p="4" withBorder>
          <ActionIcon
            variant="transparent"
            onClick={() =>
              setNodes((nds) => nds.filter((node) => node.id !== id))
            }
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Paper>
      </NodeToolbar>
      <Group gap={"xs"} mb={"xs"} w={{ xl: "90%" }}>
        <ActionIcon variant="transparent">
          <IconDeviceLaptop size={18} />
        </ActionIcon>
        <Text>{data?.label}</Text>
      </Group>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}
            >
              {data?.components.map((component, index) => (
                <Draggable
                  key={component.id}
                  draggableId={component.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      className={styles.itemDragging}
                      {...provided.draggableProps}
                      style={getItemStyle(
                        snapshot.isDragging,
                        provided.draggableProps.style,
                      )}
                    >
                      <DraggableComponent
                        component={component}
                        data={data}
                        id={id}
                        setNodes={setNodes}
                        dragHandleProps={provided.dragHandleProps}
                        addComponentNode={addComponentNode}
                        index={index}
                        options={
                          component?.type === ComponentType.Flow
                            ? flows.map((t) => ({
                                label: t.name,
                                value: t.dbFlowId,
                              }))
                            : component?.type === ComponentType.Template
                              ? templates.map((t) => ({
                                  label: t.data.name,
                                  value: t.id,
                                  flowId: t.data?.components?.find(
                                    (c) => c.type === "BUTTONS",
                                  )?.buttons?.[0]?.["flow_id"],
                                }))
                              : component?.type === ComponentType.Ticket
                                ? boardData
                                : []
                        }
                        isTicketFeatureActive={hasFeature(
                          subscription,
                          SubscriptionFeaturePathName.Ticket,
                        )}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <RenderMenuDropdown
        addComponentNode={addComponentNode}
        button={
          <Button
            leftSection={<IconPlus size={18} />}
            variant="outline"
            mt={"xs"}
            fullWidth
            radius={"md"}
          >
            {translations["Add Content"]}
          </Button>
        }
        isTicketFeatureActive={hasFeature(
          subscription,
          SubscriptionFeaturePathName.Ticket,
        )}
      />
    </Box>
  );
};
export function RenderMenuDropdown({
  addComponentNode,
  button,
  index,
  isTicketFeatureActive,
}: {
  addComponentNode: any;
  button?: any;
  index?: number;
  isTicketFeatureActive: boolean;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <Menu
      shadow="md"
      width={200}
      withArrow
      position="bottom"
      opened={opened}
      onChange={setOpened}
    >
      <Menu.Target>
        <Box>
          {button ? (
            button
          ) : (
            <ActionIcon variant="transparent">
              <IconPlus size={18} />
            </ActionIcon>
          )}
        </Box>
      </Menu.Target>

      <Menu.Dropdown>
        <ScrollAreaAutosize mah={300}>
          <Menu.Label>Components</Menu.Label>
          <Menu.Item
            onClick={(e) => {
              e?.preventDefault();
              addComponentNode(ComponentType.BasicText, index);
            }}
          >
            Text + Button
          </Menu.Item>
          <Menu.Item
            onClick={() => addComponentNode(ComponentType.Image, index)}
          >
            Image + Button
          </Menu.Item>
          <Menu.Item
            onClick={() => addComponentNode(ComponentType.Flow, index)}
          >
            Flow
          </Menu.Item>
          <Menu.Item
            onClick={() => addComponentNode(ComponentType.Template, index)}
          >
            Template
          </Menu.Item>
          <Menu.Item
            onClick={() => addComponentNode(ComponentType.List, index ?? 0)}
          >
            List
          </Menu.Item>
          {isTicketFeatureActive && (
            <Menu.Item
              onClick={() => addComponentNode(ComponentType.Ticket, index)}
            >
              Ticket
            </Menu.Item>
          )}
        </ScrollAreaAutosize>
      </Menu.Dropdown>
    </Menu>
  );
}
export default ScreenNode;
