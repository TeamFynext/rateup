import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { orgWsMessage } from "./type";
import { useOrgWsAuthCheck } from "../api/inbox/messages/message.query";
import { useAuth } from "./AuthContext";

interface UserContextProps {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  wsData: orgWsMessage;
  setWsData: React.Dispatch<React.SetStateAction<orgWsMessage>>;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

const ORG_WS_BASE_PATH = "/org/ws";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
const WEBSOCKET_PROTOCOL = API_URL.startsWith("https") ? "wss" : "ws";
const WEBSOCKET_URL = API_URL.replace(/(http)s?/, WEBSOCKET_PROTOCOL);
const WA_INBOX_WEBSOCKET_CONNECTION_STRING = `${WEBSOCKET_URL}/api${ORG_WS_BASE_PATH}`;

const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [wsData, setWsData] = useState<orgWsMessage>({} as orgWsMessage);
  const { isAuthenticated } = useAuth();

  // Pass isAuthenticated as `enabled` to the query to fetch only when authenticated
  const { data, error } = useOrgWsAuthCheck();

  const connectionRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryIntervalRef = useRef(1000); // Start with 1s

  const connectWebSocket = () => {
    if (!isAuthenticated) return; // Don't connect if not authenticated
    if (!data?.afterAuthId || error) return;

    const socket = new WebSocket(
      `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${data.afterAuthId}`
    );

    connectionRef.current = socket;

    socket.onopen = () => {
      console.log("📡 WebSocket connected");
      retryIntervalRef.current = 1000; // Reset backoff

      // Heartbeat ping every 30 seconds
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    socket.onmessage = (event) => {
      try {
        const newMessage = JSON.parse(event.data);
        setWsData(newMessage);
      } catch (e) {
        console.error("❌ WebSocket message parse error:", e);
      }
    };

    socket.onclose = () => {
      console.log("🔌 WebSocket disconnected");
      if (connectionRef.current === socket) connectionRef.current = null;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Retry with exponential backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        retryIntervalRef.current = Math.min(retryIntervalRef.current * 2, 30000);
        connectWebSocket();
      }, retryIntervalRef.current);
    };

    socket.onerror = (err) => {
      console.error("💥 WebSocket error:", err);
    };
  };

  useEffect(() => {
    if (isAuthenticated && data?.afterAuthId && !error) {
      connectWebSocket();
    }

    return () => {
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, data?.afterAuthId]);

  // Reconnect when app resumes from background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        connectionRef.current?.readyState !== WebSocket.OPEN &&
        isAuthenticated
      ) {
        console.log("🔁 Reconnecting WebSocket after resume");
        connectWebSocket();
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated]);

  return (
    <UserContext.Provider value={{ user, setUser, wsData, setWsData }}>
      {children}
    </UserContext.Provider>
  );
};

const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

const useWsData = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useWsData must be used within a UserProvider");
  }
  return { wsData: context.wsData, setWsData: context.setWsData };
};

export { UserProvider, useUser, useWsData };
