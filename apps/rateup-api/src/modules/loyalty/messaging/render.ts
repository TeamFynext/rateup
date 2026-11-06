/**
 * Turning stored message text into the words a customer reads. Channel-neutral: `{{n}}`
 * placeholders filled positionally, and a WhatsApp-shaped template (`components[]`) read as
 * plain text for channels, or windows, where the template itself is not needed.
 */

interface TemplateComponentLike {
  type?: string;
  format?: string;
  text?: string;
}

function componentsOf(components: unknown): TemplateComponentLike[] {
  return Array.isArray(components) ? (components as TemplateComponentLike[]) : [];
}

function componentType(component: TemplateComponentLike): string {
  return String(component?.type ?? "").toUpperCase();
}

export function fillPlaceholders(text: string, params: readonly string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_match, index: string) => {
    const value = params[Number(index) - 1];
    return value === undefined ? "" : value;
  });
}

/** The BODY component's text, unfilled, or null when the template has none. */
export function templateBodyText(components: unknown): string | null {
  const body = componentsOf(components).find((component) => componentType(component) === "BODY");
  return body?.text ?? null;
}

/**
 * Fills `{{n}}` placeholders in a template's BODY component with the parameters sent to
 * Meta, in order. Returns null when the template has no body text.
 */
export function renderTemplateBody(components: unknown, params: readonly string[]): string | null {
  const body = templateBodyText(components);
  return body === null ? null : fillPlaceholders(body, params);
}

/**
 * Whether a template loses nothing when sent as plain text: a body, optionally a text
 * header and a footer. Buttons and media headers have no text equivalent, so a template
 * carrying them is always sent as a template.
 */
export function isTextDowngradable(components: unknown): boolean {
  const list = componentsOf(components);
  if (!list.some((component) => componentType(component) === "BODY")) return false;
  return list.every((component) => {
    switch (componentType(component)) {
      case "BODY":
      case "FOOTER":
        return true;
      case "HEADER":
        return String(component.format ?? "TEXT").toUpperCase() === "TEXT";
      default:
        return false;
    }
  });
}

/**
 * The template as one text message: a bold header line when there is one, then the
 * body. The footer is dropped — it is boilerplate ("Powered by …") that reads as noise
 * in a chat.
 */
export function renderTemplateAsText(
  components: unknown,
  params: readonly string[],
): string | null {
  const body = renderTemplateBody(components, params);
  if (body === null) return null;
  const header = componentsOf(components).find(
    (component) =>
      componentType(component) === "HEADER" &&
      String(component.format ?? "TEXT").toUpperCase() === "TEXT" &&
      component.text,
  );
  return header?.text ? `*${fillPlaceholders(header.text, params)}*\n\n${body}` : body;
}
