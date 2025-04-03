"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

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

import "@xyflow/react/dist/style.css";

import { useRouter } from "next/router";

import { notifications } from "@mantine/notifications";

import {
  useUpdateWaAutomatedReplyMutation,
  useWaAutomatedReplyById,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import RateupLoader from "@/components/Loaders/RateupLoader";

import { TypedNode, validateNodeData } from "../types/node-types";
import { getLayoutedElements } from "../utils/auto-layout";
import { HistoryManager } from "../utils/history";
import ComponentSidebar from "./component-sidebar";
import CustomEdge from "./CustomEdge";
import styles from "./flow-editor.module.css";
import { initialEdges, initialNodes } from "./initial-data";
import NodeEditor from "./node-editor";
import { nodeTypes } from "./nodes";
import Toolbar from "./toolbar";

// This component is wrapped with ReactFlowProvider in the parent component
function FlowEditorContent({
  waAutomatedReplyId,
  waAutomationData,
}: {
  waAutomatedReplyId: string;
  waAutomationData: any;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<TypedNode | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const router = useRouter();
  // Add a flag to track undo/redo operations
  const isUndoRedoOperationRef = useRef(false);

  const updateWaAutomatedReplyMutation =
    useUpdateWaAutomatedReplyMutation(waAutomatedReplyId);

  // Initialize history manager
  const historyManagerRef = useRef(new HistoryManager());
  const historyManager = historyManagerRef.current;

  // Save initial state
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      historyManager.saveState({ nodes, edges });
      updateUndoRedoState();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update undo/redo button states
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyManager.canUndo());
    setCanRedo(historyManager.canRedo());
  }, [historyManager]);

  // Save state to history when nodes or edges change
  useEffect(() => {
    // Skip saving state if an undo/redo operation is in progress
    if (isUndoRedoOperationRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      historyManager.saveState({ nodes, edges });
      updateUndoRedoState();
    }, 500); // Debounce to avoid saving too many states

    return () => clearTimeout(timer);
  }, [nodes, edges, historyManager, updateUndoRedoState]);

  // Handle undo action
  const handleUndo = useCallback(() => {
    const previousState = historyManager.undo();
    if (previousState) {
      // Set the flag before changing state
      isUndoRedoOperationRef.current = true;

      setNodes([...previousState.nodes]);
      setEdges([...previousState.edges]);
      updateUndoRedoState();

      // Reset the flag after a delay
      setTimeout(() => {
        isUndoRedoOperationRef.current = false;
      }, 600);
    }
  }, [historyManager, setNodes, setEdges, updateUndoRedoState]);

  // Handle redo action
  const handleRedo = useCallback(() => {
    const nextState = historyManager.redo();
    if (nextState) {
      // Set the flag before changing state
      isUndoRedoOperationRef.current = true;

      setNodes([...nextState.nodes]);
      setEdges([...nextState.edges]);
      updateUndoRedoState();

      // Reset the flag after a delay
      setTimeout(() => {
        isUndoRedoOperationRef.current = false;
      }, 600);
    }
  }, [historyManager, setNodes, setEdges, updateUndoRedoState]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as any);
    setIsEditorOpen(true);
  }, []);

  // Handle connection between nodes
  const onConnect = (params) =>
    setEdges((eds) => addEdge({ ...params, type: "custom" }, eds));

  // Handle drag over for dropping components
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop for creating new nodes
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      let nodeData = JSON.parse(
        event.dataTransfer.getData("application/nodeData") || "{}",
      );

      // Check if the dropped element is valid
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
          notifications.show({
            title: "Not Allowed",
            message: "Only one start node is allowed in the flow.",
            color: "red",
          });
          return;
        }
      }

      if (type === "endNode") {
        const existingEndNode = reactFlowInstance
          .getNodes()
          .find((n: Node) => n.type === "endNode");
        if (existingEndNode) {
          notifications.show({
            title: "Not Allowed",
            message: "Only one end node is allowed in the flow.",
            color: "red",
          });
          return;
        }
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create a new node with default data based on type
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          ...nodeData,
          label: nodeData.label || `New ${type}`,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
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

  // Apply auto layout to the flow
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
      router.push(`${waAutomatedReplyId}?tab=${tab}`);
    },
    [router, waAutomatedReplyId],
  );

  // Validate flow connections
  const validateFlow = useCallback(
    (silent: boolean = false) => {
      if (!reactFlowInstance) return false;

      const allNodes = reactFlowInstance.getNodes();
      const allEdges = reactFlowInstance.getEdges();

      // Check if there are any nodes
      if (allNodes.length === 0) {
        !silent &&
          notifications.show({
            title: "Validation Error",
            message: "Flow is empty. Please add some nodes.",
            color: "red",
          });
        return false;
      }

      // Check for exactly one start node
      const startNodes = allNodes.filter(
        (node: Node) => node.type === "startNode",
      );
      if (startNodes.length === 0) {
        !silent &&
          notifications.show({
            title: "Validation Error",
            message: "Flow must have a start node.",
            color: "red",
          });
        return false;
      } else if (startNodes.length > 1) {
        !silent &&
          notifications.show({
            title: "Validation Error",
            message: "Flow must have exactly one start node.",
            color: "red",
          });
        return false;
      }

      // Check for exactly one end node
      const endNodes = allNodes.filter((node: Node) => node.type === "endNode");
      if (endNodes.length === 0) {
        !silent &&
          notifications.show({
            title: "Validation Error",
            message: "Flow must have an end node.",
            color: "red",
          });
        return false;
      } else if (endNodes.length > 1) {
        !silent &&
          notifications.show({
            title: "Validation Error",
            message: "Flow must have exactly one end node.",
            color: "red",
          });
        return false;
      }

      // Check if all nodes (except start) have incoming connections
      const nodesWithIncomingEdges = new Set(
        allEdges.map((edge: any) => edge.target),
      );
      const nodesWithoutIncoming = allNodes.filter(
        (node: Node) =>
          node.type !== "startNode" && !nodesWithIncomingEdges.has(node.id),
      );

      if (nodesWithoutIncoming.length > 0) {
        !silent &&
          notifications.show({
            title: "Validation Error",
            message: `Some nodes are not connected: ${nodesWithoutIncoming.map((n: Node) => n.data.label).join(", ")}`,
            color: "red",
          });
        return false;
      }

      // Check if end node has incoming connections
      if (!nodesWithIncomingEdges.has(endNodes[0].id)) {
        !silent &&
          notifications.show({
            title: "Validation Error",
            message: "End node must be connected to at least one node.",
            color: "red",
          });
        return false;
      }

      // Validate required fields for all nodes
      for (const node of allNodes) {
        const validationResult = validateNodeData(node as TypedNode);
        if (!validationResult.valid) {
          !silent &&
            notifications.show({
              title: "Validation Error",
              message: validationResult.message,
              color: "red",
            });
          return false;
        }
      }

      !silent &&
        notifications.show({
          title: "Success",
          message: "Flow validation successful!",
          color: "green",
        });
      return true;
    },
    [reactFlowInstance],
  );
  // Save flow to JSON
  const saveFlow = useCallback(() => {
    if (!reactFlowInstance) return;

    // Validate before saving
    if (!validateFlow(false)) {
      return;
    }

    const flow = reactFlowInstance.toObject();

    updateWaAutomatedReplyMutation.mutate({
      ...waAutomationData,
      matchData: {
        ...waAutomationData.matchData,
        json: flow,
      },
    });
  }, [
    reactFlowInstance,
    updateWaAutomatedReplyMutation,
    validateFlow,
    waAutomationData,
  ]);

  // Load flow from JSON
  const loadFlow = useCallback(() => {
    const savedFlow = localStorage.getItem("whatsapp-flow");
    if (savedFlow) {
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

      notifications.show({
        title: "Success",
        message: "Flow loaded successfully!",
        color: "green",
      });
    }
  }, [
    setNodes,
    setEdges,
    reactFlowInstance,
    historyManager,
    updateUndoRedoState,
  ]);

  // Export flow data
  const exportFlow = useCallback(() => {
    if (!reactFlowInstance) return;

    // Validate before exporting
    if (!validateFlow(true)) {
      return;
    }

    const flow = reactFlowInstance.toObject();

    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(flow);

    const exportFileDefaultName = "whatsapp-api-format.json";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }, [reactFlowInstance]);

  // Close the node editor
  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setSelectedNode(null);
  }, []);

  // Load saved flow on initial render
  useEffect(() => {
    const flow = waAutomationData?.matchData?.json;
    if (flow) {
      try {
        if (flow.nodes && flow.edges) {
          setNodes(flow.nodes);
          setEdges(flow.edges);

          // Initialize history with loaded flow
          historyManager.clear();
          historyManager.saveState({ nodes: flow.nodes, edges: flow.edges });
          updateUndoRedoState();
        }
      } catch (error) {
        console.error("Error loading saved flow:", error);
      }
    }
  }, [
    historyManager,
    setEdges,
    setNodes,
    updateUndoRedoState,
    waAutomationData?.matchData?.json,
  ]);

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl/Cmd + Z is pressed (Undo)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        handleUndo();
      }

      // Check if Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y is pressed (Redo)
      if (
        ((event.ctrlKey || event.metaKey) &&
          event.key === "z" &&
          event.shiftKey) ||
        ((event.ctrlKey || event.metaKey) && event.key === "y")
      ) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  return (
    <div className={styles.flowEditorContainer}>
      <div className={styles.flowWrapper} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
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
          defaultEdgeOptions={{
            style: { stroke: "#6366f1", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#6366f1",
            },
          }}
          edgeTypes={{ custom: CustomEdge }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{
              height: 120,
              width: 200,
            }}
          />
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
            />
          </Panel>
        </ReactFlow>
      </div>
      <ComponentSidebar />
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
  waAutomatedReplyId,
  data,
}: {
  waAutomatedReplyId: string;
  data: any;
}) {
  return (
    <ReactFlowProvider>
      <FlowEditorContent
        waAutomatedReplyId={waAutomatedReplyId}
        waAutomationData={data}
      />
    </ReactFlowProvider>
  );
}
