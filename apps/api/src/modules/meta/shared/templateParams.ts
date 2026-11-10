/**
 * Meta refuses a template whose text parameter holds a new line, a tab or more than four
 * spaces in a row (error 132018, "Param text cannot have new-line/tab characters or more
 * than 4 consecutive spaces"). Values come from contact fields, imports and the inbox, so
 * any of them can carry one. Each such run becomes a single space before the send.
 */
export function cleanTemplateParamText(text: string): string {
  return text.replace(/\s*[\r\n\t]+\s*/g, " ").replace(/ {5,}/g, " ");
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null;

/** Cleans every `{ type: "text", text }` parameter, including those inside carousel cards. */
function cleanComponents(components: unknown): unknown {
  if (!Array.isArray(components)) return components;
  return components.map((component) => {
    if (!isObject(component)) return component;
    const next: Json = { ...component };
    if (Array.isArray(component.parameters)) {
      next.parameters = component.parameters.map((p) =>
        isObject(p) && p.type === "text" && typeof p.text === "string"
          ? { ...p, text: cleanTemplateParamText(p.text) }
          : p,
      );
    }
    if (Array.isArray(component.cards)) {
      next.cards = component.cards.map((card) =>
        isObject(card) ? { ...card, components: cleanComponents(card.components) } : card,
      );
    }
    return next;
  });
}

/** Returns the message with its template text parameters cleaned; any other message as is. */
export function cleanTemplateTextParams<T>(message: T): T {
  if (!isObject(message) || message.type !== "template" || !isObject(message.template)) {
    return message;
  }
  if (!Array.isArray(message.template.components)) return message;
  return {
    ...message,
    template: { ...message.template, components: cleanComponents(message.template.components) },
  } as T;
}
