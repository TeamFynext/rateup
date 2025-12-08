"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "supertokens-auth-react/recipe/session";

import { useChatFilterStore } from "@/components/whatsapp/inbox/chatselect/chatFilter";

import { useContactsStore, useMessagesStore } from "../dashboard/inbox/store";

export default function Logout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAllContacts } = useContactsStore();
  const { clearMessages } = useMessagesStore();
  const { clearFilter } = useChatFilterStore();

  useEffect(() => {
    async function handleLogout() {
      if (typeof window !== "undefined") {
        try {
          localStorage.clear();
          queryClient.clear();
          await clearMessages();
          await clearAllContacts();
          clearFilter();
          await signOut();
          router.push("/login");
        } catch (error) {
          // Optionally handle error (e.g., show notification)
        }
      }
    }

    handleLogout();
  }, [router, queryClient]);

  return null;
}
