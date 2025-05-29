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
const WS_URL = `${WEBSOCKET_URL}/api${ORG_WS_BASE_PATH}`;

const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [wsData, setWsData] = useState<orgWsMessage>({} as orgWsMessage);
  const { isAuthenticated } = useAuth();

  const { data, error } = useOrgWsAuthCheck(isAuthenticated);

  const connectionRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryIntervalRef = useRef(1000); // 1s, exponential backoff

  const connectWebSocket = () => {
    if (
      connectionRef.current ||
      !isAuthenticated ||
      !data?.afterAuthId ||
      error
    ) {
      return;
    }

    const socket = new WebSocket(`${WS_URL}/${data.afterAuthId}`);
    connectionRef.current = socket;

    socket.onopen = () => {
      console.log("📡 WebSocket connected");
      retryIntervalRef.current = 1000;
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setWsData(message);
      } catch (err) {
        console.error("❌ Error parsing WebSocket message:", err);
      }
    };

    socket.onclose = () => {
      console.log("🔌 WebSocket disconnected");

      if (connectionRef.current === socket) {
        connectionRef.current = null;
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        retryIntervalRef.current = Math.min(
          retryIntervalRef.current * 2,
          30000
        );
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, data?.afterAuthId, error]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        connectionRef.current?.readyState !== WebSocket.OPEN &&
        isAuthenticated
      ) {
        console.log("🔁 Reconnecting WebSocket on app resume");
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
