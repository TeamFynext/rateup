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
  /// Created by the wizard but never launched. Only the wizard and the campaign
  /// list see these; no worker ever picks a DRAFT up.
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  QUEUING = "QUEUING",
  DEQUEUING = "DEQUEUING",
  /// Stopped by a failure rather than by its owner. Distinct from INACTIVE so
  /// that "it fell over" and "I paused it" do not read the same in the list.
  FAILED = "FAILED",
  /// The initial send has drained and an automatic retry is booked for later.
  /// Nothing is going out right now, so calling this ACTIVE described the
  /// campaign as sending through a retry window that is usually hours long.
  RETRYING = "RETRYING",
  /// Stopped by the platform because the account cannot send. See the API's
  /// `src/types/enums.ts`.
  PAUSED = "PAUSED",
}

export enum PlatformType {
  WHATSAPP = "WHATSAPP",
  INSTAGRAM = "INSTAGRAM",
}
