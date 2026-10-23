import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkAuth } from "../utils/checkAuth";
import { loggedUserDetails } from "../api/api";
import { logger } from "@/utils/logger";
import { clearLocalUserData, LEGACY_ACCESS_TOKEN_KEY } from "@/utils/clearLocalData";

type AuthContextType = {
  isAuthenticated: boolean;
  loading: boolean;
  setIsAuthenticated: (value: boolean) => void;
  userId: string | null;
  setUserId: (value: string) => void;
  orgId: string | null;
  setOrgId: (value: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  setIsAuthenticated: () => {},
  userId: null,
  setUserId: () => {},
  orgId: null,
  setOrgId: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<any | null>(null);
  const [orgId, setOrgId] = useState<any | null>(null);

  useEffect(() => {
    // Drops every trace of the account from the device and marks the provider signed out,
    // which makes the protected layout redirect to sign-in. Used when the device holds no
    // valid session: a `rateup://` link or a restored app must not reopen the previous
    // account's cached contacts and messages.
    const endLocalSession = async () => {
      setIsAuthenticated(false);
      setUserId(null);
      setOrgId(null);
      await clearLocalUserData();
    };

    const checkUserAuth = async () => {
      try {
        // Older builds copied the access token here as well; nothing reads it now.
        AsyncStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY).catch(() => {});

        if (!(await checkAuth())) {
          await endLocalSession();
          return;
        }
        setIsAuthenticated(true);

        try {
          const userDetails = await loggedUserDetails();
          const userData = userDetails.data;
          const { userId, orgId } = userData;
          setUserId(userId);
          setOrgId(orgId);

          // Cache for offline mode
          try {
            await AsyncStorage.setItem("cachedUserId", userId);
            await AsyncStorage.setItem("cachedOrgId", orgId);
          } catch {
            // Ignore cache write errors
          }
        } catch (apiError: any) {
          logger.error("Error fetching user details:", apiError);
          // A rejected session surfaces here: SuperTokens tries a refresh, fails, and
          // clears its tokens. Anything else (offline, a 5xx, a suspended org, which the
          // axios interceptor routes on its own) leaves the session standing.
          if (!(await checkAuth())) {
            await endLocalSession();
            return;
          }
          const cachedUserId = await AsyncStorage.getItem("cachedUserId");
          const cachedOrgId = await AsyncStorage.getItem("cachedOrgId");
          if (cachedUserId && cachedOrgId) {
            setUserId(cachedUserId);
            setOrgId(cachedOrgId);
          }
        }
      } catch (error) {
        logger.error("Error checking authentication:", error);
        setIsAuthenticated(false);
        setUserId(null);
        setOrgId(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        setIsAuthenticated,
        userId,
        setUserId,
        orgId,
        setOrgId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
