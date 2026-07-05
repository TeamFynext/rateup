import assignNode from "./assign-node.tsx";
import AudioNode from "./audio-node.tsx";
import ButtonNode from "./button-node.tsx";
import CatalogNode from "./catalog-node.tsx";
import ContactsNode from "./contacts-node.tsx";
import CtaUrlNode from "./cta-url-node.tsx";
import DocumentNode from "./document-node.tsx";
import EndNode from "./end-node.tsx";
import FlowNode from "./flow-node.tsx";
import ImageNode from "./image-node.tsx";
import InputNode from "./input-node.tsx";
import InstagramGenericTemplateNode from "./instagram-generic-template-node.tsx";
import InstagramIceBreakerNode from "./instagram-ice-breaker-node.tsx";
import InstagramProductTemplateNode from "./instagram-product-template-node.tsx";
import InstagramQuickReplyNode from "./instagram-quick-reply-node.tsx";
import InstagramStoryReplyNode from "./instagram-story-reply-node.tsx";
import LeadgenNode from "./leadgen-node.tsx";
import ListNode from "./list-node.tsx";
import LocationNode from "./location-node.tsx";
import PauseNode from "./pause-node.tsx";
import StartNode from "./start-node.tsx";
import TemplateNode from "./template-node.tsx";
import TextNode from "./text-node.tsx";
import ticketNode from "./ticket-node.tsx";
import VideoNode from "./video-node.tsx";

// Export all node types
export const nodeTypes = {
  textNode: TextNode,
  imageNode: ImageNode,
  videoNode: VideoNode,
  audioNode: AudioNode,
  documentNode: DocumentNode,
  textInputNode: InputNode,
  numberInputNode: InputNode,
  emailInputNode: InputNode,
  phoneInputNode: InputNode,
  dateInputNode: InputNode,

  pauseNode: PauseNode,
  startNode: StartNode,

  endNode: EndNode,
  buttonNode: ButtonNode,
  listNode: ListNode,
  ctaUrlNode: CtaUrlNode,
  templateNode: TemplateNode,
  locationNode: LocationNode,
  contactsNode: ContactsNode,
  flowNode: FlowNode,
  ticketNode: ticketNode,
  assignNode: assignNode,
  leadgenNode: LeadgenNode,
  catalogNode: CatalogNode,

  // Instagram specific nodes
  instagramGenericTemplateNode: InstagramGenericTemplateNode,
  instagramQuickReplyNode: InstagramQuickReplyNode,
  instagramStoryReplyNode: InstagramStoryReplyNode,
  instagramProductTemplateNode: InstagramProductTemplateNode,
  instagramIceBreakerNode: InstagramIceBreakerNode,
};
