import { Button } from "@rateup/ui/components/button";
import { Spinner } from "@rateup/ui/components/spinner";
import { IconArrowAutofitLeft } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { signOut } from "supertokens-auth-react/recipe/session";

import { teamKeys } from "@/backend/org/org.keys";
import { completeInvite, type CompleteInviteResponse } from "@/backend/team/team.api";
import { Card } from "@/components/ui/card";
import { asApiError, getApiErrorMessage } from "@/utils/apiError";
import { imagesPath, rateupLogo } from "@/utils/constants";

import styles from "../../../components/(auth)/invite/styles.module.css";

export const Route = createFileRoute("/(auth)/invite/")({
  /** Declares the search params this route reads, so they arrive typed. */
  validateSearch: (search: Record<string, unknown>): { type?: string; token?: string } => ({
    type: typeof search.type === "string" ? search.type : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: Invite,
});

/** The API answers 410 for a token that is unknown, already used or past its expiry. */
function isInviteGone(error: unknown): boolean {
  return asApiError(error).response?.status === 410;
}

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
      queryClient.invalidateQueries({ queryKey: teamKeys.details() }); // update team list on add
      toast.success(translations("Invite Accepted successfully."), {
        id: "load-data",
      });
    },

    onError: (error: Error) => {
      console.error("Error:", error.message);
      toast.error(
        isInviteGone(error)
          ? translations(
              "This invitation has expired or was already used; ask your admin to resend it.",
            )
          : getApiErrorMessage(error, translations("Failed..! Try another invitation.")),
        { id: "load-data" },
      );
    },
  });

  // The token is single-use, so it must be sent once. StrictMode runs this effect twice in dev;
  // the cleanup cancels the first timer, and the ref stops any repeat for the same token.
  const sentFor = useRef<string | null>(null);
  useEffect(() => {
    if (type !== "team" || !token || sentFor.current === token) return;
    toast.loading(translations("Hold on, while validating your invite."), {
      id: "load-data",
    });
    const timer = setTimeout(() => {
      sentFor.current = token;
      updateInviteMutation.mutate();
    }, 2000);
    return () => clearTimeout(timer);
    // TODO : improve with org invite
  }, [type, token]);

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={`${imagesPath}/bg-shape.svg`}
        className="fixed bottom-0 w-full"
        alt="bg of a shape"
      />
      <Card
        className="relative mt-17.5 min-h-150 w-87.5 rounded-md p-7.5"
        style={{
          boxShadow: "0px -4px 12px 0px #0000001F",
          zIndex: 999,
        }}
      >
        <div className="flex justify-center">
          <Link to="/">
            <img src={rateupLogo} alt="RateUp Logo" className="w-44" />
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

                  <AcceptedNextStep
                    accepted={updateInviteMutation.data.data.data}
                    onLogin={() => navigate({ to: "/login" })}
                    onResetPassword={() => navigate({ to: "/login/reset-password" })}
                  />
                </div>
              )}
            </div>
          )}

          {updateInviteMutation.error && (
            <div className="flex flex-col gap-2">
              <p>
                {isInviteGone(updateInviteMutation.error)
                  ? translations(
                      "This invitation has expired or was already used; ask your admin to resend it.",
                    )
                  : translations("Failed..! Try another invitation.")}
              </p>

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

/**
 * What to do once the invitation is accepted. An existing account just signs in. A new one has
 * no password yet: the API emails a link to choose one and never hands it to the page, so when
 * that email could not be sent the reset-password flow is the way in.
 */
function AcceptedNextStep({
  accepted,
  onLogin,
  onResetPassword,
}: Readonly<{
  accepted: CompleteInviteResponse["data"];
  onLogin: () => void;
  onResetPassword: () => void;
}>) {
  const { t } = useTranslation();

  if (accepted.isUser) {
    return (
      <>
        <p className="mt-8 text-center">
          {t("Login to your existing account in this email and continue using the app.")}
        </p>
        <Button onClick={onLogin}>{t("Continue")}</Button>
      </>
    );
  }

  if (accepted.passwordSetupEmailSent) {
    return (
      <>
        <p className="mt-8 text-center font-semibold">
          {t("Check your email to set your password")}
        </p>
        <p className="text-center text-sm text-muted-foreground">
          {t("We sent a link to {email}. Open it to choose a password, then sign in.", {
            email: accepted.email,
          })}
        </p>
        <Button variant="outline" onClick={onLogin}>
          {t("Go to Login")}
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="mt-8 text-center">
        {t(
          'Your account is ready, but we could not email you a password link. Use "Forgot password?" with {email} to set one.',
          { email: accepted.email },
        )}
      </p>
      <Button onClick={onResetPassword}>{t("Forgot password?")}</Button>
    </>
  );
}
