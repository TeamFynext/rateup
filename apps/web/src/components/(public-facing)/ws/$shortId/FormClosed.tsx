import { IconLockFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { rateupLogo } from "@/utils/constants";

/**
 * Shown when a form has stopped accepting responses for the month.
 *
 * Deliberately not the generic error page: that one offers a Reload button and reloads
 * itself up to three times, which here would be three more refusals and a respondent
 * being told to retry something that cannot succeed until the next billing month.
 *
 * The reason is the org's allowance, but the person reading this is the org's customer,
 * so nothing about plans, limits or upgrades appears — they are pointed at the
 * organisation, which is the only party that can reopen the form. The org's owner is
 * emailed separately by the API.
 */
export function FormClosed({ message }: { message?: string }) {
  const { t: translations } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <IconLockFilled size="3.5rem" className="text-muted-foreground" />
      <div className="flex max-w-lg flex-col items-center gap-3">
        <p className="text-center text-3xl font-bold">{translations("This form is closed")}</p>
        <p className="text-center text-lg leading-normal text-muted-foreground">
          {message ??
            translations(
              "This form is not accepting responses right now. Please contact the organisation.",
            )}
        </p>
      </div>
      <a href="https://www.rateup.app">
        <img src={rateupLogo} alt="RateUp" className="h-10 w-auto object-contain opacity-70" />
      </a>
    </div>
  );
}
