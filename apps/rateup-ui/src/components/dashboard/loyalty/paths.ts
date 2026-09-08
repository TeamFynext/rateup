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
  /** The full editors the Program sections link to for fields they do not carry yet. */
  programAdvanced: "/dashboard/loyalty/program/advanced",
  activity: "/dashboard/loyalty/activity",
  messages: "/dashboard/loyalty/messages",
  settings: "/dashboard/loyalty/settings",
  onboarding: "/dashboard/loyalty/onboarding",
} as const;
