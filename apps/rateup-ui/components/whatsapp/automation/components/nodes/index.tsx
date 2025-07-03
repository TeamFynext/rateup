import AiBotNode from "./aibot-node";
import assignNode from "./assign-node";
import AudioNode from "./audio-node";
import ButtonNode from "./button-node";
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
import StartNode from "./start-node";
import TemplateNode from "./template-node";
import TextNode from "./text-node";
import ticketNode from "./ticket-node";
import VideoNode from "./video-node";

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
  delayNode: DelayNode,
  startNode: StartNode,
  endNode: EndNode,
  buttonNode: ButtonNode,
  listNode: ListNode,
  ctaUrlNode: CtaUrlNode,
  templateNode: TemplateNode,
  locationNode: LocationNode,
  contactsNode: ContactsNode,
  flowNode: FlowNode,
  aibotNode: AiBotNode,
  ticketNode: ticketNode,
  assignNode: assignNode,
};
