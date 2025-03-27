import AddressNode from "./address-node";
import AudioNode from "./audio-node";
import ButtonNode from "./button-node";
import ConditionalNode from "./conditional-node";
import ContactsNode from "./contacts-node";
import CtaUrlNode from "./cta-url-node";
import DelayNode from "./delay-node";
import DocumentNode from "./document-node";
import EndNode from "./end-node";
import FlowNode from "./flow-node";
import ImageNode from "./image-node";
import InputNode from "./input-node";
import ListNode from "./list-node";
import LocationNode from "./location-node";
import LocationRequestNode from "./location-request-node";
import QuickReplyNode from "./quick-reply-node";
import ReactionNode from "./reaction-node";
import StartNode from "./start-node";
import StickerNode from "./sticker-node";
import TemplateNode from "./template-node";
import TextNode from "./text-node";
import VideoNode from "./video-node";

// Export all node types
export const nodeTypes = {
  textNode: TextNode,
  quickReplyNode: QuickReplyNode,
  imageNode: ImageNode,
  videoNode: VideoNode,
  audioNode: AudioNode,
  documentNode: DocumentNode,
  conditionalNode: ConditionalNode,
  textInputNode: InputNode,
  numberInputNode: InputNode,
  emailInputNode: InputNode,
  phoneInputNode: InputNode,
  dateInputNode: InputNode,
  delayNode: DelayNode,
  startNode: StartNode,
  endNode: EndNode,
  buttonNode: ButtonNode,
  listNode: ListNode,
  stickerNode: StickerNode,
  ctaUrlNode: CtaUrlNode,
  templateNode: TemplateNode,
  reactionNode: ReactionNode,
  locationNode: LocationNode,
  locationRequestNode: LocationRequestNode,
  addressNode: AddressNode,
  contactsNode: ContactsNode,
  flowNode: FlowNode,
};
