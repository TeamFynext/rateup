// Meta accepts a flow JSON upload even when the JSON is invalid: the asset
// response carries `validation_errors`, and only the later publish is refused,
// with a generic "Publishing attempt failed". The builder lets a user save an
// unfinished element on purpose, so this is the one place they can learn what
// is still missing — which is why the errors are read here and named after the
// screen and element the user sees, not left as JSON paths.

export interface WaFlowValidationError {
  error?: string;
  error_type?: string;
  message?: string;
  pointers?: { path?: string }[];
}

export class FlowValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(
      errors.length === 1
        ? `Fix this before saving to WhatsApp: ${errors[0]}`
        : `Fix ${errors.length} issues before saving to WhatsApp`,
    );
    this.name = "FlowValidationError";
    this.errors = errors;
  }
}

type Node = Record<string, unknown>;

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// What the builder calls each Meta component, as the user would recognise it.
const ELEMENT_NAMES: Record<string, string> = {
  TextInput: "a short answer question",
  TextArea: "a long answer question",
  Dropdown: "a dropdown",
  RadioButtonsGroup: "a single choice question",
  CheckboxGroup: "a multiple choice question",
  ChipsSelector: "a chips question",
  DatePicker: "a date question",
  CalendarPicker: "a calendar question",
  OptIn: "an opt-in checkbox",
  PhotoPicker: "a photo upload",
  DocumentPicker: "a document upload",
  NavigationList: "a navigation list",
  TextHeading: "a heading",
  TextSubheading: "a subheading",
  TextBody: "a text block",
  TextCaption: "a caption",
  RichText: "a text block",
  Image: "an image",
  EmbeddedLink: "a link",
  Footer: "the button",
};

// Meta's property names, in the builder's words. The footer's `label` is its text.
const PROPERTY_NAMES: Record<string, string> = {
  label: "label",
  text: "text",
  title: "title",
  "data-source": "options",
  "helper-text": "helper text",
  description: "description",
  src: "file",
  "on-click-action": "action",
};

interface Location {
  screen?: string;
  element?: string;
  property?: string;
}

/**
 * "screens[1].layout.children[3].label" → screen `Screen 2 "Feedback"`, element
 * "a dropdown", property "label". The element is named by its type, never its
 * `name`: that is a generated id the user never sees. Resolved against the JSON
 * that was uploaded, since that is what the indices refer to.
 */
function locate(json: unknown, path: string): Location {
  const location: Location = { property: /\.([\w-]+)$/.exec(path)?.[1] };
  const screenMatch = /^screens\[(\d+)\]/.exec(path);
  if (!screenMatch || !isNode(json) || !Array.isArray(json.screens)) return location;
  const screenIndex = Number(screenMatch[1]);
  const screen: unknown = json.screens[screenIndex];
  const title = isNode(screen) && typeof screen.title === "string" ? screen.title.trim() : "";
  location.screen = `Screen ${screenIndex + 1}${title ? ` "${title}"` : ""}`;

  const childMatch = /^screens\[\d+\]\.layout\.children\[(\d+)\]/.exec(path);
  if (!childMatch) return location;
  // An element of a type we have no name for is still an element — never the screen.
  location.element = "an element";
  const layout = isNode(screen) ? screen.layout : undefined;
  if (isNode(layout) && Array.isArray(layout.children)) {
    const child: unknown = layout.children[Number(childMatch[1])];
    if (isNode(child) && typeof child.type === "string") {
      location.element = ELEMENT_NAMES[child.type] ?? location.element;
    }
  }
  return location;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Meta's common messages, rewritten for someone who has never seen the JSON.
 * Anything unrecognised keeps Meta's wording: a vague sentence of ours would be
 * worse than an exact one of theirs.
 */
function plainMessage(message: string, location: Location): string {
  const property = /'([\w-]+)'/.exec(message)?.[1] ?? location.property;
  const word =
    property === "label" && location.element === ELEMENT_NAMES.Footer
      ? "text"
      : property
        ? PROPERTY_NAMES[property]
        : undefined;
  if (!word) return message;
  const subject = location.element ? capitalize(location.element) : "This screen";
  const possessive = location.element ? `${capitalize(location.element)}'s` : "The screen's";

  if (/required|missing/i.test(message)) return `${subject} has no ${word}.`;
  // "at least 1 item" / "at least 1 character" is an empty field, not a short one.
  if (/at least\s+1\s+(item|character)|empty|no items/i.test(message)) {
    return `${subject} has no ${word}.`;
  }
  if (/at least|too short|minimum/i.test(message)) return `${possessive} ${word} is too short.`;
  if (/at most|too long|maximum|exceed/i.test(message)) return `${possessive} ${word} is too long.`;
  return message;
}

export function describeFlowValidationErrors(
  json: unknown,
  errors: WaFlowValidationError[],
): string[] {
  const lines = errors.map((err) => {
    const raw = err.message?.trim() || err.error || "Invalid flow JSON";
    const path = err.pointers?.map((pointer) => pointer.path).find(Boolean);
    const location = path ? locate(json, path) : {};
    const message = plainMessage(raw, location);
    return location.screen ? `${location.screen}: ${message}` : message;
  });
  return [...new Set(lines)];
}
