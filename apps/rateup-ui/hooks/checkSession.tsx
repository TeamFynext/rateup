// import { useCallback, useEffect, useState } from "react";
// import { usePathname, useRouter } from "next/navigation";

// import Session from "supertokens-auth-react/recipe/session";

// export const useCheckSession = () => {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [doesSessionExist, setDoesSessionExist] = useState(false);
//   const checkSession = useCallback(async () => {
//     try {
//       if (!pathname) return;
//       const doesSessionExist = await Session.doesSessionExist();
//       if (["/login", "/signup"].includes(pathname) && doesSessionExist) {
//         router.push("/dashboard");
//       }
//       setDoesSessionExist(doesSessionExist);
//     } catch (error) {
//       setDoesSessionExist(false);
//     }
//   }, [pathname, router]);

//   useEffect(() => {
//     checkSession();
//   }, [checkSession]);

//   return doesSessionExist;
// };

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Session from "supertokens-auth-react/recipe/session";

export const useCheckSession = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");

  const [doesSessionExist, setDoesSessionExist] = useState(false);
  const checkSession = useCallback(async () => {
    try {
      if (!pathname) return;
      if (auth === "google") return;
      const doesSessionExist = await Session.doesSessionExist();
      if (["/login", "/signup"].includes(pathname) && doesSessionExist) {
        router.push("/dashboard");
      }
      setDoesSessionExist(doesSessionExist);
    } catch (error) {
      setDoesSessionExist(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return doesSessionExist;
};
