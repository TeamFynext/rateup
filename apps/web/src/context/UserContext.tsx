import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

import type { UserAvailabilityStatus } from "@/backend/user/user.api";
import type { WaAssignedChatPermission } from "@/types/enums.ts";
import type { orgWsMessage } from "@/types/global";

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
  encryptionKeys?: {
    publicKey: string;
    privateKey: string;
  };
  waAssignedChatPermission: WaAssignedChatPermission;
  status: UserAvailabilityStatus;
  /** The signup wizard's saved answers — free-form JSON on the org row. */
  onboarding?: {
    location?: string;
    website?: string;
    industry?: string;
    businessmail?: string;
    [key: string]: unknown;
  };
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

export { UserProvider, useUser };
