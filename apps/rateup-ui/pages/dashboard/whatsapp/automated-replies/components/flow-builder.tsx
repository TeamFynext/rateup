"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";

import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import styles from "./flow-builder.module.css";
import Navbar from "./navbar";
import GroupNode from "./nodes/group-node";
import StartNode from "./nodes/start-node";
import Sidebar from "./sidebar";

// Define custom node types
const nodeTypes: NodeTypes = {
  start: StartNode,
  group: GroupNode,
};

// Initial nodes setup
const initialNodes: Node[] = [
  {
    id: "1",
    type: "start",
    position: { x: 100, y: 100 },
    data: { label: "Start" },
  },
];

// Initial edges setup
const initialEdges: Edge[] = [];

export default function FlowBuilder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Enhanced connection function that creates animated edges
  const onConnect = useCallback(
    (params: Connection) => {
      // Create an edge with animation and custom styling
      const newEdge = {
        ...params,
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#6366f1",
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      const nodeData = JSON.parse(
        event.dataTransfer.getData("application/nodeData") || "{}",
      );

      // Check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { ...nodeData },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  return (
    <div className={styles.flowBuilderContainer}>
      <Navbar />
      <div className={styles.flowContent}>
        <ReactFlowProvider>
          <div className={styles.reactFlowWrapper} ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              connectionLineType={ConnectionLineType.SmoothStep}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: "#6366f1", strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: "#6366f1",
                },
              }}
            >
              <Controls />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          </div>
          <Sidebar />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
