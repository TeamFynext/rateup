/**
 * Staff console settings, read at call time so tests (and a hot env change) are seen.
 *
 * The console is off unless STAFF_CONSOLE_ORIGIN is set: without it the plugin registers no
 * routes, so an API deployment that has not been set up for the console exposes nothing.
 *
 * The console calls the API directly (like rateup-ui), so the session cookie lives on the
 * API's host and Google redirects back to the API, which then sends the browser on to the
 * console.
 */
export interface StaffConfig {
  googleClientId: string;
  googleClientSecret: string;
  /**
   * Google Workspace domain (the `hd` claim) staff must sign in from. Not applied with
   * NODE_ENV=development; see staffSignInDomain.
   */
  googleHd: string;
  /** e.g. https://admin.rateup.app. CORS, the Origin check and post-sign-in redirects use it. */
  consoleOrigin: string;
  /**
   * The origin the console calls this API on: STAFF_API_ORIGIN, else API_URL. The Google
   * redirect URI derives from it, and it must be the host the console's cookies live on.
   * Set STAFF_API_ORIGIN locally when API_URL is a tunnel for webhooks but the console calls
   * http://localhost:3001.
   */
  apiOrigin: string;
  /** Signs the short-lived OIDC state cookie. */
  cookieSecret: string;
  cfAccessTeam: string;
  cfAccessAud: string;
  /** Verify the Cloudflare Access JWT. Turning it off in production only logs a warning. */
  cfAccessEnforced: boolean;
  /**
   * https API → Secure, `__Host-` prefixed, SameSite=None cookies (the console may be on
   * another site). A plain-http localhost gets none of that; localhost ports are same-site.
   */
  secureCookies: boolean;
  /**
   * NODE_ENV was exactly "development" when the config was read. Production does not set
   * NODE_ENV at all, so anything else (including unset) counts as not local.
   */
  development: boolean;
}

export function staffConfig(): StaffConfig {
  const consoleOrigin = (process.env.STAFF_CONSOLE_ORIGIN ?? "").replace(/\/+$/, "");
  const apiOrigin = (process.env.STAFF_API_ORIGIN || process.env.API_URL || "").replace(/\/+$/, "");
  return {
    development: process.env.NODE_ENV === "development",
    googleClientId: process.env.STAFF_GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.STAFF_GOOGLE_CLIENT_SECRET ?? "",
    googleHd: (process.env.STAFF_GOOGLE_HD ?? "rateup.app").toLowerCase(),
    consoleOrigin,
    apiOrigin,
    cookieSecret: process.env.STAFF_COOKIE_SECRET ?? "",
    cfAccessTeam: process.env.CF_ACCESS_TEAM ?? "",
    cfAccessAud: process.env.CF_ACCESS_AUD ?? "",
    cfAccessEnforced: process.env.STAFF_CF_ACCESS_ENFORCE !== "false",
    secureCookies: apiOrigin.startsWith("https://"),
  };
}

export function isStaffConsoleEnabled(config: StaffConfig = staffConfig()): boolean {
  return config.consoleOrigin !== "";
}

/**
 * Called once when the plugin registers. A console that is switched on but half-configured
 * fails the boot rather than serving a login that cannot work (or, worse, one without the
 * Cloudflare Access check).
 */
export function assertStaffConfig(config: StaffConfig = staffConfig()): void {
  const required: Array<[string, string]> = [
    ["STAFF_GOOGLE_CLIENT_ID", config.googleClientId],
    ["STAFF_GOOGLE_CLIENT_SECRET", config.googleClientSecret],
    ["STAFF_API_ORIGIN or API_URL", config.apiOrigin],
    ["STAFF_COOKIE_SECRET", config.cookieSecret],
  ];
  if (config.cfAccessEnforced) {
    required.push(["CF_ACCESS_TEAM", config.cfAccessTeam], ["CF_ACCESS_AUD", config.cfAccessAud]);
  }
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `Staff console is enabled (STAFF_CONSOLE_ORIGIN) but missing: ${missing.join(", ")}`,
    );
  }
  if (config.cookieSecret.length < 32) {
    throw new Error("STAFF_COOKIE_SECRET must be at least 32 characters");
  }
}

/**
 * The Google Workspace domain staff must sign in from and be added with, or null for any
 * verified Google account. Null only with NODE_ENV=development, so a local console can be
 * used with a personal address (still only one on the staff list). Production does not set
 * NODE_ENV, so it always gets STAFF_GOOGLE_HD.
 */
export function staffSignInDomain(config: StaffConfig): string | null {
  return config.development ? null : config.googleHd;
}

export function sessionCookieName(config: StaffConfig): string {
  return config.secureCookies ? "__Host-rateup_staff" : "rateup_staff";
}

export function oidcCookieName(config: StaffConfig): string {
  return config.secureCookies ? "__Host-staff_oidc" : "staff_oidc";
}

export function googleRedirectUri(config: StaffConfig): string {
  return `${config.apiOrigin}/api/staff/auth/google/callback`;
}
