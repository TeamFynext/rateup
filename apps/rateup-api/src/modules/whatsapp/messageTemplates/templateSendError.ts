/**
 * A template send refused because of the template's own setup, before anything reached
 * Meta: a media header with no media, a FLOW button whose flow or team mapping is missing,
 * a catalog that is not linked to the sending number.
 *
 * It is a plain `Error` subclass with the same messages these paths always threw, so every
 * dashboard caller that sends `error.message` back behaves exactly as before. `reason` is
 * there for callers that need to tell these apart from a crash — the partner API turns them
 * into a 422 instead of a 500. `name` is deliberately left as "Error".
 */
export type TemplateSendErrorReason =
  | "header_media_missing"
  | "flow_not_found"
  | "flow_team_not_linked"
  | "catalog_not_linked";

export class TemplateSendError extends Error {
  constructor(
    readonly reason: TemplateSendErrorReason,
    message: string,
  ) {
    super(message);
  }
}
