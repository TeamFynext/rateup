import { useQueryClient } from "@tanstack/react-query";
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { Connection, NodeChange } from "@xyflow/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSessionContext } from "supertokens-auth-react/recipe/session";

import { useUpdateWaAutomatedReplyMutation } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
import type { WaAutomatedReply } from "@/types/global";

import { validateNodeData } from "../types/node-types.ts";
import type { TypedNode } from "../types/node-types.ts";
import { getLayoutedElements } from "../utils/auto-layout.ts";
import { useDebouncedCallback, useHotkeys } from "../utils/flow-hooks.ts";
import { HistoryManager } from "../utils/history.ts";
import ComponentSidebar from "./component-sidebar.tsx";
import CustomEdge from "./custom-edge.tsx";
import { FlowbotPreviewPlayground } from "./flowbot-phone-preview.tsx";
import { initialEdges, initialNodes, leadAutomationinitialNodes } from "./initial-data.ts";
import NodeEditor from "./node-editor.tsx";
import { nodeTypes } from "./nodes/index.tsx";
import { getNodeLabel, getNodeVisual } from "./nodes/node-config.tsx";
import Toolbar from "./toolbar.tsx";

const defaultEdgeOptions = {
  type: "custom",
  animated: true,
  style: { stroke: "var(--primary)", strokeWidth: 2, strokeDasharray: "6 6" },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "var(--primary)",
  },
};

// This component is wrapped with ReactFlowProvider in the parent component
function FlowEditorContent({
  waAutomationData,
  refetch,
  onOpenSettings,
}: {
  readonly waAutomationData: WaAutomatedReply;
  readonly refetch: () => void;
  readonly onOpenSettings?: () => void;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const isLeadAutomation = waAutomationData?.commands?.[0]?.startsWith("lead");
  const [nodes, setNodes, onNodesChange] = useNodesState(
    isLeadAutomation ? leadAutomationinitialNodes : initialNodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<TypedNode | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const session = useSessionContext() as {
    userId: string;
  };

  const isUndoRedoOperationRef = useRef(false);
  const lastSavedFlowRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const qc = useQueryClient();
  const updateWaAutomatedReplyMutation = useUpdateWaAutomatedReplyMutation();

  // Initialize history manager
  const historyManagerRef = useRef(new HistoryManager());
  const historyManager = historyManagerRef.current;

  // Save initial state
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      historyManager.saveState({ nodes, edges });
      updateUndoRedoState();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateUndoRedoState = useCallback(() => {
    if (isMountedRef.current) {
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
    }
  }, []);

  const saveFlow = useCallback(() => {
    if (!reactFlowInstance || !waAutomationData) return;

    const flow = reactFlowInstance.toObject();
    const flowJson = JSON.stringify(flow);

    // Only save if the flow has actually changed
    if (flowJson !== lastSavedFlowRef.current) {
      lastSavedFlowRef.current = flowJson;

      updateWaAutomatedReplyMutation.mutate(
        {
          ...waAutomationData,
          matchData: {
            ...waAutomationData.matchData,
            json: flow,
          },
        },
        {
          onSettled: () => {
            qc.setQueryData(
              ["waAutomatedReply", { waAutomatedReplyId: waAutomationData.id }],
              (oldData: any) => ({
                ...oldData,
                matchData: {
                  ...oldData.matchData,
                  json: flow,
                },
              }),
            );
            setHasUnsavedChanges(false);
          },
        },
      );
    }
  }, [reactFlowInstance, updateWaAutomatedReplyMutation, waAutomationData]);

  const debouncedSaveFlow = useDebouncedCallback(saveFlow, 1000);

  // Save state to history when nodes or edges change
  useEffect(() => {
    if (isUndoRedoOperationRef.current || isInitialLoadRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      historyManager.saveState({ nodes, edges });
      updateUndoRedoState();

      setHasUnsavedChanges(true);

      if (reactFlowInstance) {
        debouncedSaveFlow();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [nodes, edges, historyManager, updateUndoRedoState, reactFlowInstance, debouncedSaveFlow]);

  const handleUndo = useCallback(() => {
    if (!historyManager.canUndo()) {
      return;
    }

    const previousState = historyManager.undo();
    if (previousState) {
      isUndoRedoOperationRef.current = true;
      try {
        setNodes([...previousState.nodes]);
        setEdges([...previousState.edges]);
        updateUndoRedoState();

        setTimeout(() => {
          isUndoRedoOperationRef.current = false;
        }, 600);
      } catch {
        isUndoRedoOperationRef.current = false;
      }
    }
  }, [historyManager, setNodes, setEdges, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (!historyManager.canRedo()) {
      return;
    }

    const nextState = historyManager.redo();
    if (nextState) {
      isUndoRedoOperationRef.current = true;
      try {
        setNodes([...nextState.nodes]);
        setEdges([...nextState.edges]);
        updateUndoRedoState();

        setTimeout(() => {
          isUndoRedoOperationRef.current = false;
        }, 600);
      } catch {
        isUndoRedoOperationRef.current = false;
      }
    }
  }, [historyManager, setNodes, setEdges, updateUndoRedoState]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as any);
    setIsEditorOpen(true);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: "custom" }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      const nodeData = JSON.parse(event.dataTransfer.getData("application/nodeData") || "{}");

      if (typeof type === "undefined" || !type) {
        return;
      }

      // Check if we already have a start or end node
      if (type === "startNode") {
        nodeData.startMessage = waAutomationData?.commands?.join(", ");
        const existingStartNode = reactFlowInstance
          .getNodes()
          .find((n: Node) => n.type === "startNode");
        if (existingStartNode) {
          toast.error("Only one start node is allowed in the flow.");
          return;
        }
      }
      if (type === "assignNode") {
        if (!nodeData?.assign) {
          nodeData.assign = {
            assignedUserIds: [session.userId],
            assignType: "me",
          };
        }
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          ...nodeData,
          label: nodeData.label ?? getNodeLabel(type),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, waAutomationData?.commands],
  );

  // Update node data when edited
  const handleNodeDataChange = useCallback(
    (nodeId: string, newData: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...newData,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  const handleAutoLayout = useCallback(
    (direction = "TB") => {
      if (!nodes.length) return;

      const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]);

      // Center the view after layout
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.2 });
        }
      }, 50);
    },
    [nodes, edges, setNodes, reactFlowInstance],
  );

  const validateFlow = useCallback(
    (silent: boolean = false) => {
      if (!reactFlowInstance) return false;

      const allNodes = reactFlowInstance.getNodes();
      const allEdges = reactFlowInstance.getEdges();

      // Check if there are any nodes
      if (allNodes.length === 0) {
        if (!silent) toast.error("Flow is empty. Please add some nodes.");
        return false;
      }

      const startNodes = allNodes.filter((node: Node) => node.type === "startNode");
      const leadgenNodes = allNodes.filter((node: Node) => node.type === "leadgenNode");
      if (isLeadAutomation) {
        if (leadgenNodes.length > 1) {
          if (!silent) toast.error("Only one Lead node is allowed");
          return false;
        }
        if (allNodes[0].type !== "leadgenNode") {
          if (!silent) toast.error("First node should be a Lead Node.");
          return false;
        }
      }

      if (!isLeadAutomation) {
        if (startNodes.length === 0) {
          if (!silent) toast.error("Flow must have a start node.");
          return false;
        } else if (startNodes.length > 1) {
          if (!silent) toast.error("Flow must have exactly one start node.");
          return false;
        }
        if (leadgenNodes.length) {
          if (!silent) toast.error("Lead node is only allowed lead automation");
          return false;
        }
      }

      // Check if all nodes (except start) have incoming connections
      const nodesWithIncomingEdges = new Set(allEdges.map((edge: any) => edge.target));

      const nodesWithoutIncoming = allNodes.filter(
        (node: Node) =>
          node.type !== "startNode" &&
          node.type !== "leadgenNode" &&
          !nodesWithIncomingEdges.has(node.id),
      );

      if (nodesWithoutIncoming.length > 0) {
        if (!silent) {
          toast.error(
            `Some nodes are not connected: ${nodesWithoutIncoming.map((n: Node) => n.data.label).join(", ")}`,
          );
        }
        return false;
      }

      // Validate required fields for all nodes
      for (const node of allNodes) {
        const validationResult = validateNodeData(node as TypedNode);
        if (!validationResult.valid) {
          if (!silent) toast.error(validationResult.message);
          return false;
        }
      }

      if (!silent) toast.success("Flow validation successful!");
      return true;
    },
    [reactFlowInstance],
  );

  // Load flow from JSON

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setSelectedNode(null);
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Check if there's a removal change for the currently selected node
      const isSelectedNodeRemoved = changes.some(
        (change: NodeChange) => change.type === "remove" && change.id === selectedNode?.id,
      );

      if (isSelectedNodeRemoved) {
        closeEditor();
      }

      onNodesChange(changes);
    },
    [selectedNode, closeEditor, onNodesChange],
  );

  // Load saved flow on initial render
  useEffect(() => {
    const flow = waAutomationData?.matchData?.json;
    if (flow) {
      try {
        if (flow.nodes && flow.edges) {
          isInitialLoadRef.current = true;

          // Normalise saved edges so every arrow/marker uses the primary colour,
          // regardless of any per-edge colour baked into older flows.
          const normalizedEdges = flow.edges.map((edge: any) => ({
            ...edge,
            type: "custom",
            style: defaultEdgeOptions.style,
            markerEnd: defaultEdgeOptions.markerEnd,
          }));

          setNodes(flow.nodes);
          setEdges(normalizedEdges);

          // Store initial flow JSON to prevent unnecessary saves
          lastSavedFlowRef.current = JSON.stringify(flow);
          setHasUnsavedChanges(false);

          // Initialize history with loaded flow
          historyManager.clear();
          historyManager.saveState({ nodes: flow.nodes, edges: normalizedEdges });
          updateUndoRedoState();

          setTimeout(() => {
            isInitialLoadRef.current = false;
          }, 100);
        }
      } catch (error) {
        console.error("Error loading saved flow:", error);
        isInitialLoadRef.current = false;
      }
    } else {
      isInitialLoadRef.current = false;
    }
  }, [historyManager, setEdges, setNodes, updateUndoRedoState, waAutomationData?.matchData?.json]);

  useHotkeys([
    ["mod+z", () => handleUndo()],
    ["shift+mod+z", () => handleRedo()],
    ["mod+y", () => handleRedo()],
  ]);

  return (
    <div className="relative flex h-full w-full bg-background">
      <div
        className="relative h-full grow bg-ink-100 dark:bg-background"
        ref={reactFlowWrapper}
        style={{
          backgroundImage:
            "radial-gradient(80% 55% at 50% 0%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 70%)",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          connectionLineType={ConnectionLineType.Bezier}
          connectionLineStyle={{
            stroke: "var(--primary)",
            strokeWidth: 2,
            strokeDasharray: "6 6",
          }}
          defaultEdgeOptions={defaultEdgeOptions}
          edgeTypes={{ custom: CustomEdge }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--flow-dots)" />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(n) => getNodeVisual((n.data?.type as string) || n.type).color}
            maskColor="color-mix(in srgb, var(--muted) 60%, transparent)"
            zoomable
            pannable
          />
          <Panel position="top-center" className="z-10">
            <Toolbar
              onSave={saveFlow}
              onAutoLayout={handleAutoLayout}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onOpenSettings={onOpenSettings}
              validateFlow={validateFlow}
              saveDisabled={!hasUnsavedChanges}
              refetch={refetch}
              isPending={updateWaAutomatedReplyMutation.isPending}
            />
          </Panel>
          <Panel position="top-right">
            <PhonePreviewButton
              platform={waAutomationData.platform === "instagram" ? "instagram" : "whatsapp"}
              label="Preview"
            >
              <FlowbotPreviewPlayground
                nodes={nodes as unknown as TypedNode[]}
                edges={edges}
                platform={waAutomationData.platform === "instagram" ? "instagram" : "whatsapp"}
              />
            </PhonePreviewButton>
          </Panel>
        </ReactFlow>
      </div>
      {isEditorOpen && selectedNode ? (
        <NodeEditor
          key={selectedNode.id}
          node={selectedNode}
          onChange={handleNodeDataChange}
          onClose={closeEditor}
        />
      ) : (
        <ComponentSidebar platform={waAutomationData.platform || "whatsapp"} />
      )}
    </div>
  );
}

// Wrapper component that provides the ReactFlowProvider
export default function FlowEditor({
  data,
  refetch,
  onOpenSettings,
}: Readonly<{
  data: WaAutomatedReply;
  refetch: () => void;
  onOpenSettings?: () => void;
}>) {
  return (
    <ReactFlowProvider>
      <FlowEditorContent
        waAutomationData={data}
        refetch={refetch}
        onOpenSettings={onOpenSettings}
      />
    </ReactFlowProvider>
  );
}
