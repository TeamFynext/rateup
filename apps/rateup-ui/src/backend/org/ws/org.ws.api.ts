import { axiosClient } from "../../apiClient";

const ORG_WS_BASE_PATH = "/org/ws";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const WEBSOCKET_PROTOCOL = API_URL.startsWith("https") ? "wss" : "ws";
const WEBSOCKET_URL = API_URL.replace(/(http)s?/, WEBSOCKET_PROTOCOL);

export const WA_INBOX_WEBSOCKET_CONNECTION_STRING = `${WEBSOCKET_URL}/api${ORG_WS_BASE_PATH}`;

export async function _orgWsAuthCheck() {
  return (await axiosClient.get(`${ORG_WS_BASE_PATH}/auth`)).data as {
    afterAuthId: string;
  };
}
