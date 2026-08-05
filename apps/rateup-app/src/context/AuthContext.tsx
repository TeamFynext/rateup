import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkAuth } from "../utils/checkAuth";
import { loggedUserDetails } from "../api/api";

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
  setIsAuthenticated: () => { },
  userId: null,
  setUserId: () => { },
  orgId: null,
  setOrgId: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<any | null>(null);
  const [orgId, setOrgId] = useState<any | null>(null);

  useEffect(() => {
    const checkUserAuth = async () => {
      try {
        const authStatus = await checkAuth();
        setIsAuthenticated(authStatus);
        if (authStatus) {
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
            } catch (e) {
              // Ignore cache write errors
            }
          } catch (apiError: any) {
            console.error("Error fetching user details:", apiError);
            if (apiError.message === "Network Error" || apiError.code === "ERR_NETWORK") {
              // Fallback to cache
              const cachedUserId = await AsyncStorage.getItem("cachedUserId");
              const cachedOrgId = await AsyncStorage.getItem("cachedOrgId");
              if (cachedUserId && cachedOrgId) {
                setUserId(cachedUserId);
                setOrgId(cachedOrgId);
              } else {
                // No cache available, we have to log out
                setIsAuthenticated(false);
              }
            } else {
              setIsAuthenticated(false);
              setUserId(null);
              setOrgId(null);
            }
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
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
