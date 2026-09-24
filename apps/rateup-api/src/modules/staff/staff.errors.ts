/**
 * The one error shape of /api/staff: `{ code, message }`. The console branches on `code`
 * (UNAUTHENTICATED → login, REAUTH_REQUIRED → step-up), never on the message.
 */
export class StaffHttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string = code,
  ) {
    super(message);
    this.name = "StaffHttpError";
  }

  toBody() {
    return { code: this.code, message: this.message };
  }
}

export const unauthenticated = (message = "Sign in to the staff console.") =>
  new StaffHttpError(401, "UNAUTHENTICATED", message);

export const forbidden = (code: string, message: string) => new StaffHttpError(403, code, message);

/** Looks exactly like a route that does not exist, so a probe learns nothing. */
export const notFound = () => new StaffHttpError(404, "NOT_FOUND", "Not Found");
