import { IconArrowLeft, IconInfoCircle, IconMail } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import { AUTH_CTA, AuthTitle } from "./AuthShell.tsx";

/** Seconds a viewer must wait before the mail can be sent again. */
const RESEND_COOLDOWN_SECONDS = 60;

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The "we emailed you a link" screen, shared by email verification and password
 * reset. Both say the same three things — which address it went to, how to send
 * another, and what to do when it never arrives — so they share one card rather
 * than two that drift.
 */
export function CheckInboxCard({
  title,
  description,
  email,
  expiryNote,
  onResend,
  backTo,
  backLabel,
}: Readonly<{
  title: string;
  /** What was sent, e.g. "We sent a verification link to". The address follows it. */
  description: string;
  email?: string;
  /** How long the link lasts, e.g. "It expires in 24 hours." */
  expiryNote: string;
  /** Sends another mail. Omitted when the screen cannot resend. */
  onResend?: () => void;
  backTo: "/login" | "/logout";
  backLabel: string;
}>) {
  const { t: translations } = useTranslation();
  const [remaining, setRemaining] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const handleResend = useCallback(() => {
    if (remaining > 0 || !onResend) return;
    onResend();
    setRemaining(RESEND_COOLDOWN_SECONDS);
    timer.current = setInterval(() => {
      setRemaining((previous) => {
        if (previous <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }, [onResend, remaining]);

  return (
    <div className="flex w-full max-w-108 flex-col gap-3.5">
      <Card className="items-center gap-4 rounded-2xl px-6 py-4 text-center shadow-md ring-border sm:px-7.5">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-ru-blue-200 bg-accent text-primary dark:border-primary/40">
          <IconMail className="size-6.5" stroke={1.6} />
        </span>

        <AuthTitle align="center" title={title} />
        <p className="max-w-[40ch] text-[13.5px] leading-normal text-muted-foreground">
          {description}{" "}
          <strong className="font-semibold text-foreground">
            {email ?? translations("your email address")}
          </strong>
          . {expiryNote}
        </p>

        {onResend && (
          <div className="flex w-full flex-col gap-2.5">
            <Button onClick={handleResend} disabled={remaining > 0} className={AUTH_CTA}>
              {remaining > 0
                ? `${translations("Resend in")} ${formatCountdown(remaining)}`
                : translations("Resend the email")}
            </Button>
          </div>
        )}

        <div className="flex w-full items-start gap-2.75 rounded-xl border border-border bg-muted px-3.5 py-3 text-left">
          <IconInfoCircle className="mt-px size-4 shrink-0 text-muted-foreground" stroke={1.8} />
          <span className="text-[12.5px] leading-normal text-muted-foreground">
            {translations("Nothing after a minute? Check your spam folder, or")}{" "}
            <Link to="/contact-us" className="font-medium text-primary hover:underline">
              {translations("get in touch with support")}
            </Link>
            .
          </span>
        </div>

        <Link
          to={backTo}
          className="flex h-10 cursor-pointer items-center justify-center gap-1.75 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
      </Card>
    </div>
  );
}
