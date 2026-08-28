export enum WHATSAPP_BUTTON_TYPE {
  QUICK_REPLY = "QUICK_REPLY",
  COPY_CODE = "COPY_CODE",
  PHONE_NUMBER = "PHONE_NUMBER",
  URL = "URL",
  FLOW = "FLOW",
}

export enum WaTemplateComponentType {
  BODY = "body",
  BUTTONS = "buttons",
  HEADER = "header",
  FOOTER = "footer",
}

export enum WaTemplateComponentTypeUpperCase {
  BODY = "BODY",
  BUTTONS = "BUTTONS",
  HEADER = "HEADER",
  FOOTER = "FOOTER",
}

export enum WaTemplateSupportedFormats {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  LOCATION = "LOCATION",
  DOCUMENT = "DOCUMENT",
  VIDEO = "VIDEO",
}
export enum CampaignParticipantStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  RESPONDING = "RESPONDING",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
  READ = "READ",
  DELIVERED = "DELIVERED",
}

export enum WaFlowStatus {
  PUBLISHED = "PUBLISHED",
  DRAFT = "DRAFT",
  DEPRECATED = "DEPRECATED",
  BLOCKED = "BLOCKED",
  THROTTLED = "THROTTLED",
}

export enum WaButtonType {
  QUICK_REPLY = "quick_reply",
}

export enum WaMessageTypes {
  text = "text",
  image = "image",
  interactive = "interactive",
  button = "button",
}

export enum WaTemplateStatus {
  APPROVED = "APPROVED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  DRAFT = "DRAFT",
}
export enum WaTemplateCategory {
  MARKETING = "MARKETING",
  UTILITY = "UTILITY",
  AUTHENTICATION = "AUTHENTICATION",
}

export enum CampaignStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  QUEUING = "QUEUING",
  DEQUEUING = "DEQUEUING",
}

export enum PlatformType {
  WHATSAPP = "WHATSAPP",
  INSTAGRAM = "INSTAGRAM",
}

export enum ZapierTriggers {
  CONTACT_CREATE = "new_contact_create",
  CONTACT_ASSIGN = "new_contact_assignee",
  NEW_MESSAGE = "new_message_received",
  CONVERSATION_CLOSED = "conversation_closed",
  CONTACT_UPDATED = "contact_updated",
  CONTACT_LIFECYCLE_UPDATED = "contact_lifecycle_updated",
  /** The board's counterpart to the lifecycle trigger, added beside it. */
  CONTACT_STAGE_UPDATED = "contact_stage_updated",
  TICKET_CREATED = "new_ticket",
  CONTACT_ADDED_TO_GROUP = "contact_added_to_group",
  RESPONSE_SUBMITTED = "response_submitted",
  CONTACT_DELETED = "contact_deleted",
  TICKET_CARD_MOVED = "ticket_card_moved",
  TICKET_ASSIGNEE_UPDATED = "ticket_assignee_updated",
  NEW_TEAM_MEMBER_CREATED = "new_staff_joined_to_team",
}
