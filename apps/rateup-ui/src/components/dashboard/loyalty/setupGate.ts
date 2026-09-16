import { LOYALTY_PATHS } from "./paths.ts";

/**
 * Which loyalty screens an unfinished programme can still open.
 *
 * Until the wizard has been through to Activate there is nothing for the running screens
 * — cashier, customers, messages, materials — to work on: no earning rule, no rewards, no
 * approved templates. Rather than showing each of them its own empty page, everything
 * outside setup is replaced with one message pointing back at the wizard.
 *
 * The three that stay open are the ones setup itself is done from: the wizard, the
 * Overview (it carries the remaining steps) and the Program page (the section editors).
 */
const SETUP_PATHS: readonly string[] = [
  LOYALTY_PATHS.onboarding,
  LOYALTY_PATHS.overview,
  LOYALTY_PATHS.program,
];

/**
 * True when this loyalty URL should be replaced by the "finish setup" message while the
 * programme is missing or still a draft. Prefix-matched on a path boundary, so
 * `/program/advanced` counts as Program but a future `/programs` would not.
 */
export function isGatedWhileUnset(pathname: string): boolean {
  return !SETUP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
