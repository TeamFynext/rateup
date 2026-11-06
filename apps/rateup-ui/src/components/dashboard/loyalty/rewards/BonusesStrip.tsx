import {
  IconDots,
  IconPencil,
  IconSparkles,
  IconUserPlus,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { LoyaltyProgram } from "@/backend/loyalty/program.api";
import { useUpdateLoyaltyProgramMutation } from "@/backend/loyalty/program.query";
import type { LoyaltyReward } from "@/backend/loyalty/reward.api";
import { Badge } from "@/components/ui/badge.tsx";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils.ts";

import { formatPoints } from "../giveback/format.ts";

type BonusKind = "points" | "gift";
type BonusId = "joining" | "referral";

/**
 * Points for joining and for referring: programme settings rather than catalog rows, so they
 * save on their own. A bonus with nothing set up opens its editor when switched on, rather
 * than going live paying nothing.
 */
export function BonusesStrip({
  program,
  gifts,
  pointsName,
}: Readonly<{ program: LoyaltyProgram; gifts: readonly LoyaltyReward[]; pointsName: string }>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<{ bonus: BonusId; enableOnSave: boolean } | null>(null);
  const toggle = useUpdateLoyaltyProgramMutation(program.id);

  const side = (type: BonusKind | undefined, points: number, rewardId: string | undefined) => {
    if (type === "gift") {
      return gifts.find((gift) => gift.id === rewardId)?.name ?? t("a free gift");
    }
    return points > 0 ? formatPoints(points, pointsName) : t("nothing");
  };
  const joiningSetUp = program.signupBonus > 0;
  const referralSetUp =
    program.referralBonus > 0 ||
    program.refereeBonus > 0 ||
    program.referralBonusType === "gift" ||
    program.refereeBonusType === "gift";

  const onToggle = (bonus: BonusId, setUp: boolean, active: boolean) => {
    if (active && !setUp) {
      setEditing({ bonus, enableOnSave: true });
      return;
    }
    toggle.mutate(
      bonus === "joining" ? { signupBonusEnabled: active } : { referralBonusEnabled: active },
    );
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <BonusCard
          icon={IconSparkles}
          title={t("Joining bonus")}
          description={t("Paid once, the moment a customer joins, however they joined.")}
          active={program.signupBonusEnabled && joiningSetUp}
          audience={t("New members")}
          onToggle={(active) => onToggle("joining", joiningSetUp, active)}
          onEdit={() => setEditing({ bonus: "joining", enableOnSave: false })}
        >
          {joiningSetUp ? (
            <span className="font-display text-lg font-bold leading-none">
              {formatPoints(program.signupBonus, pointsName)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t("Not set up yet")}</span>
          )}
        </BonusCard>
        <BonusCard
          icon={IconUserPlus}
          title={t("Referral bonus")}
          description={t(
            'A customer types "refer" on WhatsApp to get their link and share it with a friend.',
          )}
          active={program.referralBonusEnabled && referralSetUp}
          audience={t("Members and their friends")}
          onToggle={(active) => onToggle("referral", referralSetUp, active)}
          onEdit={() => setEditing({ bonus: "referral", enableOnSave: false })}
        >
          {referralSetUp ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              <dt className="text-muted-foreground">{t("The customer who shares")}</dt>
              <dd className="truncate font-medium">
                {side(program.referralBonusType, program.referralBonus, program.referralRewardId)}
              </dd>
              <dt className="text-muted-foreground">{t("The friend who joins")}</dt>
              <dd className="truncate font-medium">
                {side(program.refereeBonusType, program.refereeBonus, program.refereeRewardId)}
              </dd>
            </dl>
          ) : (
            <span className="text-xs text-muted-foreground">{t("Not set up yet")}</span>
          )}
        </BonusCard>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing?.bonus === "joining" && (
            <JoiningForm
              program={program}
              pointsName={pointsName}
              enableOnSave={editing.enableOnSave}
              onDone={() => setEditing(null)}
            />
          )}
          {editing?.bonus === "referral" && (
            <ReferralForm
              program={program}
              gifts={gifts}
              enableOnSave={editing.enableOnSave}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Laid out like `RewardTile`, so the bonuses read as part of the same catalogue. */
function BonusCard({
  icon: Icon,
  title,
  description,
  active,
  audience,
  onToggle,
  onEdit,
  children,
}: Readonly<{
  icon: TablerIcon;
  title: string;
  description: string;
  active: boolean;
  audience: string;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
  children: ReactNode;
}>) {
  const { t } = useTranslation();
  return (
    <Card className={cn("h-full transition-colors", !active && "bg-muted/40")}>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20",
              !active && "opacity-60",
            )}
            aria-hidden="true"
          >
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onEdit}
              className="line-clamp-2 text-left font-medium leading-snug text-foreground hover:underline"
            >
              {title}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1">
                {t("Bonus")}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("Actions for {name}", { name: title })}
                />
              }
            >
              <IconDots />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onEdit}>
                <IconPencil />
                {t("Edit")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>

        <div className="mt-auto flex flex-col gap-3">
          {children}

          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <span className="truncate text-xs text-muted-foreground">{audience}</span>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              {active ? t("On") : t("Off")}
              <Switch
                checked={active}
                onCheckedChange={onToggle}
                aria-label={t("Pay the {name}", { name: title.toLowerCase() })}
              />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JoiningForm({
  program,
  pointsName,
  enableOnSave,
  onDone,
}: Readonly<{
  program: LoyaltyProgram;
  pointsName: string;
  enableOnSave: boolean;
  onDone: () => void;
}>) {
  const { t } = useTranslation();
  const [bonus, setBonus] = useState(program.signupBonus || 0);
  const save = useUpdateLoyaltyProgramMutation(program.id, onDone);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ signupBonus: bonus, ...(enableOnSave && { signupBonusEnabled: bonus > 0 }) });
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
  enableOnSave,
  onDone,
}: Readonly<{
  program: LoyaltyProgram;
  gifts: readonly LoyaltyReward[];
  enableOnSave: boolean;
  onDone: () => void;
}>) {
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
          ...(enableOnSave && { referralBonusEnabled: true }),
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
