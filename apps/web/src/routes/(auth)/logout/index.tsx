import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { signOut } from "supertokens-auth-react/recipe/session";

import { useChatFilterStore } from "@/store/chat-filter.store.ts";
import { useContactsStore, useMessagesStore } from "@/store/inbox.store.ts";
import { forgetEmailVerification } from "@/utils/auth/emailVerification.ts";

import { resetBrowserQueryClient } from "../../../components/providers.tsx";

export const Route = createFileRoute("/(auth)/logout/")({
  component: Logout,
});

function Logout(): null {
  const navigate = useNavigate();
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
          // The next sign-in at this tab may be an unverified account; without this it
          // would inherit this session's "verified" answer and skip the verify page.
          forgetEmailVerification();
          clearFilter();
          await clearMessages();
          await clearAllContacts();
          localStorage.clear();
          resetBrowserQueryClient();
          navigate({
            to: "/login",
            replace: true,
          });
        } catch {
          // Optionally handle error (e.g., show notification)
        }
      }
    }
    handleLogout();
  }, [queryClient]);

  return null;
}
