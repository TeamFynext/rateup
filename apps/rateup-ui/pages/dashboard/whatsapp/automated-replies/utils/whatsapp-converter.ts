import type { Edge } from "@xyflow/react";

import {
  ButtonOption,
  ListItem,
  NodeType,
  NodeTypeMap,
  TypedNode,
} from "../types/node-types";

interface FlowData {
  nodes: TypedNode[];
  edges: Edge[];
}

interface WhatsAppMessage {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  [key: string]: any;
}

export function convertFlowToWhatsAppFormat(flow: FlowData): WhatsAppMessage[] {
  const { nodes, edges } = flow;
  const messages: WhatsAppMessage[] = [];

  // Find the start node
  const startNode = nodes.find((node) => node.type === "startNode");
  if (!startNode) return messages;

  // Get recipient from start node with proper typing
  const recipient = startNode.data.recipient || "+16505551234"; // Default if not set

  // Process nodes connected to the start node
  processConnectedNodes(startNode.id, nodes, edges, messages, recipient);

  return messages;
}

function processConnectedNodes(
  currentNodeId: string,
  nodes: TypedNode[],
  edges: Edge[],
  messages: WhatsAppMessage[],
  recipient: string,
) {
  // Find all edges that start from the current node
  const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);

  // For each outgoing edge, process the target node
  for (const edge of outgoingEdges) {
    const targetNode = nodes.find((node) => node.id === edge.target);
    if (!targetNode) continue;

    // Convert the node to a WhatsApp message
    const message = convertNodeToWhatsAppMessage(targetNode, recipient);
    if (message) {
      messages.push(message);
    }

    // Recursively process nodes connected to this node
    processConnectedNodes(targetNode.id, nodes, edges, messages, recipient);
  }
}

function convertNodeToWhatsAppMessage(
  node: TypedNode,
  recipient: string,
): WhatsAppMessage | null {
  const baseMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
  };

  // Use type assertion with the node type
  const nodeType = node.type as NodeType;

  switch (nodeType) {
    case "textNode": {
      const data = node.data as NodeTypeMap["textNode"];
      return {
        ...baseMessage,
        type: "text",
        text: {
          preview_url: data.previewUrl || false,
          body: data.body || "Default message",
        },
      };
    }

    case "imageNode": {
      const data = node.data as NodeTypeMap["imageNode"];
      return {
        ...baseMessage,
        type: "image",
        image: {
          link: data.imageUrl || "",
          caption: data.caption || "",
        },
      };
    }

    case "videoNode": {
      const data = node.data as NodeTypeMap["videoNode"];
      return {
        ...baseMessage,
        type: "video",
        video: {
          link: data.mediaUrl || "",
          caption: data.caption || "",
        },
      };
    }

    case "audioNode": {
      const data = node.data as NodeTypeMap["audioNode"];
      return {
        ...baseMessage,
        type: "audio",
        audio: {
          link: data.mediaUrl || "",
        },
      };
    }

    case "documentNode": {
      const data = node.data as NodeTypeMap["documentNode"];
      return {
        ...baseMessage,
        type: "document",
        document: {
          link: data.documentUrl || "",
          filename: data.filename || "document.pdf",
        },
      };
    }

    case "stickerNode": {
      const data = node.data as NodeTypeMap["stickerNode"];
      return {
        ...baseMessage,
        type: "sticker",
        sticker: {
          id: data.stickerId || "",
        },
      };
    }

    case "locationNode": {
      const data = node.data as NodeTypeMap["locationNode"];
      return {
        ...baseMessage,
        type: "location",
        location: {
          latitude: data.latitude || "0",
          longitude: data.longitude || "0",
          name: data.name || "",
          address: data.address || "",
        },
      };
    }

    case "buttonNode": {
      const data = node.data as NodeTypeMap["buttonNode"];
      return {
        ...baseMessage,
        type: "interactive",
        interactive: {
          type: "button",
          header: data.header
            ? {
                type: "text",
                text: data.header,
              }
            : undefined,
          body: {
            text: data.body || "Default message",
          },
          footer: data.footer
            ? {
                text: data.footer,
              }
            : undefined,
          action: {
            buttons: (data.buttons || []).map(
              (button: ButtonOption, index: number) => ({
                type: "reply",
                reply: {
                  id: button.id || `button-${index}`,
                  title: button.title || `Button ${index + 1}`,
                },
              }),
            ),
          },
        },
      };
    }

    case "listNode": {
      const data = node.data as NodeTypeMap["listNode"];
      return {
        ...baseMessage,
        type: "interactive",
        interactive: {
          type: "list",
          header: data.header
            ? {
                type: "text",
                text: data.header,
              }
            : undefined,
          body: {
            text: data.body || "Default message",
          },
          footer: data.footer
            ? {
                text: data.footer,
              }
            : undefined,
          action: {
            button: data.buttonText || "Select an option",
            sections: [
              {
                title: "Options",
                rows: (data.items || []).map(
                  (item: ListItem, index: number) => ({
                    id: item.id || `item-${index}`,
                    title: item.title || `Item ${index + 1}`,
                    description: item.description || "",
                  }),
                ),
              },
            ],
          },
        },
      };
    }

    case "ctaUrlNode": {
      const data = node.data as NodeTypeMap["ctaUrlNode"];
      return {
        ...baseMessage,
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: {
            text: data.text || "Default message",
          },
          action: {
            name: "cta_url",
            parameters: {
              display_text: data.urlText || "Visit Link",
              url: data.url || "https://example.com",
            },
          },
        },
      };
    }

    case "templateNode": {
      const data = node.data as NodeTypeMap["templateNode"];
      return {
        ...baseMessage,
        type: "template",
        template: {
          name: data.templateName || "",
          language: {
            code: data.language || "en_US",
          },
          components: data.components || [],
        },
      };
    }

    case "reactionNode": {
      const data = node.data as NodeTypeMap["reactionNode"];
      return {
        ...baseMessage,
        type: "reaction",
        reaction: {
          message_id: data.messageId || "",
          emoji: data.emoji || "👍",
        },
      };
    }

    case "addressNode": {
      const data = node.data as NodeTypeMap["addressNode"];
      return {
        ...baseMessage,
        type: "location",
        location: {
          name: data.name || "",
          address: `${data.street || ""}, ${data.city || ""}, ${data.state || ""} ${data.zip || ""}, ${data.country || ""}`,
        },
      };
    }

    case "contactsNode": {
      const data = node.data as NodeTypeMap["contactsNode"];
      return {
        ...baseMessage,
        type: "contacts",
        contacts: Array(data.contactCount || 1).fill({
          name: {
            formatted_name: "Contact Name",
            first_name: "Contact",
            last_name: "Name",
          },
          phones: [
            {
              phone: "+1234567890",
              type: "CELL",
            },
          ],
        }),
      };
    }

    case "locationRequestNode": {
      const data = node.data as NodeTypeMap["locationRequestNode"];
      return {
        ...baseMessage,
        type: "location_request_message",
        location_request_message: {
          request_text: data.message || "Please share your location",
        },
      };
    }

    case "flowNode": {
      const data = node.data as NodeTypeMap["flowNode"];
      return {
        ...baseMessage,
        type: "flow",
        flow: {
          name: data.flowName || "",
          flow_id: data.flowId || "",
          flow_action: "navigate",
        },
      };
    }

    default:
      return null;
  }
}
