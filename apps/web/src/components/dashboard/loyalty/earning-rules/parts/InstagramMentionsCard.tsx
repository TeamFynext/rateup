import { Button } from "@rateup/ui/components/button";
import { Card, CardContent } from "@rateup/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Switch } from "@rateup/ui/components/switch";
import { IconBrandInstagram } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  InstagramMentionKind,
  InstagramMentionRule,
} from "@/backend/loyalty/earningRules.api";
import {
  useInstagramMentionRule,
  useSaveInstagramMentionRuleMutation,
} from "@/backend/loyalty/earningRules.query";
import { getApiErrorMessage } from "@/utils/apiError.ts";

/** The three choices the merchant picks from, as the mention kinds the API stores. */
type KindsChoice = "stories" | "posts" | "both";

const KINDS_FOR: Record<KindsChoice, InstagramMentionKind[]> = {
  stories: ["STORY"],
  posts: ["MEDIA", "COMMENT"],
  both: ["STORY", "MEDIA", "COMMENT"],
};

function choiceOf(kinds: readonly InstagramMentionKind[]): KindsChoice {
  const story = kinds.includes("STORY");
  const post = kinds.includes("MEDIA") || kinds.includes("COMMENT");
  if (story && !post) return "stories";
  if (post && !story) return "posts";
  return "both";
}

function isKindsChoice(value: string | null): value is KindsChoice {
  return value === "stories" || value === "posts" || value === "both";
}

/** "Mention us on Instagram": points for a story, post or comment that tags the business. */
export function InstagramMentionsCard({ pointsName }: Readonly<{ pointsName: string }>) {
  const { t } = useTranslation("loyalty.earningRules");
  const { data, isPending } = useInstagramMentionRule();

  return (
    <div>
      <div className="mb-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <IconBrandInstagram className="size-4" aria-hidden />
          {t("Instagram mentions")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t(
            "Members earn points when they tag you in a story, post or comment. Customers who are not members yet get a join link and keep the points if they join within 24 hours.",
          )}
        </p>
      </div>
      {isPending || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        // Keyed on the saved row so a save (or a refetch) starts the form from what is stored.
        <MentionsForm
          key={`${data.id ?? "new"}:${data.enabled}:${data.pointsPerMention}:${data.cooldownDays}:${data.mentionKinds.join()}`}
          saved={data}
          pointsName={pointsName}
        />
      )}
    </div>
  );
}

function MentionsForm({
  saved,
  pointsName,
}: Readonly<{ saved: InstagramMentionRule; pointsName: string }>) {
  const { t } = useTranslation("loyalty.earningRules");
  const uid = useId();
  const save = useSaveInstagramMentionRuleMutation();

  const [enabled, setEnabled] = useState(saved.enabled);
  const [points, setPoints] = useState(String(saved.pointsPerMention));
  const [kinds, setKinds] = useState<KindsChoice>(choiceOf(saved.mentionKinds));
  const [cooldown, setCooldown] = useState(String(saved.cooldownDays));

  const pointsValue = Number(points);
  const cooldownValue = Number(cooldown);
  const pointsValid = Number.isInteger(pointsValue) && pointsValue >= 1;
  const cooldownValid =
    Number.isInteger(cooldownValue) && cooldownValue >= 0 && cooldownValue <= 365;
  const dirty =
    enabled !== saved.enabled ||
    pointsValue !== saved.pointsPerMention ||
    cooldownValue !== saved.cooldownDays ||
    kinds !== choiceOf(saved.mentionKinds);

  const kindItems = [
    { value: "both", label: t("Stories, posts and comments") },
    { value: "stories", label: t("Stories only") },
    { value: "posts", label: t("Posts and comments only") },
  ];

  const onSave = () => {
    save.mutate(
      {
        enabled,
        pointsPerMention: pointsValue,
        mentionKinds: KINDS_FOR[kinds],
        cooldownDays: cooldownValue,
      },
      {
        onSuccess: () => toast.success(t("Instagram mentions saved")),
        onError: (error) =>
          toast.error(getApiErrorMessage(error, t("Could not save Instagram mentions"))),
      },
    );
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t("Reward Instagram mentions")}</p>
            <p className="text-xs text-muted-foreground">
              {t("Needs a connected Instagram account.")}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label={t("Reward Instagram mentions")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!pointsValid || undefined}>
            <FieldLabel htmlFor={`${uid}-points`}>
              {t("{points} per mention", { points: pointsName })}
            </FieldLabel>
            <Input
              id={`${uid}-points`}
              type="number"
              inputMode="numeric"
              min={1}
              value={points}
              disabled={!enabled}
              onChange={(e) => setPoints(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${uid}-kinds`}>{t("What counts")}</FieldLabel>
            <Select
              value={kinds}
              onValueChange={(value) => {
                if (isKindsChoice(value)) setKinds(value);
              }}
              items={kindItems}
              disabled={!enabled}
            >
              <SelectTrigger id={`${uid}-kinds`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kindItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={!cooldownValid || undefined}>
            <FieldLabel htmlFor={`${uid}-cooldown`}>{t("Days between rewards")}</FieldLabel>
            <Input
              id={`${uid}-cooldown`}
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              value={cooldown}
              disabled={!enabled}
              onChange={(e) => setCooldown(e.target.value)}
            />
            <FieldDescription>{t("0 rewards every mention.")}</FieldDescription>
          </Field>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onSave}
            loading={save.isPending}
            disabled={!dirty || !pointsValid || !cooldownValid}
          >
            {t("Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
