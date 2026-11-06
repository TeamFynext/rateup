import type { ReactElement } from "react";
import { render } from "react-email";

/**
 * Turn an email template into the HTML string `sendAWSEmail` expects.
 *
 * Rendering is asynchronous, so anything building a message has to await it —
 * the old string-template helpers were synchronous.
 */
export function renderEmail(element: ReactElement): Promise<string> {
  return render(element);
}

/**
 * The same template as plain text, for the multipart alternative. Deriving it
 * from the template keeps the two bodies from drifting apart.
 */
export function renderEmailText(element: ReactElement): Promise<string> {
  return render(element, { plainText: true });
}
