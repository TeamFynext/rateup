"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Session from "supertokens-auth-react/recipe/session";

import { checkEmailVerification } from "../../utils/auth/checkEmailVerification";
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
      } else {
        checkEmailVerification();
      }
      setLoading(false);
    };

    checkSession();
  }, [router]);

  if (loading) return <RateupLoader h={"100dvh"} />;

  return <>{children}</>;
};

export default SessionAuth;
