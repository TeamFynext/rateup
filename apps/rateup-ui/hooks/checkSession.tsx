import { useState, useEffect } from "react";
import { useRouter } from 'next/router';

import Session from 'supertokens-web-js/recipe/session';

export const useCheckSession = () => {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (await Session.doesSessionExist()) {
          console.log("session exists");
          router.push('/dashboard');
        } else {
          console.log("session does not exist");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  return isLoading;
};