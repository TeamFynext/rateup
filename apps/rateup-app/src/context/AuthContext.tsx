import { createContext, useContext, useEffect, useState } from "react";
import { checkAuth } from "../utils/checkAuth";
import AsyncStorage from "@react-native-async-storage/async-storage"

type AuthContextType = {
    isAuthenticated: boolean | null;
    loading: boolean;
    setIsAuthenticated: (value:boolean) => void;
    userId:string | null,
    setUserId : (id:string | null) => void;

}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: null,
    loading: true,
    setIsAuthenticated: () => {},
    setUserId:()=>{},
    userId:null
});

export const AuthProvider = ({children}:{children: React.ReactNode}) => {
    const [ isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(()=>{
        const checkUserAuth = async () => {
            try {
                const authStatus = await checkAuth();
                setIsAuthenticated(authStatus);
                const storedUserId = await AsyncStorage.getItem("userId");
                setUserId(storedUserId);
            } catch (error) {
                console.error("Error checking authentication:", error);
                setIsAuthenticated(false);
                setUserId(null)
            } finally {
                setLoading(false);
            }
        };

        checkUserAuth();
    }, []);
    
    return (
        <AuthContext.Provider value={{ isAuthenticated, loading, setIsAuthenticated, userId,setUserId }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);