import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

import type { WaAssignedChatPermission } from "@/types/enums.ts";
import type { orgWsMessage } from "@/types/global";
import type { UserAvailabilityStatus } from "@/backend/user/user.api";

export interface User {
  role: string;
  userId: string;
  userName: string;
  email: string;
  profilePhoto: string;
  orgId: string;
  orgName: string;
  orgLogo: string;
  orgPhone: string;
  orgAddress: string;
  teams: Array<string>;
  encryptionKeys: {
    publicKey: string;
    privateKey: string;
  };
  waAssignedChatPermission: WaAssignedChatPermission;
  status: UserAvailabilityStatus;
  onboarding?: any;
  showLifecycle: boolean;
}

interface UserContextProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  wsData: orgWsMessage;
  setWsData: React.Dispatch<React.SetStateAction<orgWsMessage>>;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wsData, setWsData] = useState<orgWsMessage>({} as orgWsMessage);

  return (
    <UserContext.Provider value={{ user, setUser, wsData, setWsData }}>
      {children}
    </UserContext.Provider>
  );
};

const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

const useWsData = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useWsData must be used within a UserProvider");
  }
  return { wsData: context.wsData, setWsData: context.setWsData };
};

export { UserProvider, useUser };
