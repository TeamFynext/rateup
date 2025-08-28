"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "supertokens-web-js/recipe/session";

export default function Logout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    async function handleLogout() {
      if (typeof window !== "undefined") {
        return new Promise<void>((resolve, reject) => {
          try {
            localStorage.clear();
            queryClient.clear();
            resolve();
          } catch (error) {
            reject(error);
          }
        }).then(async () => {
          await signOut();
          router.push("/login");
        });
      }
    }

    handleLogout();
  }, [router]);

  return null;
}
