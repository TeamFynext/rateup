import i18n from "i18next";
import type { Resolver } from "react-hook-form";

/*
 * Field-level validation for flow nodes.
 *
 * `getNodeFieldErrors` returns a map of `fieldName -> message` (collecting ALL
 * failing fields, not just the first) so the editor can render an inline error
 * under each field and the node card can show an invalid (red) border.
 *
 * This is the single source of truth: `validateNodeData` (used for the Save
 * toast) is derived from it.
 */
import { parseToWhatsAppFormat } from "@/components/RichTextEditor/wa-editor/format.tsx";
import type { AutomationPlatform } from "@/types/platform.ts";
import { formatBytes, limitsFor, type MediaNodeType } from "@/types/platformLimits.ts";
import type { TiptapNode } from "@/types/tiptapNode";
import { hasRealContent, safeStrOrNull } from "@/utils/index.ts";

import type { NodeData, NodeFields, TypedNode } from "./node-types.ts";

// Mirror of the CatalogMessages enum in node-editor.tsx. Duplicated here (not
// imported) to avoid a circular dependency — this module is pulled in by the
// node card render path, which must not drag in the whole editor.
const CatalogMessages = {
  Catalog: "Catalog",
  SingleProduct: "Single-Product",
  MultiProduct: "Multi-Product",
  ProductSet: "Product-Set",
} as const;

export type NodeFieldErrors = Record<string, string>;

const isBlank = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/**
 * The length of a message field as it is sent: rich text is counted once turned into
 * WhatsApp-style text (the form every channel's sender uses), a plain string as it is.
 */
export function sentLength(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      try {
        return parseToWhatsAppFormat(JSON.parse(trimmed) as TiptapNode).length;
      } catch {
        // Not JSON after all: count it as typed.
      }
    }
    return value.length;
  }
  if (typeof value === "object") return parseToWhatsAppFormat(value as TiptapNode).length;
  return 0;
}

interface CardFields {
  title?: string;
  subtitle?: string;
  buttons?: Array<{ title?: string }>;
}

/**
 * What breaks the chatbot's channel's limits (see platformLimits.ts). Separate from the
 * required-field checks, which hold on every channel.
 */
export function getNodeLimitErrors(
  node: { type: string; data?: NodeFields },
  platform: AutomationPlatform,
): NodeFieldErrors {
  const errors: NodeFieldErrors = {};
  const data = node.data ?? {};
  const limits = limitsFor(platform);
  const tooLong = (value: unknown, max: number) => sentLength(value) > max;

  switch (node.type) {
    case "textNode":
      if (tooLong(data.body, limits.text)) {
        errors.body = `Message text must be ${limits.text} characters or less on this channel.`;
      }
      break;
    case "imageNode":
    case "videoNode":
    case "documentNode":
      if (tooLong(data.caption, limits.caption)) {
        errors.caption = `Caption must be ${limits.caption} characters or less on this channel.`;
      }
      break;
    case "textInputNode":
    case "numberInputNode":
    case "emailInputNode":
    case "phoneInputNode":
    case "dateInputNode":
      if (tooLong(data.question, limits.text)) {
        errors.question = `Question must be ${limits.text} characters or less on this channel.`;
      }
      break;
    case "instagramQuickReplyNode": {
      const { max, title } = limits.quickReplies;
      if (tooLong(data.text, limits.text)) {
        errors.text = `Message text must be ${limits.text} characters or less on this channel.`;
      }
      const replies = data.quick_replies ?? [];
      if (replies.length > max) {
        errors.quick_replies = `Up to ${max} quick replies.`;
      } else if (replies.some((reply) => (reply?.title ?? "").length > title)) {
        errors.quick_replies = `Quick replies must be ${title} characters or less.`;
      }
      break;
    }
    case "instagramGenericTemplateNode": {
      const { max, title, subtitle, buttons, buttonTitle } = limits.cards;
      const cards = (data.elements ?? []) as CardFields[];
      if (cards.length > max) {
        errors.elements = `Up to ${max} cards.`;
      } else if (cards.some((card) => (card.title ?? "").length > title)) {
        errors.elements = `Card titles must be ${title} characters or less.`;
      } else if (cards.some((card) => (card.subtitle ?? "").length > subtitle)) {
        errors.elements = `Card subtitles must be ${subtitle} characters or less.`;
      } else if (cards.some((card) => (card.buttons ?? []).length > buttons)) {
        errors.elements = `Up to ${buttons} buttons per card.`;
      } else if (
        cards.some((card) =>
          (card.buttons ?? []).some((b) => (b?.title ?? "").length > buttonTitle),
        )
      ) {
        errors.elements = `Card buttons must be ${buttonTitle} characters or less.`;
      }
      break;
    }
    default:
      break;
  }
  return errors;
}

/** The largest upload a media block takes on a channel, and how to say it. */
export function mediaLimit(nodeType: MediaNodeType, platform: AutomationPlatform | undefined) {
  const bytes = limitsFor(platform).mediaBytes[nodeType];
  return bytes ? { bytes, text: formatBytes(bytes) } : undefined;
}

export function getNodeFieldErrors(
  node: { type: string; data?: NodeFields },
  platform?: AutomationPlatform,
): NodeFieldErrors {
  const errors: NodeFieldErrors = platform ? getNodeLimitErrors(node, platform) : {};
  const data = node.data ?? {};

  if (isBlank(data.label)) {
    errors.label = "Node label is required.";
  }

  switch (node.type) {
    case "textNode":
    case "catalogNode": {
      if (node.type === "textNode" && isBlank(data.body)) {
        errors.body = "Message text is required.";
      }
      if (node.type === "catalogNode") {
        if (data.type !== CatalogMessages.SingleProduct && !data.body) {
          errors.body = "Body text is required.";
        }
        if (data.type === CatalogMessages.MultiProduct) {
          if (!data.header) errors.header = "Header text is required.";
          if (!data.sections?.length) {
            errors.sections = "At least one section is required.";
          } else {
            if (data.sections.length > 1 && data.sections.some((s) => !safeStrOrNull(s.title))) {
              errors.sections = "Section title is required.";
            }
            let sum = 0;
            for (const section of data.sections) {
              if (!section.productItems?.length) {
                errors.sections = "At least one product per section is required.";
              }
              sum += section.productItems?.length ?? 0;
            }
            if (sum > 30) {
              errors.sections = "Maximum of 30 products can be selected across all sections.";
            }
          }
        }
        if (data.type === CatalogMessages.ProductSet && !data.productSetId) {
          errors.productSetId = "Please select a product set.";
        }
        if (data.type === CatalogMessages.SingleProduct && !safeStrOrNull(data.productRetailerId)) {
          errors.productRetailerId = "Product is required.";
        }
      }
      break;
    }

    case "conditionalNode":
      if (isBlank(data.condition)) errors.condition = "Condition is required.";
      break;

    case "textInputNode":
    case "numberInputNode":
    case "emailInputNode":
    case "phoneInputNode":
    case "dateInputNode":
      if (isBlank(data.question)) errors.question = "Question is required.";
      if (isBlank(data.variableName)) errors.variableName = "Variable name is required.";
      break;

    case "quickReplyNode":
      if (isBlank(data.question)) errors.question = "Question is required.";
      if (!data.options?.length) {
        errors.options = "At least one option is required.";
      } else if (data.options.some((o: string) => isBlank(o))) {
        errors.options = "All options must have text.";
      }
      break;

    case "imageNode":
    case "videoNode":
    case "audioNode":
      if (isBlank(data.link)) errors.link = "A file is required.";
      break;

    case "documentNode":
      if (isBlank(data.link)) errors.link = "A file is required.";
      if (isBlank(data.filename)) errors.filename = "Filename is required.";
      break;

    case "pauseNode":
      if (data.duration === undefined || data.duration < 0) {
        errors.duration = "Pause duration must be 0 or greater.";
      }
      break;

    case "buttonNode": {
      if (isBlank(data.body)) errors.body = "Message text is required.";
      if (!data.buttons?.length) {
        errors.buttons = "At least one button is required.";
      } else if (data.buttons.length > 3) {
        errors.buttons = "Maximum 3 buttons are allowed.";
      } else if (data.buttons.some((b) => isBlank(b?.title))) {
        errors.buttons = "All buttons must have a title.";
      } else if (data.buttons.some((b) => b?.title && b.title.length > 20)) {
        errors.buttons = "Button titles must be 20 characters or less.";
      }
      if (data.headerType === "text" && isBlank(data.header)) {
        errors.header = "Header content is required.";
      } else if (
        ["image", "video", "document"].includes(data.headerType ?? "") &&
        isBlank(data.link)
      ) {
        errors.link = "Media is required for this header type.";
      }
      if (data.headerType === "document" && isBlank(data.filename)) {
        errors.filename = "Filename is required for document header.";
      }
      break;
    }

    case "listNode": {
      if (isBlank(data.body)) errors.body = "Message text is required.";
      if (isBlank(data.button)) errors.button = "Button text is required.";
      if (!data.sections?.length) {
        errors.sections = "At least one section is required.";
      } else if (data.sections.some((s) => isBlank(s?.title))) {
        errors.sections = "All sections must have a title.";
      } else if (data.sections.some((s) => !s.rows?.length)) {
        errors.sections = "All sections must have at least one row.";
      } else if (data.sections.some((s) => s.rows?.some((r) => isBlank(r?.title)))) {
        errors.sections = "All list rows must have a title.";
      }
      break;
    }

    case "ctaUrlNode":
      if (!data.body || !hasRealContent(data.body)) errors.body = "Body is required.";
      if (isBlank(data.display_text)) errors.display_text = "Display text is required.";
      if (isBlank(data.url)) errors.url = "URL is required.";
      break;

    case "templateNode":
      if (isBlank(data.template?.id)) errors.template = "Template is required.";
      break;

    case "locationNode":
      if (isBlank(data.latitude)) errors.latitude = "Latitude is required.";
      if (isBlank(data.longitude)) errors.longitude = "Longitude is required.";
      break;

    case "flowNode":
      if (isBlank(data.flow?.id)) errors.flow = "Flow is required.";
      if (isBlank(data.teamId)) errors.teamId = "Team is required.";
      break;

    case "leadgenNode":
      if (isBlank(data.fbPageId)) errors.fbPageId = "Select the Facebook page of the lead.";
      if (isBlank(data.ad?.id)) errors.ad = "Select the Ad of the lead.";
      if (isBlank(data.phone) && isBlank(data.phoneField)) {
        errors.phone = "Provide a phone number or a phone question key from the form.";
      }
      if (isBlank(data.pageAccessToken) && !isBlank(data.fbPageId)) {
        errors.fbPageId = "Something went wrong. Please deselect the page and select again.";
      }
      break;

    case "contactsNode": {
      if (!data.contacts?.length) {
        errors.contacts = "At least one contact is required.";
        break;
      }
      for (const contact of data.contacts) {
        if (isBlank(contact?.name?.formatted_name)) {
          errors.contacts = "Each contact must have a formatted name.";
          break;
        }
        if (isBlank(contact?.name?.first_name)) {
          errors.contacts = "Each contact must have a first name.";
          break;
        }
        if (contact.phones?.some((p) => isBlank(p?.phone))) {
          errors.contacts = "All phone numbers must have a value.";
          break;
        }
        if (contact.emails?.some((e) => isBlank(e?.email))) {
          errors.contacts = "All email addresses must have a value.";
          break;
        }
        if (contact.addresses?.some((a) => isBlank(a?.street) || isBlank(a?.city))) {
          errors.contacts = "All addresses must have a street and city.";
          break;
        }
        if (contact.urls?.some((u) => isBlank(u?.url))) {
          errors.contacts = "All URLs must have a value.";
          break;
        }
      }
      break;
    }

    // Meta's card limits: the title (our message) 80 characters, a button 20.
    case "continueOnWhatsappNode":
      if (isBlank(data.channelId)) errors.channelId = i18n.t("Select a WhatsApp number.");
      if (isBlank(data.body)) errors.body = i18n.t("Message text is required.");
      else if ((data.body ?? "").length > 80) {
        errors.body = i18n.t("Message must be 80 characters or less.");
      }
      if (isBlank(data.buttonLabel)) errors.buttonLabel = i18n.t("Button label is required.");
      else if ((data.buttonLabel ?? "").length > 20) {
        errors.buttonLabel = i18n.t("Button label must be 20 characters or less.");
      }
      break;

    case "instagramIceBreakerNode":
      if (!data.iceBreakers?.length) {
        errors.iceBreakers = "At least one ice breaker is required.";
      } else if (data.iceBreakers.some((i) => isBlank(i?.question))) {
        errors.iceBreakers = "All ice breakers must have a question.";
      }
      break;

    default:
      break;
  }

  return errors;
}

/** True when the node has no validation errors. */
export function isNodeValid(
  node: { type: string; data?: NodeFields },
  platform?: AutomationPlatform,
): boolean {
  return Object.keys(getNodeFieldErrors(node, platform)).length === 0;
}

/** react-hook-form resolver backed by {@link getNodeFieldErrors}. */
export function nodeResolver(nodeType: string, platform?: AutomationPlatform): Resolver<NodeData> {
  return (values) => {
    const fieldErrors = getNodeFieldErrors({ type: nodeType, data: values }, platform);
    const errors = Object.fromEntries(
      Object.entries(fieldErrors).map(([name, message]) => [name, { type: "validate", message }]),
    );
    return { values: Object.keys(errors).length ? {} : values, errors };
  };
}

/**
 * First field error as a single message (optionally prefixed with the node
 * label) — used for the Save toast.
 */
export function firstNodeError(node: TypedNode, platform?: AutomationPlatform): string {
  const errors = getNodeFieldErrors(node, platform);
  const keys = Object.keys(errors);
  if (!keys.length) return "";
  const label = node.data?.label;
  const message = errors[keys[0]];
  return label ? `${label}: ${message}` : message;
}
