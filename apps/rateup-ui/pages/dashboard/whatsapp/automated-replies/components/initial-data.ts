import type { Edge, Node } from "@xyflow/react";

// Initial nodes for the flow
export const initialNodes: Node[] = [
  {
    id: "start-1",
    type: "startNode",
    position: { x: 250, y: 50 },
    data: {
      label: "Start",
      startMessage: "Welcome to the WhatsApp automation flow!",
    },
  },
];

// Initial edges for the flow
export const initialEdges: Edge[] = [];
