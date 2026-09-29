import { axiosClient } from "../../apiClient";

const ROUTE_URL = "integrations/hubspot";

/** The connection as the API shows it; the tokens never leave the server. */
export type HubSpotStatus =
  | { connected: false }
  | {
      connected: true;
      portalId: number;
      hubDomain: string | null;
      connectedBy: string | null;
      connectedAt: string;
      health: { consecutiveFailures: number; lastError: string | null; lastErrorAt: string | null };
    };

export async function getHubSpotStatus() {
  return (await axiosClient.get(`${ROUTE_URL}/status`)).data as HubSpotStatus;
}
