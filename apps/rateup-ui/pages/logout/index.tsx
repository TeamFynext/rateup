import { useEffect } from "react";
import { useRouter } from "next/router";
import { signOut } from "supertokens-web-js/recipe/session";

export default function Logout() {
    const router = useRouter();
  
    useEffect(() => {
      async function handleLogout() {
        await signOut();
        router.push("/login");
      }
  
      handleLogout();
    }, [router]);
  
    return null;
  }
  