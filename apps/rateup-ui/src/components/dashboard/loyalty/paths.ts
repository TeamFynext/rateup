/**
 * Where each loyalty screen lives. The sidebar, the Overview's suggestions and every
 * cross-link read from here, so a moved route is one edit.
 */
export const LOYALTY_PATHS = {
  overview: "/dashboard/loyalty/dashboard",
  cashier: "/dashboard/loyalty/cashier",
  /** The sidebar-less staff-device variant of the cashier. */
  cashierStandalone: "/cashier",
  customers: "/dashboard/loyalty/customers",
  program: "/dashboard/loyalty/program",
  /** Redirects to `program?section=`; the sections show the full editors themselves now. */
  programAdvanced: "/dashboard/loyalty/program/advanced",
  activity: "/dashboard/loyalty/activity",
  messages: "/dashboard/loyalty/messages",
  /** The editor behind each loyalty template; the library itself is Messages › Templates. */
  templates: "/dashboard/loyalty/templates",
  /** Print-ready pieces: the join QR card and the rewards brochure. */
  materials: "/dashboard/loyalty/materials",
  settings: "/dashboard/loyalty/settings",
  onboarding: "/dashboard/loyalty/onboarding",
} as const;
