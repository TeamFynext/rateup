import {
  IconAlertTriangle,
  IconCircle,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconPrinter,
  IconRocket,
  IconSparkles,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useTranslation } from "react-i18next";

import type { OnboardingState } from "@/backend/loyalty/onboarding.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";

import { calculateGiveback } from "../../giveback/calculateGiveback.ts";
import { GivebackPanel } from "../../giveback/GivebackPanel.tsx";
import { formatWhatsappNumber, whatsappJoinUrl } from "../../joinLink.ts";
import { LOYALTY_PATHS } from "../../paths.ts";
import { ConnectWhatsappCard } from "../../poster/ConnectWhatsappCard.tsx";
import { QrPosterCard } from "../../poster/QrPosterCard.tsx";
import type { GivebackContext } from "../givebackContext.ts";
import { buildLaunchChecklist, type ChecklistStatus } from "../launchChecklist.ts";
import { StepHeader, StepIconChip } from "../StepChrome.tsx";
import { STEP_META, type WizardStep } from "../wizardSteps.ts";

interface LaunchStepProps {
  state: OnboardingState;
  giveback: GivebackContext;
  hasWhatsappChannel: boolean;
  /** Digits of the connected number the QR opens; null means no poster yet. */
  whatsappNumber: string | null;
  /** The keyword the QR pre-types — the "joining" reply's trigger word. */
  joinKeyword: string;
  orgId: string | undefined;
  isActivating: boolean;
  /** True once this session activated; the programme's own status covers a revisit. */
  launched: boolean;
  /** Returned by a refused or completed activation; shown rather than toasted. */
  warnings: string[];
  onBack: () => void;
  onGoTo: (step: WizardStep) => void;
  onEditAverageOrderValue: () => void;
  onActivate: () => void;
}

/** Brand confetti: blues, the two star stops and the WhatsApp green. */
const CONFETTI_COLOURS = ["#1c518e", "#5a8cc6", "#ffd54c", "#f8951d", "#1fa85b"];

/**
 * The last screen, in two states: a checklist and Activate before launch; confetti, the
 * QR poster and a way to the Overview after. The poster is the point — the QR is what
 * goes on the counter, and it is ready the moment the programme is.
 */
export function LaunchStep({
  state,
  giveback,
  hasWhatsappChannel,
  whatsappNumber,
  joinKeyword,
  orgId,
  isActivating,
  launched,
  warnings,
  onBack,
  onGoTo,
  onEditAverageOrderValue,
  onActivate,
}: Readonly<LaunchStepProps>) {
  const { t } = useTranslation();
  const program = state.program;
  const isLive = launched || program?.status === "active";

  if (isLive && program && orgId) {
    return (
      <div className="flex flex-col gap-6">
        {launched && <LaunchConfetti />}
        <div className="flex flex-col items-center gap-2 text-center">
          <StepIconChip tone="amber" className="size-12 [&>svg]:size-6">
            <IconSparkles />
          </StepIconChip>
          <h2 className="font-display text-xl font-bold text-foreground">{t("You're live")}</h2>
          <p className="max-w-[48ch] text-sm text-muted-foreground">
            {whatsappNumber
              ? t(
                  "Print this for the counter. Scanning it opens WhatsApp with “{keyword}” ready to send — one tap and they are in {name}.",
                  { keyword: joinKeyword, name: program.name },
                )
              : t("Your programme is live. Connect WhatsApp to get the counter QR.")}
          </p>
        </div>

        {warnings.length > 0 && (
          <Alert>
            <IconAlertTriangle />
            <AlertTitle>{t("Worth knowing")}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {whatsappNumber ? (
          <QrPosterCard
            program={program}
            url={whatsappJoinUrl(whatsappNumber, joinKeyword)}
            caption={formatWhatsappNumber(whatsappNumber)}
            joinKeyword={joinKeyword}
          />
        ) : (
          <ConnectWhatsappCard joinKeyword={joinKeyword} />
        )}

        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" render={<Link to={LOYALTY_PATHS.overview} />}>
            {t("Go to Overview")}
          </Button>
          <Button variant="ghost" render={<Link to={LOYALTY_PATHS.materials} />}>
            <IconPrinter size={16} />
            {t("Print materials")}
          </Button>
        </div>
      </div>
    );
  }

  const items = buildLaunchChecklist(state, hasWhatsappChannel, t);
  const blockers = items.filter((item) => item.status === "todo").length;

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        icon={<IconRocket />}
        tone="blue"
        title={t("Ready to go live")}
        description={t(
          "Nothing has been sent to customers yet. Activating turns on point earning, keyword replies and notifications.",
        )}
      />

      <Card className="border-border">
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {items.map((item) => {
            const Icon = STEP_META[item.step].icon;
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <StatusIcon status={item.status} />
                <StepIconChip tone={STEP_META[item.step].tone} size="sm">
                  <Icon />
                </StepIconChip>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>
                {item.link === "channels" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    render={<Link to="/dashboard/settings/channels" />}
                  >
                    {item.status === "todo" ? t("Connect") : t("Open")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => onGoTo(item.step)}
                  >
                    {item.status === "todo" ? t("Fix") : t("Edit")}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Static here: nothing on this step is editable, so it reads straight off the
          saved programme rather than subscribing to a form. */}
      <GivebackPanel
        result={calculateGiveback(giveback)}
        currencySymbol={giveback.currencySymbol}
        currencyCode={giveback.currencyCode}
        pointsName={giveback.pointsName}
        averageOrderValue={giveback.averageOrderValue}
        onEditAverageOrderValue={onEditAverageOrderValue}
      />

      {warnings.length > 0 && (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>{t("Worth knowing before you launch")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isActivating}>
          {t("Back")}
        </Button>
        <div className="flex items-center gap-3">
          {blockers > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("{count} to finish first", { count: blockers })}
            </span>
          )}
          <Button type="button" onClick={onActivate} disabled={isActivating}>
            <IconRocket size={16} />
            {isActivating ? t("Activating…") : t("Activate program")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: Readonly<{ status: ChecklistStatus }>) {
  const { t } = useTranslation();
  const label = status === "done" ? t("Done") : status === "todo" ? t("To do") : t("Optional");
  return (
    <span title={label} className="shrink-0">
      {status === "done" ? (
        <IconCircleCheckFilled className="size-5 text-ru-green-600 dark:text-ru-green-300" />
      ) : status === "todo" ? (
        <IconCircle className="size-5 text-ru-amber-600 dark:text-ru-amber-300" />
      ) : (
        <IconCircleDashed className="size-5 text-muted-foreground/60" />
      )}
    </span>
  );
}

/** One burst, sized to the window, gone once it has fallen. */
function LaunchConfetti() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const measure = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  if (size.width === 0) return null;
  return (
    <Confetti
      width={size.width}
      height={size.height}
      recycle={false}
      numberOfPieces={180}
      gravity={0.25}
      colors={CONFETTI_COLOURS}
      className={cn("pointer-events-none fixed inset-0 z-50")}
    />
  );
}
