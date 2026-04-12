"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "supertokens-auth-react/recipe/session";

import { useChatFilterStore } from "@/components/whatsapp/inbox/chatselect/chatFilter";

import {
  useContactsStore,
  useMessagesStore,
} from "../../dashboard/inbox/store";
import { resetBrowserQueryClient } from "../../providers";

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
          // Cancel all in-flight queries first to prevent stale requests
          // from completing after the session is destroyed and racing
          // with a new user's login session.
          await queryClient.cancelQueries();
          queryClient.clear();
          await signOut();
          clearFilter();
          await clearMessages();
          await clearAllContacts();
          localStorage.clear();
          resetBrowserQueryClient();
          router.replace("/login");
        } catch (error) {
          // Optionally handle error (e.g., show notification)
        }
      }
    }
    handleLogout();
  }, [router, queryClient]);

  return null;
}
