import {
  IconAd,
  IconAddressBook,
  IconBuildingStore,
  IconClockPause,
  IconExternalLink,
  IconFile,
  IconGitMerge,
  IconImageInPicture,
  IconInputSpark,
  IconLayout,
  IconMapPin,
  IconMenu2,
  IconMessage,
  IconMusic,
  IconPlayerPlay,
  IconPlayerStop,
  IconSquareRounded,
  IconUser,
  IconUserCheck,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import type { JSX } from "react";

/**
 * Single source of truth for every node's visual identity (icon + accent).
 * All node shells read from here instead of hard-coding icon/color, so the
 * palette stays consistent across the canvas, the sidebar and the mini-map.
 */
export interface NodeVisual {
  /** Accent color used for the icon tint, handles and selection ring hint. */
  color: string;
  icon: JSX.Element;
}

const ICON_SIZE = 16;

// Every node type gets its own distinct hue so the canvas, sidebar, handles,
// edges and mini-map read as a unique color per node. Keep these unique.
export const NODE_VISUALS: Record<string, NodeVisual> = {
  textNode: { color: "#e26d50", icon: <IconMessage size={ICON_SIZE} /> },
  imageNode: { color: "#6eedc5", icon: <IconImageInPicture size={ICON_SIZE} /> },
  videoNode: { color: "#d12eb6", icon: <IconVideo size={ICON_SIZE} /> },
  audioNode: { color: "#83e250", icon: <IconMusic size={ICON_SIZE} /> },
  documentNode: { color: "#7e6eed", icon: <IconFile size={ICON_SIZE} /> },

  textInputNode: { color: "#d1922e", icon: <IconInputSpark size={ICON_SIZE} /> },
  numberInputNode: { color: "#50d4e2", icon: <IconInputSpark size={ICON_SIZE} /> },
  emailInputNode: { color: "#ed6ea3", icon: <IconInputSpark size={ICON_SIZE} /> },
  phoneInputNode: { color: "#2ed138", icon: <IconInputSpark size={ICON_SIZE} /> },
  dateInputNode: { color: "#a050e2", icon: <IconInputSpark size={ICON_SIZE} /> },

  buttonNode: { color: "#eaed6e", icon: <IconSquareRounded size={ICON_SIZE} /> },
  listNode: { color: "#2e7ed1", icon: <IconMenu2 size={ICON_SIZE} /> },
  ctaUrlNode: { color: "#e25051", icon: <IconExternalLink size={ICON_SIZE} /> },
  templateNode: { color: "#6eedaa", icon: <IconLayout size={ICON_SIZE} /> },
  catalogNode: { color: "#ca2ed1", icon: <IconBuildingStore size={ICON_SIZE} /> },

  locationNode: { color: "#a2e250", icon: <IconMapPin size={ICON_SIZE} /> },
  contactsNode: { color: "#6e77ed", icon: <IconUsers size={ICON_SIZE} /> },

  flowNode: { color: "#d1702e", icon: <IconGitMerge size={ICON_SIZE} /> },
  pauseNode: { color: "#50e2d2", icon: <IconClockPause size={ICON_SIZE} /> },
  startNode: { color: "#ed6ebe", icon: <IconPlayerPlay size={ICON_SIZE} /> },
  endNode: { color: "#46d12e", icon: <IconPlayerStop size={ICON_SIZE} /> },

  assignNode: { color: "#edd66e", icon: <IconUser size={ICON_SIZE} /> },
  leadgenNode: { color: "#2ea0d1", icon: <IconAd size={ICON_SIZE} /> },

  instagramGenericTemplateNode: { color: "#e2506f", icon: <IconLayout size={ICON_SIZE} /> },
  instagramQuickReplyNode: { color: "#6eed90", icon: <IconSquareRounded size={ICON_SIZE} /> },
  instagramStoryReplyNode: { color: "#a92ed1", icon: <IconMessage size={ICON_SIZE} /> },
  instagramProductTemplateNode: { color: "#c0e250", icon: <IconBuildingStore size={ICON_SIZE} /> },
  instagramIceBreakerNode: { color: "#6e92ed", icon: <IconAddressBook size={ICON_SIZE} /> },
  instagramFollowCheckNode: { color: "#d6336c", icon: <IconUserCheck size={ICON_SIZE} /> },
};

const FALLBACK: NodeVisual = { color: "#64748b", icon: <IconSquareRounded size={ICON_SIZE} /> };

export function getNodeVisual(type?: string): NodeVisual {
  return (type && NODE_VISUALS[type]) || FALLBACK;
}

/** Human-readable display names, used for default node labels. */
export const NODE_LABELS: Record<string, string> = {
  textNode: "Text Message",
  imageNode: "Image",
  videoNode: "Video",
  audioNode: "Audio",
  documentNode: "Document",

  textInputNode: "Text Input",
  numberInputNode: "Number Input",
  emailInputNode: "Email Input",
  phoneInputNode: "Phone Input",
  dateInputNode: "Date Input",

  buttonNode: "Reply Buttons",
  listNode: "List Message",
  ctaUrlNode: "Call-to-Action URL",
  templateNode: "Template",
  catalogNode: "Catalog",

  locationNode: "Location",
  contactsNode: "Contacts",

  flowNode: "WhatsApp Flow",
  pauseNode: "Pause",
  startNode: "Start",
  endNode: "End",

  assignNode: "Assign Chat",
  leadgenNode: "Lead Ad",

  instagramGenericTemplateNode: "Generic Template",
  instagramQuickReplyNode: "Quick Reply",
  instagramStoryReplyNode: "Story Reply",
  instagramProductTemplateNode: "Product Template",
  instagramIceBreakerNode: "Ice Breakers",
  instagramFollowCheckNode: "Follow Check",
};

export function getNodeLabel(type?: string): string {
  return (type && NODE_LABELS[type]) || "Node";
}
