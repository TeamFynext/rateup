// For compatibility with legacy code referencing Node
export type Node =
  | TextNodeData
  | QuickReplyNodeData
  | ImageNodeData
  | ConditionalNodeData
  | InputNodeData
  | PauseNodeData
  | MediaNodeData
  | DocumentNodeData
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
  | CatalogNodeData;

// Restore all required node data interfaces for WhatsApp Survey Flow
/** One card of an Instagram generic (carousel) template. */
export interface InstagramTemplateButton {
  type: "postback" | "web_url";
  title: string;
  id?: string;
  payload?: string;
  url?: string;
}

export interface InstagramTemplateElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  buttons?: InstagramTemplateButton[];
}

export interface InstagramQuickReplyOption {
  content_type: "text";
  title: string;
  id?: string;
  payload: string;
  image_url?: string;
}

export interface BaseNodeData {
  label: string;
}

export interface TextNodeData extends BaseNodeData {
  body: string;
  previewUrl: boolean;
}

export interface QuickReplyNodeData extends BaseNodeData {
  question: string;
  options: string[];
}

export interface ImageNodeData extends BaseNodeData {
  link: string;
  caption?: string;
}

export interface ConditionalNodeData extends BaseNodeData {
  condition: string;
}

export interface InputNodeData extends BaseNodeData {
  question: string;
  variableName: string;
  validation?: string;
}

export interface PauseNodeData extends BaseNodeData {
  duration: number;
  unit: "seconds" | "minutes" | "hours";
}
// ...existing code...

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
export interface StartNodeData extends BaseNodeData {
  startMessage?: string;
  recipient: string;
}

// End Node
export interface EndNodeData extends BaseNodeData {
  endMessage?: string;
}

// Button Node
export interface ButtonOption {
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
export interface ListItem {
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
export interface StickerNodeData extends BaseNodeData {
  stickerId: string;
}

// CTA URL Node
export interface CTAUrlNodeData extends BaseNodeData {
  headerType?: string;
  header?: string;
  body?: string;
  footer?: string;
  display_text: string;
  url: string;
  caption?: string;
  filename?: string;
  link?: string;
}

// Template Node
export interface TemplateComponentParameter {
  type: string;
  /**
   * Usually the resolved text. On a leadgen automation it can instead hold a
   * placeholder naming the lead field to substitute, until it is resolved.
   */
  text?: string | { type: string; value: string } | null;
  image?: { link?: string };
  document?: { link?: string; filename?: string };
  video?: { link?: string };
  [field: string]: unknown;
}

export interface TemplateComponent {
  type: string;
  parameters: TemplateComponentParameter[];
  [field: string]: unknown;
}

export interface TemplateNodeData extends BaseNodeData {
  template: {
    id: string;
    name?: string;
  };
  teamId?: string;
}

// Reaction Node
export interface ReactionNodeData extends BaseNodeData {
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
export interface LocationRequestNodeData extends BaseNodeData {
  message: string;
}

// Address Node
export interface AddressNodeData extends BaseNodeData {
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
export interface AiBotNodeData extends BaseNodeData {
  body: string;
  // chatbotId?: string;
  chatbot: {
    id: string;
    name: string;
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

export interface LeadgenNodeData extends BaseNodeData {
  adAccountId: string;
  ad: {
    id: string;
    name: string;
  };
  phone: string;
  phoneField: string;
  fbPageId: string;
  leadgenFormId: string;
  pageAccessToken: string;
  pageUserAccessToken?: string;
}

export interface CatalogNodeData extends BaseNodeData {
  type: string;
  header?: string;
  body: string;
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

// Map of node types to their data types
export interface NodeTypeMap {
  textNode: TextNodeData;
  quickReplyNode: QuickReplyNodeData;
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
  documentNode: DocumentNodeData;
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
}

// Node type strings as a union type
export type NodeType = keyof NodeTypeMap;

// Union type for all node data types
export type NodeData =
  | TextNodeData
  | QuickReplyNodeData
  | ImageNodeData
  | ConditionalNodeData
  | InputNodeData
  | PauseNodeData
  | MediaNodeData
  | DocumentNodeData
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
  | CatalogNodeData;

// Extended Node type with typed data
export type TypedNode<T extends NodeType = NodeType> = Omit<Node, "data" | "type"> & {
  type: T;
  data: NodeTypeMap[T];
};

// Helper function to check node type and cast data
export function assertNodeType<T extends NodeType>(
  node: TypedNode,
  nodeType: T,
): asserts node is TypedNode<T> {
  if (node.type !== nodeType) {
    throw new Error(`Expected node type ${nodeType}, got ${node.type}`);
  }
}

// Simplified helper to safely get typed data from a node
export function getTypedNodeData<T extends NodeType>(
  node: TypedNode,
  nodeType: T,
): NodeTypeMap[T] | null {
  return node.type === nodeType ? (node.data as NodeTypeMap[T]) : null;
}

export interface WhatsAppMessage {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  // The payload key matching `type` (text, image, interactive, ...); readers
  // narrow on `type` before reaching into it.
  [key: string]: unknown;
}

/**
 * A node of an automation graph, as stored under
 * `WaAutomatedReply.matchData.json`. `data` carries the node-kind-specific
 * fields (see NodeTypeMap); use assertNodeType/getTypedNodeData to narrow it.
 */
export interface AutomationNode {
  id: string;
  type: NodeType | string;
  data: Partial<BaseNodeData> & Record<string, unknown>;
  position?: { x: number; y: number };
}

/** An edge joining two automation nodes. */
export interface AutomationEdge {
  id?: string;
  source: string;
  target: string;
  /** Identifies which outgoing branch of `source` this edge leaves from. */
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** The graph stored on `WaAutomatedReply.matchData.json`. */
export interface AutomationGraph {
  nodes: AutomationNode[];
  edges: AutomationEdge[];
}

/** The fields of a WaAutomatedReply row the flow-runner needs. */
export interface AutomationWithGraph {
  id: string;
  orgId?: string | null;
  whatsappSettingsPhoneId?: string | null;
  /** `json` is absent on keyword-only automations. */
  matchData: { json?: AutomationGraph };
}
