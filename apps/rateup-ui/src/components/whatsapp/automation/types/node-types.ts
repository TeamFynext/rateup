import type { Node } from "@xyflow/react";

import { hasRealContent, safeStrOrNull } from "@/utils/index.ts";

import { CatalogMessages } from "../components/node-editor.tsx";

// Base node data interface with common properties
interface BaseNodeData {
  label: string;
}

// Text Node
export interface TextNodeData extends BaseNodeData {
  body: string;
  previewUrl: boolean;
}

// Quick Reply Node
interface QuickReplyNodeData extends BaseNodeData {
  question: string;
  options: string[];
}

// Image Node
export interface ImageNodeData extends BaseNodeData {
  link: string;
  caption?: string;
}

// Conditional Node
interface ConditionalNodeData extends BaseNodeData {
  condition: string;
}

// Input Nodes (shared structure)
export interface InputNodeData extends BaseNodeData {
  question: string;
  variableName: string;
  validation?: string;
}

export interface PauseNodeData extends BaseNodeData {
  duration: number;
  unit: "seconds" | "minutes" | "hours";
}

// Media Nodes
export interface MediaNodeData extends BaseNodeData {
  link: string;
  caption?: string;
}

// Document Node
export interface DocumentNodeData extends BaseNodeData {
  link: string;
  caption?: string;
  filename?: string;
}

// Start Node
export interface StartNodeData extends BaseNodeData {}

// End Node
export interface EndNodeData extends BaseNodeData {
  endMessage?: string;
}

// Button Node
interface ButtonOption {
  id: string;
  title: string;
}

export interface ButtonNodeData extends BaseNodeData {
  body: string;
  header?: string;
  headerType?: string;
  footer?: string;
  buttons: ButtonOption[];
  caption?: string;
  filename?: string;
  link?: string;
}

// List Node
interface ListItem {
  id: string;
  title: string;
  description?: string;
}

export interface ListNodeData extends BaseNodeData {
  header?: string;
  body?: string;
  footer?: string;
  button?: string;
  sections?: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

// Sticker Node
interface StickerNodeData extends BaseNodeData {
  stickerId: string;
}

// CTA URL Node
export interface CTAUrlNodeData extends BaseNodeData {
  headerType?: string;
  header?: string;
  body: string;
  footer?: string;
  display_text: string;
  url: string;
  caption?: string;
  filename?: string;
  link?: string;
}

// Template Node
export interface TemplateNodeData extends BaseNodeData {
  template: {
    id: string;
    name?: string;
  };
  teamId?: string;
  parameters?: any[];
}

// Reaction Node
interface ReactionNodeData extends BaseNodeData {
  emoji: string;
  messageId: string;
}

// Location Node
export interface LocationNodeData extends BaseNodeData {
  name?: string;
  latitude: string;
  longitude: string;
  address?: string;
}

// Location Request Node
interface LocationRequestNodeData extends BaseNodeData {
  message: string;
}

// Address Node
interface AddressNodeData extends BaseNodeData {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// Contacts Node
export interface ContactsNodeData extends BaseNodeData {
  contacts: Array<{
    name?: {
      formatted_name: string;
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      prefix?: string;
      suffix?: string;
    };
    org?: {
      company?: string;
      department?: string;
      title?: string;
    };
    birthday?: string;
    phones?: Array<{
      phone: string;
      type: "CELL" | "WORK" | "HOME" | "MAIN";
      wa_id?: string;
    }>;
    emails?: Array<{
      email: string;
      type: "WORK" | "HOME" | "OTHER";
    }>;
    addresses?: Array<{
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      country_code?: string;
      type: "HOME" | "WORK" | "OTHER";
    }>;
    urls?: Array<{
      url: string;
      type: "WORK" | "HOME" | "PROFILE" | "OTHER";
    }>;
  }>;
}

// Flow Node
export interface FlowNodeData extends BaseNodeData {
  teamId: string;
  flow: {
    id: string;
    name: string;
  };
}
// /////////////////////aibot node
export interface AiBotNodeData extends BaseNodeData {
  body: string;
  chatbot: {
    id: string;
    name: string;
  };
}

export interface AssignNodeData extends BaseNodeData {
  assign: {
    choice: "manual" | "all";
    assignType: "staff" | "me";
    assignedUserIds: Array<string>;
    teamId: string;
    teamName?: string; // Optional team name for display purposes
    roundRobin: boolean;
    assignIfOnline: boolean;
  };
}

export interface TicketNodeData extends BaseNodeData {
  ticket: {
    selectedBoardId: string;
    selectedBoardName: string;
    selectedBoardColumnId: string;
    selectedBoardColumnName: string;
  };
}

export interface LeadgenNodeData extends BaseNodeData {
  adAccountId: string;
  ad: {
    id: string;
    name: string;
  };
  phone?: string;
  phoneField?: string;
  fbPageId: string;
  leadgenFormId?: string;
  pageAccessToken: string;
  pageUserAccessToken?: string;
}

export interface CatalogNodeData extends BaseNodeData {
  type: string;
  body: string;
  header?: string;
  thumbnailProductId?: string;
  footer: string;
  productRetailerId?: string;
  sections?: {
    title: string;
    productItems: string[];
  }[];
  catalogId: string;
  whatsappSettingsPhoneId?: string;
  useProductSet?: boolean;
  productSetId?: string;
}

// Instagram-specific node types
export interface InstagramGenericTemplateNodeData extends BaseNodeData {
  elements: Array<{
    title: string;
    subtitle?: string;
    image_url?: string;
    buttons?: Array<{
      type: "web_url" | "postback";
      title: string;
      url?: string;
      payload?: string;
      id?: string;
    }>;
  }>;
}

export interface InstagramQuickReplyNodeData extends BaseNodeData {
  text: string;
  quick_replies: Array<{
    content_type: "text";
    title: string;
    payload?: string;
    id?: string;
  }>;
}

interface InstagramStoryReplyNodeData extends BaseNodeData {
  text: string;
  story_mention?: boolean;
}

interface InstagramProductTemplateNodeData extends BaseNodeData {
  elements: Array<{
    id: string;
  }>;
  whatsappSettingsPhoneId?: string;
}

interface InstagramIceBreakerNodeData extends BaseNodeData {
  iceBreakers: Array<{
    question: string;
    payload?: string;
  }>;
}

export interface WhatsappProductSet {
  productSetId: string;
  catalogId: string;
  name: string;
  orgId: string;
  productIds: string[];
}

// Map of node types to their data types
export type NodeTypeMap = {
  textNode: TextNodeData;
  quickReplyNode: QuickReplyNodeData;
  documentNode: DocumentNodeData;
  imageNode: ImageNodeData;
  conditionalNode: ConditionalNodeData;
  textInputNode: InputNodeData;
  numberInputNode: InputNodeData;
  emailInputNode: InputNodeData;
  phoneInputNode: InputNodeData;
  dateInputNode: InputNodeData;

  pauseNode: PauseNodeData;
  videoNode: MediaNodeData;

  audioNode: MediaNodeData;
  startNode: StartNodeData;
  endNode: EndNodeData;
  buttonNode: ButtonNodeData;
  listNode: ListNodeData;
  stickerNode: StickerNodeData;
  ctaUrlNode: CTAUrlNodeData;
  templateNode: TemplateNodeData;
  reactionNode: ReactionNodeData;
  locationNode: LocationNodeData;
  locationRequestNode: LocationRequestNodeData;
  addressNode: AddressNodeData;
  contactsNode: ContactsNodeData;
  flowNode: FlowNodeData;
  aibotNode: AiBotNodeData;
  ticketNode: TicketNodeData;
  assignNode: AssignNodeData;
  leadgenNode: LeadgenNodeData;
  catalogNode: CatalogNodeData;

  // Instagram nodes
  instagramGenericTemplateNode: InstagramGenericTemplateNodeData;
  instagramQuickReplyNode: InstagramQuickReplyNodeData;
  instagramStoryReplyNode: InstagramStoryReplyNodeData;
  instagramProductTemplateNode: InstagramProductTemplateNodeData;
  instagramIceBreakerNode: InstagramIceBreakerNodeData;
};

// Node type strings as a union type
export type NodeType = keyof NodeTypeMap;

// Union type for all node data types
export type NodeData =
  | TextNodeData
  | QuickReplyNodeData
  | DocumentNodeData
  | ImageNodeData
  | ConditionalNodeData
  | InputNodeData
  | PauseNodeData
  | MediaNodeData
  | StartNodeData
  | EndNodeData
  | ButtonNodeData
  | ListNodeData
  | StickerNodeData
  | CTAUrlNodeData
  | TemplateNodeData
  | ReactionNodeData
  | LocationNodeData
  | LocationRequestNodeData
  | AddressNodeData
  | ContactsNodeData
  | FlowNodeData
  | AiBotNodeData
  | TicketNodeData
  | AssignNodeData
  | LeadgenNodeData
  | CatalogNodeData
  | InstagramGenericTemplateNodeData
  | InstagramQuickReplyNodeData
  | InstagramStoryReplyNodeData
  | InstagramProductTemplateNodeData
  | InstagramIceBreakerNodeData;

// Extended Node type with typed data
export type TypedNode<T extends NodeType = NodeType> = Omit<Node, "data" | "type"> & {
  type: T;
  data: NodeTypeMap[T];
};

// Helper function to check node type and cast data
function assertNodeType<T extends NodeType>(
  node: TypedNode,
  nodeType: T,
): asserts node is TypedNode<T> {
  if (node.type !== nodeType) {
    throw new Error(`Expected node type ${nodeType}, got ${node.type}`);
  }
}

// Simplified helper to safely get typed data from a node
function getTypedNodeData<T extends NodeType>(node: TypedNode, nodeType: T): NodeTypeMap[T] | null {
  return node.type === nodeType ? (node.data as NodeTypeMap[T]) : null;
}

// Helper function for creating default node data by type
function getDefaultNodeData(nodeType: string): NodeData {
  const baseData = { label: `New ${nodeType}` };

  switch (nodeType) {
    case "textNode":
      return { ...baseData, body: "", previewUrl: false };
    case "quickReplyNode":
      return { ...baseData, question: "", options: [] };
    case "imageNode":
      return { ...baseData, link: "", caption: "" };
    case "conditionalNode":
      return { ...baseData, condition: "" };

    case "pauseNode":
      return { ...baseData, duration: 1, unit: "seconds" };
    default:
      return baseData;
  }
}

// Validation functions for node data
export function validateNodeData(node: TypedNode): {
  valid: boolean;
  message: string;
} {
  const nodeType = node.type;

  // Common validation for all nodes
  if (!node.data.label || node.data.label.trim() === "") {
    return { valid: false, message: `Node label is required.` };
  }

  switch (nodeType) {
    case "textNode": {
      const data = node.data as NodeTypeMap["textNode"];
      if (!data.body || data.body === "") {
        return {
          valid: false,
          message: `${node.data.label}: Message text is required.`,
        };
      }
      break;
    }

    case "quickReplyNode": {
      const data = node.data as NodeTypeMap["quickReplyNode"];
      if (!data.question || data.question.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Question is required.`,
        };
      }
      if (!data.options || data.options.length === 0) {
        return {
          valid: false,
          message: `${node.data.label}: At least one option is required.`,
        };
      }
      // Check if any option is empty
      const emptyOption = data.options.some((option) => !option || option.trim() === "");
      if (emptyOption) {
        return {
          valid: false,
          message: `${node.data.label}: All options must have text.`,
        };
      }
      break;
    }

    case "imageNode": {
      const data = node.data as NodeTypeMap["imageNode"];
      if (!data.link || data.link.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Image URL is required.`,
        };
      }
      break;
    }

    case "conditionalNode": {
      const data = node.data as NodeTypeMap["conditionalNode"];
      if (!data.condition || data.condition.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Condition is required.`,
        };
      }
      break;
    }

    case "textInputNode":
    case "numberInputNode":
    case "emailInputNode":
    case "phoneInputNode":
    case "dateInputNode": {
      const data = node.data as NodeTypeMap[typeof nodeType];
      if (!data.question || data.question === "") {
        return {
          valid: false,
          message: `${node.data.label}: Question is required.`,
        };
      }
      if (!data.variableName || data.variableName.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Variable name is required.`,
        };
      }
      break;
    }

    case "pauseNode": {
      const data = node.data as NodeTypeMap["pauseNode"];
      if (data.duration === undefined || data.duration < 0) {
        return {
          valid: false,
          message: `${node.data.label}: Pause duration must be 0 or greater.`,
        };
      }
      break;
    }

    case "videoNode":
    case "audioNode": {
      const data = node.data as NodeTypeMap[typeof nodeType];
      if (!data.link || data.link.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Media URL is required.`,
        };
      }
      break;
    }

    case "documentNode": {
      const data = node.data as NodeTypeMap["documentNode"];
      if (!data.link || data.link.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Document URL is required.`,
        };
      }
      if (!data.filename || data.filename.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Filename is required.`,
        };
      }
      break;
    }

    case "buttonNode": {
      const data = node.data as NodeTypeMap["buttonNode"];
      if (!data.body || data.body === "") {
        return {
          valid: false,
          message: `${node.data.label}: Message text is required.`,
        };
      }
      if (!data.buttons || data.buttons.length === 0) {
        return {
          valid: false,
          message: `${node.data.label}: At least one button is required.`,
        };
      }
      if (data.buttons.length > 3) {
        return {
          valid: false,
          message: `${node.data.label}: Maximum 3 buttons are allowed.`,
        };
      }
      // Check if any button is empty
      const emptyButton = data.buttons.some(
        (button) => !button.title || button.title.trim() === "",
      );
      if (emptyButton) {
        return {
          valid: false,
          message: `${node.data.label}: All buttons must have a title.`,
        };
      }

      // Check button title length
      const longButtonTitle = data.buttons.some(
        (button) => button.title && button.title.length > 20,
      );
      if (longButtonTitle) {
        return {
          valid: false,
          message: `${node.data.label}: Button titles must be 20 characters or less.`,
        };
      }

      // Validate header content based on headerType
      if (data.headerType) {
        if (data.headerType === "text" && (!data.header || data.header === "")) {
          return {
            valid: false,
            message: `${node.data.label}: Text header content is required when header type is 'text'.`,
          };
        } else if (
          ["image", "video", "document"].includes(data.headerType) &&
          (!data.link || data.link.trim() === "")
        ) {
          return {
            valid: false,
            message: `${node.data.label}: Media URL is required for ${data.headerType} header type.`,
          };
        }

        // If document header type, filename is required
        if (data.headerType === "document" && (!data.filename || data.filename.trim() === "")) {
          return {
            valid: false,
            message: `${node.data.label}: Filename is required for document header type.`,
          };
        }
      }
      break;
    }

    case "listNode": {
      const data = node.data as NodeTypeMap["listNode"];
      if (!data.body || data.body === "") {
        return {
          valid: false,
          message: `${node.data.label}: Message text is required.`,
        };
      }
      if (!data.button || data.button.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Button text is required.`,
        };
      }
      if (!data.sections || data.sections.length === 0) {
        return {
          valid: false,
          message: `${node.data.label}: At least one section is required.`,
        };
      }

      // Check if any section is empty or missing title
      const emptySection = data.sections.some(
        (section) => !section.title || section.title.trim() === "",
      );
      if (emptySection) {
        return {
          valid: false,
          message: `${node.data.label}: All sections must have a title.`,
        };
      }

      // Check if any section has no rows
      const emptySectionRows = data.sections.some(
        (section) => !section.rows || section.rows.length === 0,
      );
      if (emptySectionRows) {
        return {
          valid: false,
          message: `${node.data.label}: All sections must have at least one row.`,
        };
      }

      // Check if any row is missing a title
      const emptyRow = data.sections.some((section) =>
        section.rows.some((row) => !row.title || row.title.trim() === ""),
      );
      if (emptyRow) {
        return {
          valid: false,
          message: `${node.data.label}: All list rows must have a title.`,
        };
      }
      break;
    }

    case "stickerNode": {
      const data = node.data as NodeTypeMap["stickerNode"];
      if (!data.stickerId || data.stickerId.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Sticker ID is required.`,
        };
      }
      break;
    }

    case "ctaUrlNode": {
      const data = node.data as NodeTypeMap["ctaUrlNode"];
      if (!data.body || !hasRealContent(data.body)) {
        return {
          valid: false,
          message: `${node.data.label}: Body is required.`,
        };
      }
      if (!data.display_text || data.display_text.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Display text is required.`,
        };
      }
      if (!data.url || data.url.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: URL is required.`,
        };
      }
      break;
    }

    case "templateNode": {
      const data = node.data as NodeTypeMap["templateNode"];
      if (!data.template?.id || data.template?.id.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Template ID is required.`,
        };
      }
      break;
    }

    case "reactionNode": {
      const data = node.data as NodeTypeMap["reactionNode"];
      if (!data.emoji || data.emoji.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Emoji is required.`,
        };
      }
      if (!data.messageId || data.messageId.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Message ID is required.`,
        };
      }
      break;
    }

    case "locationNode": {
      const data = node.data as NodeTypeMap["locationNode"];
      if (!data.latitude || data.latitude.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Latitude is required.`,
        };
      }
      if (!data.longitude || data.longitude.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Longitude is required.`,
        };
      }
      break;
    }

    case "locationRequestNode": {
      const data = node.data as NodeTypeMap["locationRequestNode"];
      if (!data.message || data.message.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Request message is required.`,
        };
      }
      break;
    }

    case "addressNode": {
      const data = node.data as NodeTypeMap["addressNode"];
      if (!data.name || data.name.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Name is required.`,
        };
      }
      if (!data.street || data.street.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Street is required.`,
        };
      }
      if (!data.city || data.city.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: City is required.`,
        };
      }
      break;
    }

    case "flowNode": {
      const data = node.data as NodeTypeMap["flowNode"];
      if (!data.flow?.id || data.flow?.id.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Flow ID is required.`,
        };
      }
      if (!data.teamId || data.teamId.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Team ID is required.`,
        };
      }
      break;
    }
    // // aibot node
    case "aibotNode": {
      const data = node.data as NodeTypeMap["aibotNode"];

      if (!data.body || data.body === "") {
        return {
          valid: false,
          message: `${node.data.label}: Message text is required.`,
        };
      }
      if (!data.chatbot.id || data.chatbot.id === "") {
        return {
          valid: false,
          message: `${node.data.label}: Chatbot selection is required.`,
        };
      }
      break;
    }

    case "contactsNode": {
      const data = node.data as NodeTypeMap["contactsNode"];
      if (!data.contacts || data.contacts.length === 0) {
        return {
          valid: false,
          message: `${node.data.label}: At least one contact is required.`,
        };
      }

      // Validate each contact
      for (const contact of data.contacts) {
        if (
          !contact.name ||
          !contact.name.formatted_name ||
          contact.name.formatted_name.trim() === ""
        ) {
          return {
            valid: false,
            message: `${node.data.label}: Each contact must have a formatted name.`,
          };
        }

        if (!contact.name.first_name || contact.name.first_name.trim() === "") {
          return {
            valid: false,
            message: `${node.data.label}: Each contact must have a first name.`,
          };
        }

        // Validate phone numbers
        if (contact.phones && contact.phones.length > 0) {
          const invalidPhone = contact.phones.some(
            (phone) => !phone.phone || phone.phone.trim() === "",
          );
          if (invalidPhone) {
            return {
              valid: false,
              message: `${node.data.label}: All phone numbers must have a value.`,
            };
          }
        }

        // Validate email addresses
        if (contact.emails && contact.emails.length > 0) {
          const invalidEmail = contact.emails.some(
            (email) => !email.email || email.email.trim() === "",
          );
          if (invalidEmail) {
            return {
              valid: false,
              message: `${node.data.label}: All email addresses must have a value.`,
            };
          }
        }

        // Validate addresses
        if (contact.addresses && contact.addresses.length > 0) {
          const invalidAddress = contact.addresses.some(
            (address) =>
              !address.street ||
              address.street.trim() === "" ||
              !address.city ||
              address.city.trim() === "",
          );
          if (invalidAddress) {
            return {
              valid: false,
              message: `${node.data.label}: All addresses must have a street and city.`,
            };
          }
        }

        // Validate URLs
        if (contact.urls && contact.urls.length > 0) {
          const invalidUrl = contact.urls.some((url) => !url.url || url.url.trim() === "");
          if (invalidUrl) {
            return {
              valid: false,
              message: `${node.data.label}: All URLs must have a value.`,
            };
          }
        }
      }
      break;
    }

    case "ticketNode": {
      const data = node.data as NodeTypeMap["ticketNode"];
      if (!data.ticket?.selectedBoardColumnId || data.ticket.selectedBoardColumnId.trim() === "") {
        return {
          valid: false,
          message: `${node.data.label}: Selected column ID is required.`,
        };
      }
      break;
    }

    case "leadgenNode": {
      const data = node.data as NodeTypeMap["leadgenNode"];
      if (!data.fbPageId.trim().length) {
        return {
          valid: false,
          message: `${data.label}: Select Facebook page of the lead.`,
        };
      }
      if (!data.ad.id.trim().length) {
        return {
          valid: false,
          message: `${data.label}: Select Ad of the lead.`,
        };
      }
      if (!data.phone?.trim().length && !data.phoneField?.trim().length) {
        return {
          valid: false,
          message: `${data.label}: Phone number is required.Either provide phone number or phone number question key from the form.`,
        };
      }
      if (!data.pageAccessToken.trim().length && data.fbPageId.trim().length) {
        return {
          valid: false,
          message: `${data.label}: Something went wrong. Please deselect page and select again.`,
        };
      }
      break;
    }

    case "catalogNode": {
      const data = node.data as NodeTypeMap["catalogNode"];
      if (data.type !== CatalogMessages.SingleProduct && !data.body) {
        return {
          valid: false,
          message: `${data.label}: Body Text required.`,
        };
      }
      if (data.type === CatalogMessages.MultiProduct) {
        if (!data.header)
          return {
            valid: false,
            message: `${data.label}: Header Text required.`,
          };
        if (!data.sections?.length)
          return {
            valid: false,
            message: `${data.label}: At least one section required`,
          };
        let sum = 0;
        if (data.sections.length > 1 && data.sections.some((s) => !safeStrOrNull(s.title))) {
          return {
            valid: false,
            message: `${data.label}: Section title is required`,
          };
        }
        for (const section of data.sections) {
          if (!section.productItems?.length) {
            return {
              valid: false,
              message: `${data.label}: At least one product per section is required`,
            };
          }
          sum += section.productItems.length;
        }
        if (sum > 30) {
          return {
            valid: false,
            message: `${data.label}: maximum of 30 products can be selected across all sections`,
          };
        }
      }
      if (data.type === CatalogMessages.ProductSet) {
        if (!data.productSetId) {
          return {
            valid: false,
            message: `${data.label}: Please select a product set.`,
          };
        }
      }
      if (data.type === CatalogMessages.SingleProduct && !safeStrOrNull(data.productRetailerId)) {
        return {
          valid: false,
          message: `${data.label}: product is required.`,
        };
      }

      break;
    }

    case "instagramIceBreakerNode": {
      const data = node.data as NodeTypeMap["instagramIceBreakerNode"];
      if (!data.iceBreakers || data.iceBreakers.length === 0) {
        return {
          valid: false,
          message: `${node.data.label}: At least one ice breaker is required.`,
        };
      }
      // Check if any ice breaker has an empty question
      const emptyQuestion = data.iceBreakers.some(
        (iceBreaker) => !iceBreaker.question || iceBreaker.question.trim() === "",
      );
      if (emptyQuestion) {
        return {
          valid: false,
          message: `${node.data.label}: All ice breakers must have a question.`,
        };
      }
      break;
    }
  }

  // If we get here, all validations passed
  return { valid: true, message: "" };
}
