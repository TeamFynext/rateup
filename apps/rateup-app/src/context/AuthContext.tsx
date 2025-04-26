import { createContext, useContext, useEffect, useState } from "react";
import { checkAuth } from "../utils/checkAuth";
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "../config/axios";

type AuthContextType = {
    isAuthenticated: boolean | null;
    loading: boolean;
    setIsAuthenticated: (value:boolean) => void;
    userData:any | null

}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: null,
    loading: true,
    setIsAuthenticated: () => {},
    userData:null
});

export const AuthProvider = ({children}:{children: React.ReactNode}) => {
    const [ isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any | null>(null);

    useEffect(()=>{
        const checkUserAuth = async () => {
            try {
                const authStatus = await checkAuth();
                const userData = await axios.get("/api/user/info")
                setIsAuthenticated(authStatus);
                setUserData(userData.data.data);
            } catch (error) {
                console.error("Error checking authentication:", error);
                setIsAuthenticated(false);
                setUserData(null)
            } finally {
                setLoading(false);
            }
        };

        checkUserAuth();
    }, []);
    
    return (
        <AuthContext.Provider value={{ isAuthenticated, loading, setIsAuthenticated, userData }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);