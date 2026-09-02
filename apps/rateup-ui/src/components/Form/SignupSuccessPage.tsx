import { IconArrowRight, IconCheck, IconExternalLink, IconStarFilled } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useUserInfo } from "@/backend/user/user.query";
import { docsPath } from "@/utils/constants.ts";

import { Button, buttonVariants } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import { AUTH_CTA, AuthShell, AuthTitle } from "./AuthShell.tsx";

/**
 * The last screen of signup: the account exists, the email is verified, and the
 * workspace is ready. It states what was set up before handing over to the
 * dashboard, so the end of the flow reads as an arrival rather than a redirect.
 */
export default function SignupSuccessPage() {
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const { data: userInfo } = useUserInfo();

  const user = userInfo && "data" in userInfo ? userInfo.data : undefined;
  const orgName = user?.orgName?.trim();

  const summary = [
    user?.email
      ? `${translations("Email verified")} — ${user.email}`
      : translations("Email verified"),
    orgName
      ? `${translations("Workspace created for")} ${orgName}`
      : translations("Your workspace is ready"),
    translations("Free account started — no card on file"),
  ];

  return (
    <AuthShell isSignup={true}>
      <div className="flex w-full max-w-108 flex-col gap-3.5">
        <Card className="items-center gap-4 rounded-2xl px-6 py-4 text-center shadow-md ring-border sm:px-7.5">
          <span className="flex size-16 items-center justify-center rounded-full border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/40">
            <IconStarFilled className="size-8 text-amber-500" />
          </span>

          <AuthTitle
            align="center"
            title={
              orgName
                ? `${orgName} ${translations("is live")}`
                : translations("Your workspace is live")
            }
            subtitle={translations(
              "Everything is set up and waiting — pick up your first conversation whenever you are ready.",
            )}
          />

          <ul className="flex w-full flex-col overflow-hidden rounded-xl border border-border text-left">
            {summary.map((line) => (
              <li
                key={line}
                className="flex items-center gap-2.75 border-b border-border bg-card px-3.5 py-2.5 last:border-b-0"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-600/12 text-green-700 dark:text-green-500">
                  <IconCheck className="size-3" stroke={3} />
                </span>
                <span className="text-[13px] text-secondary-foreground">{line}</span>
              </li>
            ))}
          </ul>

          <div className="flex w-full flex-col gap-2.5">
            <Button onClick={() => navigate({ to: "/dashboard" })} className={AUTH_CTA}>
              {translations("Go to dashboard")}
              <IconArrowRight className="size-4" />
            </Button>
            {/* A real anchor, not a Button with an onClick: this leaves the app, so it
                has to open in a new tab and behave like a link on middle-click. */}
            <a
              href={docsPath}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "outline",
                className: "h-9 w-full rounded-lg text-[13.5px] font-semibold",
              })}
            >
              {translations("Read the docs")}
              <IconExternalLink className="size-4" />
            </a>
          </div>
        </Card>

        <p className="text-center text-[13.5px] text-muted-foreground">
          {translations("Need a hand getting started?")}{" "}
          <Link to="/contact-us" className="font-semibold text-primary hover:text-primary/80">
            {translations("Talk to us")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
