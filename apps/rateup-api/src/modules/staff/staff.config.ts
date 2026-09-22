/**
 * Staff console settings, read at call time so tests (and a hot env change) are seen.
 *
 * The console is off unless STAFF_PROXY_SECRET is set: without it the plugin registers no
 * routes, so an API deployment that has not been set up for the console exposes nothing.
 */
export interface StaffConfig {
  googleClientId: string;
  googleClientSecret: string;
  /** Google Workspace domain (the `hd` claim) staff must sign in from. */
  googleHd: string;
  /** e.g. https://admin.rateup.app. The Google redirect URI and the Origin check derive from it. */
  consoleOrigin: string;
  /** Shared with the console's same-origin proxy (Cloudflare Pages Function, or Vite in dev). */
  proxySecret: string;
  /** Signs the short-lived OIDC state cookie. */
  cookieSecret: string;
  cfAccessTeam: string;
  cfAccessAud: string;
  /** Verify the Cloudflare Access JWT. Only a non-production API may turn this off. */
  cfAccessEnforced: boolean;
  /** https console → Secure, `__Host-` prefixed cookies. A plain-http localhost gets neither. */
  secureCookies: boolean;
}

export function staffConfig(): StaffConfig {
  const consoleOrigin = (process.env.STAFF_CONSOLE_ORIGIN ?? "").replace(/\/+$/, "");
  return {
    googleClientId: process.env.STAFF_GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.STAFF_GOOGLE_CLIENT_SECRET ?? "",
    googleHd: (process.env.STAFF_GOOGLE_HD ?? "rateup.app").toLowerCase(),
    consoleOrigin,
    proxySecret: process.env.STAFF_PROXY_SECRET ?? "",
    cookieSecret: process.env.STAFF_COOKIE_SECRET ?? "",
    cfAccessTeam: process.env.CF_ACCESS_TEAM ?? "",
    cfAccessAud: process.env.CF_ACCESS_AUD ?? "",
    cfAccessEnforced: process.env.STAFF_CF_ACCESS_ENFORCE !== "false",
    secureCookies: consoleOrigin.startsWith("https://"),
  };
}

export function isStaffConsoleEnabled(config: StaffConfig = staffConfig()): boolean {
  return config.proxySecret !== "";
}

/**
 * Called once when the plugin registers. A console that is switched on but half-configured
 * fails the boot rather than serving a login that cannot work (or, worse, one without the
 * Cloudflare Access check).
 */
export function assertStaffConfig(config: StaffConfig = staffConfig()): void {
  if (!config.cfAccessEnforced && process.env.NODE_ENV === "production") {
    throw new Error("STAFF_CF_ACCESS_ENFORCE=false is not allowed when NODE_ENV=production");
  }

  const required: Array<[string, string]> = [
    ["STAFF_GOOGLE_CLIENT_ID", config.googleClientId],
    ["STAFF_GOOGLE_CLIENT_SECRET", config.googleClientSecret],
    ["STAFF_CONSOLE_ORIGIN", config.consoleOrigin],
    ["STAFF_COOKIE_SECRET", config.cookieSecret],
  ];
  if (config.cfAccessEnforced) {
    required.push(["CF_ACCESS_TEAM", config.cfAccessTeam], ["CF_ACCESS_AUD", config.cfAccessAud]);
  }
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `Staff console is enabled (STAFF_PROXY_SECRET) but missing: ${missing.join(", ")}`,
    );
  }
  if (config.cookieSecret.length < 32) {
    throw new Error("STAFF_COOKIE_SECRET must be at least 32 characters");
  }
}

export function sessionCookieName(config: StaffConfig): string {
  return config.secureCookies ? "__Host-rateup_staff" : "rateup_staff";
}

export function oidcCookieName(config: StaffConfig): string {
  return config.secureCookies ? "__Host-staff_oidc" : "staff_oidc";
}

export function googleRedirectUri(config: StaffConfig): string {
  return `${config.consoleOrigin}/api/staff/auth/google/callback`;
}
