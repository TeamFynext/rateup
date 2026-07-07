import { IconFile, IconMusic, IconPhoto, IconVideo } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import type { JSX, ReactNode } from "react";
import { memo } from "react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor.tsx";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment.tsx";
import { cn } from "@/lib/utils.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { isNodeValid } from "../../types/node-validation.ts";
import BaseNode from "./base-node.tsx";
import { NodeChoice, NodePlaceholder, NodeText } from "./node-parts.tsx";

/**
 * A single, data-driven node component that renders every node type. Each type
 * contributes a small spec (below) returning only the parts that have data.
 *
 * Every node presents its data the same way — a stack of labelled fields
 * ("LABEL" over its value) — so all node types read consistently. Media
 * (Attachment) and branching choices are the only specialised parts.
 */

type MediaKind = "image" | "video" | "audio" | "document";
type Choice = { id?: string; title: ReactNode; description?: ReactNode };

type Part =
  | { t: "field"; label?: string; value: ReactNode; mono?: boolean }
  | { t: "rich"; label?: string; value: unknown; placeholder?: string }
  | { t: "media"; kind: MediaKind; src?: string | null; title: ReactNode; caption?: unknown }
  | { t: "choices"; items: Choice[] };

// ── part builders ───────────────────────────────────────────────────────
const field = (label: string | undefined, value: ReactNode, mono = false): Part => ({
  t: "field",
  label,
  value,
  mono,
});
const rich = (label: string, value: unknown, placeholder?: string): Part => ({
  t: "rich",
  label,
  value,
  placeholder,
});
const media = (
  kind: MediaKind,
  src: string | null | undefined,
  title: ReactNode,
  caption?: unknown,
): Part => ({ t: "media", kind, src, title, caption });
const choices = (items: Choice[]): Part => ({ t: "choices", items });

// Shared spec for all user-input node types.
const inputSpec = (d: any): Part[] => {
  const parts: Part[] = [rich("Question", d.question, "Empty question")];
  if (d.variableName) parts.push(field("Saves to", d.variableName, true));
  return parts;
};

// ── per-type body specs (return only the relevant fields) ───────────────
const NODE_BODY: Record<string, (d: any) => Part[]> = {
  textNode: (d) => [rich("Message", d.body, "Empty message")],
  catalogNode: (d) => [rich("Message", d.body, "Empty message")],

  imageNode: (d) => [
    media(
      "image",
      d.link ? getFileUrlFromKey(d.link) : null,
      d.link ? "Image" : "Add image",
      d.caption,
    ),
  ],
  videoNode: (d) => [media("video", null, d.link ? "Video" : "Add video", d.caption)],
  audioNode: (d) => [media("audio", null, d.link ? "Audio" : "Add audio", d.caption)],
  documentNode: (d) => [
    media("document", null, d.link ? d.filename || "Document" : "Add document"),
  ],

  textInputNode: inputSpec,
  numberInputNode: inputSpec,
  emailInputNode: inputSpec,
  phoneInputNode: inputSpec,
  dateInputNode: inputSpec,

  buttonNode: (d) => {
    const parts: Part[] = [];
    if (d.headerType === "image" || d.headerType === "video" || d.headerType === "document") {
      parts.push(
        media(
          d.headerType,
          d.headerType === "image" && d.link ? getFileUrlFromKey(d.link) : null,
          d.headerType === "document" ? d.filename || "Document" : "Header",
        ),
      );
    } else if (d.headerType === "text" && d.header) {
      parts.push(rich("Header", d.header));
    }
    if (d.body) parts.push(rich("Message", d.body));
    if (d.footer) parts.push(rich("Footer", d.footer));
    parts.push(
      choices(
        (d.buttons || []).map((b: any) => ({
          id: typeof b === "object" ? b?.id : undefined,
          title: typeof b === "object" ? b.title : b,
        })),
      ),
    );
    return parts;
  },

  listNode: (d) => {
    const parts: Part[] = [];
    if (d.header) parts.push(field("Header", d.header));
    if (d.body) parts.push(rich("Message", d.body));
    if (d.footer) parts.push(rich("Footer", d.footer));
    if (d.button) parts.push(field("Button", d.button));
    const items: Choice[] = [];
    (d.sections || []).forEach((s: any) =>
      (s.rows || []).forEach((r: any) =>
        items.push({ id: r.id, title: r.title, description: r.description }),
      ),
    );
    if (items.length) parts.push(choices(items));
    return parts;
  },

  ctaUrlNode: (d) => {
    const parts: Part[] = [];
    if (d.header) parts.push(field("Header", d.header));
    if (d.body) parts.push(rich("Message", d.body));
    if (d.display_text) parts.push(field("Button", d.display_text));
    if (d.url) parts.push(field("URL", d.url));
    if (d.footer) parts.push(rich("Footer", d.footer));
    return parts.length
      ? parts
      : [field(undefined, <NodePlaceholder>Configure the button</NodePlaceholder>)];
  },

  templateNode: (d) => [rich("Template", d?.template?.name, "Select a template")],
  flowNode: (d) => [rich("Flow", d?.flow?.name, "Select a flow")],
  pauseNode: (d) => [field("Delay", `${d.duration ?? ""} ${d.unit ?? ""}`.trim() || "—")],
  startNode: () => [field("Trigger", "Flow entry point")],
  endNode: (d) => [rich("Message", d.endMessage, "Flow end point")],

  locationNode: (d) => {
    const parts: Part[] = [];
    if (d.name) parts.push(field("Name", d.name));
    if (d.latitude) parts.push(field("Latitude", d.latitude));
    if (d.longitude) parts.push(field("Longitude", d.longitude));
    if (d.address) parts.push(field("Address", d.address));
    return parts.length ? parts : [field("Location", "Not set")];
  },

  contactsNode: (d) => [field("Contacts", `${d.contacts?.length ?? 0} to send`)],

  ticketNode: (d) => {
    const parts: Part[] = [];
    if (d.ticket?.selectedBoardName) parts.push(field("Board", d.ticket.selectedBoardName));
    if (d.ticket?.selectedBoardColumnName)
      parts.push(field("Column", d.ticket.selectedBoardColumnName));
    return parts.length ? parts : [field("Ticket", "Not configured")];
  },

  assignNode: (d) => {
    const a = d.assign || {};
    const parts: Part[] = [];
    if (a.assignType) parts.push(field("Assign to", a.assignType));
    if (a.choice) parts.push(field("Choice", a.choice));
    parts.push(field("If online", a.assignIfOnline ? "Only if online" : "Regardless"));
    if (a.assignType === "staff") {
      if (a.teamName) parts.push(field("Team", a.teamName));
      if (a.choice === "all") parts.push(field("Round robin", a.roundRobin ? "Yes" : "No"));
    }
    return parts;
  },

  leadgenNode: (d) => [rich("Ad", d?.ad?.name, "Select a lead ad")],

  instagramGenericTemplateNode: (d) => {
    const count = d.elements?.length || 0;
    const parts: Part[] = [field("Cards", `${count} card${count !== 1 ? "s" : ""}`)];
    const items: Choice[] = [];
    (d.elements || []).forEach((el: any, ci: number) =>
      (el.buttons || []).forEach((b: any, bi: number) => {
        if (b.type === "postback") {
          items.push({ id: b.id || b.payload || `btn_${ci}_${bi}`, title: b.title || "Button" });
        }
      }),
    );
    if (items.length) parts.push(choices(items));
    return parts;
  },

  instagramQuickReplyNode: (d) => {
    const parts: Part[] = [];
    if (d.text) parts.push(rich("Message", d.text));
    const items: Choice[] = (d.quick_replies || []).map((r: any, i: number) => ({
      id: r.id || r.payload || `qr_${i}`,
      title: r.title || `Option ${i + 1}`,
    }));
    parts.push(choices(items));
    return parts;
  },

  instagramStoryReplyNode: (d) => [
    field("Trigger", d.story_mention ? "Story mention" : "Story reply"),
  ],
  instagramProductTemplateNode: (d) => {
    const c = d.elements?.length || 0;
    return [field("Products", `${c} product${c !== 1 ? "s" : ""}`)];
  },
  instagramIceBreakerNode: (d) => {
    const c = d.iceBreakers?.length || 0;
    return [field("Ice breakers", `${c} question${c !== 1 ? "s" : ""}`)];
  },
};

// Nodes whose left/right handles need to be turned off.
const NODE_FLAGS: Record<string, { disableLeft?: boolean; disableRight?: boolean }> = {
  startNode: { disableLeft: true },
  leadgenNode: { disableLeft: true },
  endNode: { disableRight: true },
};

const MEDIA_ICON: Record<MediaKind, JSX.Element> = {
  image: <IconPhoto size={18} />,
  video: <IconVideo size={18} />,
  audio: <IconMusic size={18} />,
  document: <IconFile size={18} />,
};

function FieldLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function PartView({ part }: Readonly<{ part: Part }>) {
  switch (part.t) {
    case "field":
      return (
        <div className="flex flex-col gap-0.5">
          {part.label && <FieldLabel>{part.label}</FieldLabel>}
          <span className={cn("text-foreground", part.mono && "w-fit font-mono text-[11px]")}>
            {part.value}
          </span>
        </div>
      );
    case "rich":
      return (
        <div className="flex flex-col gap-0.5">
          {part.label && <FieldLabel>{part.label}</FieldLabel>}
          {part.value ? (
            <NodeText>{parseJsonToReact(part.value)}</NodeText>
          ) : (
            <NodePlaceholder>{part.placeholder}</NodePlaceholder>
          )}
        </div>
      );
    case "media": {
      const isImage = part.kind === "image" && !!part.src;
      return (
        <Attachment size="sm" orientation="horizontal" className="w-full">
          <AttachmentMedia variant={isImage ? "image" : "icon"}>
            {isImage ? <img src={part.src!} alt="" /> : MEDIA_ICON[part.kind]}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{part.title}</AttachmentTitle>
            {part.caption ? (
              <AttachmentDescription>{parseJsonToReact(part.caption)}</AttachmentDescription>
            ) : null}
          </AttachmentContent>
        </Attachment>
      );
    }
    case "choices":
      return (
        <div className="flex flex-col gap-1.5">
          {part.items.map((c, i) => (
            <NodeChoice
              key={c.id ?? i}
              handleId={c.id}
              title={c.title}
              description={c.description}
            />
          ))}
        </div>
      );
    default:
      return null;
  }
}

function GenericNode(props: NodeProps) {
  const { data, type } = props;
  const nodeType = (data?.type as string) || type || "";
  const spec =
    NODE_BODY[nodeType] ??
    (() => [field(undefined, <NodePlaceholder>No preview</NodePlaceholder>)]);
  const parts = spec(data ?? {});
  const hasChoices = parts.some((p) => p.t === "choices");
  const flags = NODE_FLAGS[nodeType] ?? {};
  const invalid = !isNodeValid({ type: nodeType, data: data ?? {} });

  return (
    <BaseNode
      {...props}
      invalid={invalid}
      disableLeft={flags.disableLeft}
      disableRight={flags.disableRight || hasChoices}
    >
      {parts.map((part, i) => (
        <PartView key={i} part={part} />
      ))}
    </BaseNode>
  );
}

export default memo(GenericNode);
