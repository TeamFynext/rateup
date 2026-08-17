import { renderContactFormEmail } from "./react/templates.js";

export function emailBodyContactForm(name: string, email: string, message: string) {
  return renderContactFormEmail({ name, email, message });
}
