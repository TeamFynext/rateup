// Apart from `dashboard.query.ts` so the Overview route's search validator can read it
// without pulling the API client into the client entry.
export const DASHBOARD_PERIODS = ["30d", "90d", "12m"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
