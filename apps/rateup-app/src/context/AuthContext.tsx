import { createContext, useContext, useEffect, useState } from "react";
import { checkAuth } from "../utils/checkAuth";

type AuthContextType = {
    isAuthenticated: boolean | null;
    loading: boolean;
    setIsAuthenticated: (value:boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: null,
    loading: true,
    setIsAuthenticated: () => {},
});

export const AuthProvider = ({children}:{children: React.ReactNode}) => {
    const [ isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        const checkUserAuth = async () => {
            try {
                const authStatus = await checkAuth();
                setIsAuthenticated(authStatus);
            } catch (error) {
                console.error("Error checking authentication:", error);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkUserAuth();
    }, []);
    
    return (
        <AuthContext.Provider value={{ isAuthenticated, loading, setIsAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);