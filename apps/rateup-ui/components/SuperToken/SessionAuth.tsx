import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/router";
import Session from "supertokens-web-js/recipe/session";
import RateupLoader from "../Loaders/RateupLoader";

interface SessionAuthProps {
  children: ReactNode;
}

const SessionAuth: React.FC<SessionAuthProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const sessionExists = await Session.doesSessionExist();
      if (!sessionExists) {
        router.push("/login");
      }
      setLoading(false);
    };

    checkSession();
  }, [router]);

  if (loading) return <RateupLoader />;

  return <>{children}</>;
};

export default SessionAuth;
