import { IconSparkles, IconUserPlus } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { LoyaltyProgram } from "@/backend/loyalty/program.api";
import { useUpdateLoyaltyProgramMutation } from "@/backend/loyalty/program.query";
import type { LoyaltyReward } from "@/backend/loyalty/reward.api";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { formatPoints } from "../giveback/format.ts";

type BonusKind = "points" | "gift";

/**
 * Points for joining and for referring: programme settings rather than catalog rows, so they
 * sit above the catalog and save on their own.
 */
export function BonusesStrip({
  program,
  gifts,
  pointsName,
}: Readonly<{ program: LoyaltyProgram; gifts: readonly LoyaltyReward[]; pointsName: string }>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<"joining" | "referral" | null>(null);

  const side = (type: BonusKind | undefined, points: number, rewardId: string | undefined) => {
    if (type === "gift") {
      return gifts.find((gift) => gift.id === rewardId)?.name ?? t("a free gift");
    }
    return points > 0 ? formatPoints(points, pointsName) : t("nothing");
  };
  const referralOn =
    program.referralBonus > 0 ||
    program.refereeBonus > 0 ||
    program.referralBonusType === "gift" ||
    program.refereeBonusType === "gift";

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <BonusCard
          icon={<IconSparkles size={18} />}
          title={t("Joining bonus")}
          summary={
            program.signupBonus > 0
              ? t("{points} the moment someone joins", {
                  points: formatPoints(program.signupBonus, pointsName),
                })
              : t("Off")
          }
          onEdit={() => setEditing("joining")}
        />
        <BonusCard
          icon={<IconUserPlus size={18} />}
          title={t("Referral bonus")}
          summary={
            referralOn
              ? t("{referrer} for the referrer · {friend} for the friend", {
                  referrer: side(
                    program.referralBonusType,
                    program.referralBonus,
                    program.referralRewardId,
                  ),
                  friend: side(
                    program.refereeBonusType,
                    program.refereeBonus,
                    program.refereeRewardId,
                  ),
                })
              : t("Off")
          }
          onEdit={() => setEditing("referral")}
        />
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing === "joining" && (
            <JoiningForm
              program={program}
              pointsName={pointsName}
              onDone={() => setEditing(null)}
            />
          )}
          {editing === "referral" && (
            <ReferralForm program={program} gifts={gifts} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function BonusCard({
  icon,
  title,
  summary,
  onEdit,
}: Readonly<{ icon: ReactNode; title: string; summary: string; onEdit: () => void }>) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{summary}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          {t("Edit")}
        </Button>
      </CardContent>
    </Card>
  );
}

function JoiningForm({
  program,
  pointsName,
  onDone,
}: Readonly<{ program: LoyaltyProgram; pointsName: string; onDone: () => void }>) {
  const { t } = useTranslation();
  const [bonus, setBonus] = useState(program.signupBonus || 0);
  const save = useUpdateLoyaltyProgramMutation(program.id, onDone);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ signupBonus: bonus });
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("Joining bonus")}</DialogTitle>
        <DialogDescription>
          {t("Paid once, the moment a customer joins, however they joined.")}
        </DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="signup-bonus">{t("Amount")}</FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id="signup-bonus"
            type="number"
            inputMode="numeric"
            min={0}
            value={bonus}
            onChange={(e) => setBonus(Number.parseFloat(e.target.value) || 0)}
          />
          <span className="shrink-0 text-sm text-muted-foreground">{pointsName}</span>
        </div>
        <FieldDescription>{t("Set it to 0 to give nothing for joining.")}</FieldDescription>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {t("Save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface SideState {
  type: BonusKind;
  points: number;
  rewardId: string | undefined;
}

function ReferralForm({
  program,
  gifts,
  onDone,
}: Readonly<{ program: LoyaltyProgram; gifts: readonly LoyaltyReward[]; onDone: () => void }>) {
  const { t } = useTranslation();
  const [referrer, setReferrer] = useState<SideState>({
    type: program.referralBonusType ?? "points",
    points: program.referralBonus || 0,
    rewardId: program.referralRewardId,
  });
  const [friend, setFriend] = useState<SideState>({
    type: program.refereeBonusType ?? "points",
    points: program.refereeBonus || 0,
    rewardId: program.refereeRewardId,
  });
  const save = useUpdateLoyaltyProgramMutation(program.id, onDone);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          referralBonus: referrer.type === "points" ? referrer.points : 0,
          referralBonusType: referrer.type,
          referralRewardId: referrer.type === "gift" ? referrer.rewardId : undefined,
          refereeBonus: friend.type === "points" ? friend.points : 0,
          refereeBonusType: friend.type,
          refereeRewardId: friend.type === "gift" ? friend.rewardId : undefined,
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("Referral bonus")}</DialogTitle>
        <DialogDescription>
          {t(
            'A customer types "refer" on WhatsApp to get their link. The friend is rewarded when they join; the customer who shared it, after the friend\'s first purchase.',
          )}
        </DialogDescription>
      </DialogHeader>
      <ReferralSide
        id="referrer"
        title={t("The customer who shares")}
        value={referrer}
        onChange={setReferrer}
        gifts={gifts}
      />
      <ReferralSide
        id="referee"
        title={t("The friend who joins")}
        value={friend}
        onChange={setFriend}
        gifts={gifts}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {t("Save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ReferralSide({
  id,
  title,
  value,
  onChange,
  gifts,
}: Readonly<{
  id: string;
  title: string;
  value: SideState;
  onChange: (next: SideState) => void;
  gifts: readonly LoyaltyReward[];
}>) {
  const { t } = useTranslation();
  const typeItems = [
    { value: "points", label: t("Points") },
    { value: "gift", label: t("Free gift") },
  ];
  const giftItems = gifts.map((gift) => ({ value: gift.id, label: gift.name }));

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-type`}>{t("Gets")}</FieldLabel>
          <Select
            value={value.type}
            items={typeItems}
            onValueChange={(next) =>
              onChange({ ...value, type: next === "gift" ? "gift" : "points" })
            }
          >
            <SelectTrigger id={`${id}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {value.type === "points" ? (
          <Field>
            <FieldLabel htmlFor={`${id}-points`}>{t("Amount")}</FieldLabel>
            <Input
              id={`${id}-points`}
              type="number"
              inputMode="numeric"
              min={0}
              value={value.points}
              onChange={(e) =>
                onChange({ ...value, points: Number.parseFloat(e.target.value) || 0 })
              }
            />
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor={`${id}-gift`}>{t("Gift")}</FieldLabel>
            <Select
              value={value.rewardId ?? ""}
              items={giftItems}
              onValueChange={(next) => onChange({ ...value, rewardId: next ?? undefined })}
            >
              <SelectTrigger id={`${id}-gift`}>
                <SelectValue placeholder={t("Choose a gift")} />
              </SelectTrigger>
              <SelectContent>
                {giftItems.length === 0 ? (
                  <SelectItem value="" disabled>
                    {t("Create a free gift first")}
                  </SelectItem>
                ) : (
                  giftItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
    </fieldset>
  );
}
