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

export const leadAutomationinitialNodes: Node[] = [
  {
    id: "leadgen-1",
    type: "leadgenNode",
    position: { x: 250, y: 50 },
    data: {
      label: "Lead",
      fbPageId: "",
      adAccountId: "",
      ad: {
        id: "",
        name: "",
      },
      phone: "",
      phoneField: "",
      leadgenFormId: "",
      pageAccessToken: "",
    },
  },
];

// Initial edges for the flow
export const initialEdges: Edge[] = [];
