import { WA_INBOX_BASE_PATH } from "..";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WA_INBOX_WEBSOCKET_PATH = `${WA_INBOX_BASE_PATH}/ws`;
const WA_INBOX_MESSAGE_WEBSOCKET_PATH = `${WA_INBOX_WEBSOCKET_PATH}/message`;

const WEBSOCKET_PROTOCOL = API_URL.startsWith("https") ? "wss" : "ws";
const WEBSOCKET_URL = API_URL.replace(/(http)s?/, WEBSOCKET_PROTOCOL);

export const WA_INBOX_WEBSOCKET_CONNECTION_STRING = `${WEBSOCKET_URL}/api${WA_INBOX_MESSAGE_WEBSOCKET_PATH}`;
