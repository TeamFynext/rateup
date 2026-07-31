import { IconArrowAutofitLeft } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { signOut } from "supertokens-auth-react/recipe/session";

import { completeInvite } from "@/backend/team/team.api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { rateupLogoStackedWhiteTransparent } from "@/utils/constants";

import styles from "../../../components/(auth)/invite/styles.module.css";

export const Route = createFileRoute("/(auth)/invite/")({
  /** Declares the search params this route reads, so they arrive typed. */
  validateSearch: (search: Record<string, unknown>): { type?: string; token?: string } => ({
    type: typeof search.type === "string" ? search.type : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: Invite,
});

function Invite() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const type = searchParams.type;
  const token = searchParams.token;

  const { t: translations } = useTranslation();
  let title = "";
  if (type === "team") title = "Team";
  else if (type === "org") title = "Organization";

  const acceptInvite = async () => {
    const inviteToken = token ?? "";
    await signOut();
    return completeInvite(inviteToken);
  };

  const updateInviteMutation = useMutation({
    mutationFn: () => acceptInvite(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] }); // update team list on add
      toast.success(translations("Invite Accepted successfully."), {
        id: "load-data",
      });
    },

    onError: (error: Error) => {
      console.error("Error:", error.message);
      toast.error(error.message, {
        id: "load-data",
      });
    },
  });

  useEffect(() => {
    if (type === "team" && token) {
      toast.loading(translations("Hold on, while validating your invite."), {
        id: "load-data",
      });
      setTimeout(() => {
        if (!updateInviteMutation.data) updateInviteMutation.mutate();
      }, 2000);
    }
    // TODO : improve with org invite
  }, [type, token]);

  useEffect(() => {}, [updateInviteMutation.error]);

  return (
    <div className="flex flex-col items-center gap-2">
      <img src="/images/bg-shape.svg" className="fixed bottom-0 w-full" alt="bg of a shape" />
      <Card
        className="relative mt-17.5 min-h-150 w-87.5 rounded-md p-7.5"
        style={{
          boxShadow: "0px -4px 12px 0px #0000001F",
          zIndex: 999,
        }}
      >
        <div className="flex justify-center">
          <Link to="/">
            <img src={rateupLogoStackedWhiteTransparent} alt="RateUp Logo" className="w-25" />
          </Link>
        </div>
        <div className="flex flex-col flex-wrap items-center justify-center gap-4">
          <p className="mb-6 text-2xl font-semibold text-primary">
            {title} {translations("Invitation")}
          </p>

          {!type || !token ? (
            <div>{translations("Invite is not valid.")}</div>
          ) : (
            <div>
              {updateInviteMutation?.isPending || !updateInviteMutation.data ? (
                type === "team" && token ? (
                  <Spinner className="size-8" />
                ) : (
                  "Error"
                )
              ) : (
                <div className="flex flex-col flex-wrap items-center justify-center gap-4">
                  <p className="text-green-600"> {updateInviteMutation.data?.data.message}</p>
                  <div className="wrapper">
                    <svg
                      className={styles.checkmark}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 52 52"
                    >
                      <circle
                        className={styles.checkmark__circle}
                        cx="26"
                        cy="26"
                        r="25"
                        fill="none"
                      />
                      <path
                        className={styles.checkmark__check}
                        fill="none"
                        d="M14.1 27.2l7.1 7.2 16.7-16.8"
                      />
                    </svg>
                  </div>

                  <p className="mt-8 text-center">
                    {updateInviteMutation.data?.data.data.isUser
                      ? translations(
                          "Login to your existing account in this email and continue using the app.",
                        )
                      : translations(
                          "Your account is ready, Create a new password and login to start using the app.",
                        )}
                  </p>

                  {updateInviteMutation.data?.data.data.isUser ? (
                    <Button
                      onClick={() => {
                        navigate({
                          to: "/login",
                        });
                      }}
                    >
                      {translations("Continue")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const link = updateInviteMutation.data?.data.data.redirectLink;
                        if (link) {
                          const url = new URL(link, window.location.origin);
                          url.searchParams.set("type", "invite");
                          window.location.href = url.toString();
                        }
                      }}
                    >
                      {translations("Continue")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {updateInviteMutation.error && (
            <div className="flex flex-col gap-2">
              <p>{translations("Failed..! Try another invitation.")}</p>

              <div className="mt-24 flex justify-center">
                <Link
                  to="/login"
                  className={`flex items-center gap-2 text-blue-600 no-underline ${styles.txt}`}
                >
                  <IconArrowAutofitLeft size="1rem" stroke={1.5} />
                  {translations("Go to Login")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
