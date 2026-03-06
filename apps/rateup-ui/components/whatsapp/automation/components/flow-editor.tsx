"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useDebouncedCallback, useHotkeys } from "@mantine/hooks";
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
  type Node,
} from "@xyflow/react";
import { toast } from "sonner";
import { useSessionContext } from "supertokens-auth-react/recipe/session";

import { WaAutomatedReply } from "@/types/global";
import { useUpdateWaAutomatedReplyMutation } from "@/backend/whatsapp/automated-reply/automatedReply.query";

import { TypedNode, validateNodeData } from "../types/node-types";
import { getLayoutedElements } from "../utils/auto-layout";
import { HistoryManager } from "../utils/history";
import ComponentSidebar from "./component-sidebar";
import CustomEdge from "./CustomEdge";
import styles from "./flow-editor.module.css";
import {
  initialEdges,
  initialNodes,
  leadAutomationinitialNodes,
} from "./initial-data";
import NodeEditor from "./node-editor";
import { nodeTypes } from "./nodes";
import Toolbar from "./toolbar";

const defaultEdgeOptions = {
  style: { stroke: "#6366f1", strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#6366f1",
  },
};

// This component is wrapped with ReactFlowProvider in the parent component
function FlowEditorContent({
  flowbotId,
  waAutomationData,
  refetch,
}: {
  readonly flowbotId: string;
  readonly waAutomationData: WaAutomatedReply;
  readonly refetch: () => void;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const isLeadAutomation = waAutomationData?.commands[0]?.startsWith("lead");
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
  const router = useRouter();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateUndoRedoState = useCallback(() => {
    if (isMountedRef.current) {
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [
    nodes,
    edges,
    historyManager,
    updateUndoRedoState,
    reactFlowInstance,
    debouncedSaveFlow,
  ]);

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
      } catch (error) {
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
      } catch (error) {
        isUndoRedoOperationRef.current = false;
      }
    }
  }, [historyManager, setNodes, setEdges, updateUndoRedoState]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as any);
    setIsEditorOpen(true);
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: "custom" }, eds)),
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
      let nodeData = JSON.parse(
        event.dataTransfer.getData("application/nodeData") || "{}",
      );

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
          label: nodeData.label ?? `New ${type}`,
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

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

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

  const handleTabSwitch = useCallback(
    (tab: string) => {
      router.push(`${flowbotId}?tab=${tab}`);
    },
    [router, flowbotId],
  );

  const validateFlow = useCallback(
    (silent: boolean = false) => {
      if (!reactFlowInstance) return false;

      const allNodes = reactFlowInstance.getNodes();
      const allEdges = reactFlowInstance.getEdges();

      // Check if there are any nodes
      if (allNodes.length === 0) {
        !silent && toast.error("Flow is empty. Please add some nodes.");
        return false;
      }

      const startNodes = allNodes.filter(
        (node: Node) => node.type === "startNode",
      );
      const leadgenNodes = allNodes.filter(
        (node: Node) => node.type === "leadgenNode",
      );
      if (isLeadAutomation) {
        if (leadgenNodes.length > 1) {
          !silent && toast.error("Only one Lead node is allowed");
          return false;
        }
        if (allNodes[0].type !== "leadgenNode") {
          !silent && toast.error("First node should be a Lead Node.");
          return false;
        }
      }

      if (!isLeadAutomation) {
        if (startNodes.length === 0) {
          !silent && toast.error("Flow must have a start node.");
          return false;
        } else if (startNodes.length > 1) {
          !silent && toast.error("Flow must have exactly one start node.");
          return false;
        }
        if (leadgenNodes.length) {
          !silent && toast.error("Lead node is only allowed lead automation");
          return false;
        }
      }

      // Check if all nodes (except start) have incoming connections
      const nodesWithIncomingEdges = new Set(
        allEdges.map((edge: any) => edge.target),
      );

      const nodesWithoutIncoming = allNodes.filter(
        (node: Node) =>
          node.type !== "startNode" &&
          node.type !== "leadgenNode" &&
          !nodesWithIncomingEdges.has(node.id),
      );

      if (nodesWithoutIncoming.length > 0) {
        !silent &&
          toast.error(
            `Some nodes are not connected: ${nodesWithoutIncoming.map((n: Node) => n.data.label).join(", ")}`,
          );
        return false;
      }

      // Validate required fields for all nodes
      for (const node of allNodes) {
        const validationResult = validateNodeData(node as TypedNode);
        if (!validationResult.valid) {
          !silent && toast.error(validationResult.message);
          return false;
        }
      }

      !silent && toast.success("Flow validation successful!");
      return true;
    },
    [reactFlowInstance],
  );

  // Load flow from JSON
  const loadFlow = useCallback(() => {
    // TODO: Implement a file upload dialog to load flow from a JSON file
    const savedFlow = localStorage.getItem("whatsapp-flow");
    if (savedFlow) {
      try {
        const flow = JSON.parse(savedFlow);
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);

        // Fit the view to show all nodes
        setTimeout(() => {
          if (reactFlowInstance) {
            reactFlowInstance.fitView({ padding: 0.2 });
          }
        }, 50);

        // Reset history with the loaded flow
        historyManager.clear();
        historyManager.saveState({
          nodes: flow.nodes || [],
          edges: flow.edges || [],
        });
        updateUndoRedoState();

        toast.success("Flow loaded successfully!");
      } catch (error) {
        toast.error("Failed to load flow. The saved data might be corrupted.");
      }
    }
  }, [
    setNodes,
    setEdges,
    reactFlowInstance,
    historyManager,
    updateUndoRedoState,
  ]);

  const exportFlow = useCallback(() => {
    if (!reactFlowInstance) return;

    if (!validateFlow(true)) {
      return;
    }

    const flow = reactFlowInstance.toObject();
    const dataUri =
      "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(flow));
    const exportFileDefaultName = "whatsapp-api-format.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }, [reactFlowInstance, validateFlow]);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setSelectedNode(null);
  }, []);

  const handleNodesChange = useCallback(
    (changes) => {
      // Check if there's a removal change for the currently selected node
      const isSelectedNodeRemoved = changes.some(
        (change) => change.type === "remove" && change.id === selectedNode?.id,
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

          setNodes(flow.nodes);
          setEdges(flow.edges);

          // Store initial flow JSON to prevent unnecessary saves
          lastSavedFlowRef.current = JSON.stringify(flow);
          setHasUnsavedChanges(false);

          // Initialize history with loaded flow
          historyManager.clear();
          historyManager.saveState({ nodes: flow.nodes, edges: flow.edges });
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
  }, [
    historyManager,
    setEdges,
    setNodes,
    updateUndoRedoState,
    waAutomationData?.matchData?.json,
  ]);

  useHotkeys([
    ["mod+z", () => handleUndo()],
    ["shift+mod+z", () => handleRedo()],
    ["mod+y", () => handleRedo()],
  ]);

  return (
    <div className={styles.flowEditorContainer}>
      <div className={styles.flowWrapper} ref={reactFlowWrapper}>
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
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={defaultEdgeOptions}
          edgeTypes={{ custom: CustomEdge }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Panel position="top-center" className={styles.toolbar}>
            <Toolbar
              onSave={saveFlow}
              onLoad={loadFlow}
              onExport={exportFlow}
              onAutoLayout={handleAutoLayout}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              handleTabSwitch={handleTabSwitch}
              validateFlow={validateFlow}
              saveDisabled={!hasUnsavedChanges}
              refetch={refetch}
              isPending={updateWaAutomatedReplyMutation.isPending}
            />
          </Panel>
        </ReactFlow>
      </div>
      <ComponentSidebar platform={waAutomationData.platform || "whatsapp"} />
      {isEditorOpen && selectedNode && (
        <NodeEditor
          node={selectedNode}
          onChange={handleNodeDataChange}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

// Wrapper component that provides the ReactFlowProvider
export default function FlowEditor({
  flowbotId,
  data,
  refetch,
}: Readonly<{
  flowbotId: string;
  data: WaAutomatedReply;
  refetch: () => void;
}>) {
  return (
    <ReactFlowProvider>
      <FlowEditorContent
        flowbotId={flowbotId}
        waAutomationData={data}
        refetch={refetch}
      />
    </ReactFlowProvider>
  );
}
