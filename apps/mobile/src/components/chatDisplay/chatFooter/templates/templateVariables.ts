/**
 * Body variables of a WhatsApp template (`{{1}}`, `{{2}}` or named `{{first_name}}`):
 * finding them, previewing the text with values filled in, and building the
 * `parameterData` the send endpoint takes.
 *
 * The API fills any blank body value from the template's own example, so a
 * variable only has to be typed when the template has no example for it.
 */

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

export type TemplateVariable = {
  /** What sits between the braces: "1", "2" or a name. */
  key: string;
  /** The template's example value, sent when the field is left blank. */
  example: string;
};

export type PreviewSegment = { text: string; variable?: string; filled?: boolean };

type Component = { type?: string; text?: string; example?: any; [k: string]: any };

const isPositional = (key: string) => /^\d+$/.test(key);

export function getBodyComponent(components: Component[] | undefined) {
  return components?.find((c) => c?.type?.toUpperCase() === "BODY");
}

/** The example values, from either `body_text: [[…]]` or the flat `body_text: […]`. */
function bodyExamples(body: Component | undefined): {
  positional: string[];
  named: Record<string, string>;
} {
  const raw = body?.example?.body_text;
  const positional: string[] = Array.isArray(raw?.[0]) ? raw[0] : Array.isArray(raw) ? raw : [];
  const named: Record<string, string> = {};
  for (const p of body?.example?.body_text_named_params ?? []) {
    if (p?.param_name) named[p.param_name] = String(p.example ?? "");
  }
  return { positional: positional.map((v) => String(v ?? "")), named };
}

/** Each distinct variable in the body, numbered ones in order. */
export function getBodyVariables(components: Component[] | undefined): TemplateVariable[] {
  const body = getBodyComponent(components);
  const text = body?.text ?? "";
  const keys: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (!keys.includes(match[1])) keys.push(match[1]);
  }
  if (keys.every(isPositional)) keys.sort((a, b) => Number(a) - Number(b));

  const examples = bodyExamples(body);
  return keys.map((key, i) => ({
    key,
    example: isPositional(key)
      ? (examples.positional[Number(key) - 1] ?? "")
      : (examples.named[key] ?? examples.positional[i] ?? ""),
  }));
}

/** Variables that are blank and have no example to fall back on. */
export function getMissingVariables(
  variables: TemplateVariable[],
  values: Record<string, string>,
): TemplateVariable[] {
  return variables.filter((v) => !values[v.key]?.trim() && !v.example);
}

/**
 * Splits `text` around its placeholders. A placeholder shows the typed value,
 * else the example, else stays as `{{key}}`; `filled` says whether one was typed.
 */
export function fillPlaceholders(
  text: string,
  variables: TemplateVariable[],
  values: Record<string, string>,
): PreviewSegment[] {
  const segments: PreviewSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: text.slice(last, index) });
    const key = match[1];
    const typed = values[key]?.trim();
    const example = variables.find((v) => v.key === key)?.example;
    segments.push({ text: typed || example || `{{${key}}}`, variable: key, filled: !!typed });
    last = index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

/** The `parameterData` for the send call; empty when the body has no variables. */
export function buildBodyParameterData(
  variables: TemplateVariable[],
  values: Record<string, string>,
) {
  if (variables.length === 0) return [];
  return [
    {
      type: "body",
      parameters: variables.map((v) => ({
        type: "text",
        // Blank is fine: the API falls back to the template's example.
        text: values[v.key]?.trim() ?? "",
        ...(isPositional(v.key) ? {} : { parameter_name: v.key }),
      })),
    },
  ];
}

/** One line of the body for the template list, with variables shown as examples. */
export function bodySnippet(components: Component[] | undefined): string {
  const body = getBodyComponent(components);
  if (!body?.text) return "";
  const variables = getBodyVariables(components);
  return fillPlaceholders(body.text, variables, {})
    .map((s) => s.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
