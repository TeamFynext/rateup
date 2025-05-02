import { createContext, useContext, useEffect, useState } from "react";
import { checkAuth } from "../utils/checkAuth";
import { loggedUserDetails } from "../api/api";

type AuthContextType = {
  isAuthenticated: boolean | null;
  loading: boolean;
  setIsAuthenticated: (value: boolean) => void;
  userId: string | null;
  setUserId: (value: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: null,
  loading: true,
  setIsAuthenticated: () => {},
  userId: null,
  setUserId: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<any | null>(null);

  useEffect(() => {
    const checkUserAuth = async () => {
      try {
        const authStatus = await checkAuth();
        setIsAuthenticated(authStatus);
        if (authStatus) {
          const userDetails = await loggedUserDetails();
          const userData = userDetails.data;
          const { userId } = userData;
          setUserId(userId);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
        setUserId(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
