import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import { Field, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  previewShopSegment,
  saveShopSegment,
  type ShopSegmentCriteria,
} from "@/backend/commerce/shop.api";
import { useShopCollections, useShopProducts } from "@/backend/commerce/shop.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

const CHANNELS = ["WHATSAPP", "INSTAGRAM", "MESSENGER", "STOREFRONT"] as const;
const ANY = "any";

const positive = (v: string) => {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Saves the shoppers who match a few purchase filters as a contact group for campaigns. */
export function SaveSegmentDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: teamsResponse } = useTeamsByUser();
  const teams = teamsResponse?.data ?? [];
  const { data: collections = [] } = useShopCollections();
  const { data: products } = useShopProducts({ status: "ACTIVE", limit: 100 }, open);

  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [minOrders, setMinOrders] = useState("");
  const [minSpent, setMinSpent] = useState("");
  const [orderedWithinDays, setOrderedWithinDays] = useState("");
  const [notOrderedForDays, setNotOrderedForDays] = useState("");
  const [channel, setChannel] = useState<string>(ANY);

  // Memoised so the debounce below sees a stable value; a fresh object each render restarts it forever.
  const criteria = useMemo<ShopSegmentCriteria>(
    () => ({
      productIds: productIds.length ? productIds : undefined,
      collectionIds: collectionIds.length ? collectionIds : undefined,
      minOrders: positive(minOrders),
      minSpent: positive(minSpent),
      orderedWithinDays: positive(orderedWithinDays),
      notOrderedForDays: positive(notOrderedForDays),
      channel: CHANNELS.find((c) => c === channel),
    }),
    [productIds, collectionIds, minOrders, minSpent, orderedWithinDays, notOrderedForDays, channel],
  );
  const debounced = useDebounce(criteria, 400);
  const preview = useQuery({
    queryKey: ["shop", "segment-preview", debounced],
    queryFn: () => previewShopSegment(debounced),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () => saveShopSegment({ name: name.trim(), teamId, criteria }),
    onSuccess: (result) => {
      toast.success(
        t("Saved {name} with {count, plural, one {# contact} other {# contacts}}", {
          name: result.name,
          count: result.count,
        }),
        {
          action: {
            label: t("Open campaigns"),
            onClick: () => void navigate({ to: "/dashboard/campaigns" }),
          },
        },
      );
      onOpenChange(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save the audience"))),
  });

  const channelLabels: Record<(typeof CHANNELS)[number], string> = {
    WHATSAPP: t("WhatsApp"),
    INSTAGRAM: t("Instagram"),
    MESSENGER: t("Messenger"),
    STOREFRONT: t("Storefront"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Save shoppers as an audience")}</DialogTitle>
          <DialogDescription>
            {t("Pick who bought what, then use the audience in a campaign.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto overscroll-contain pr-1">
          <Field>
            <FieldLabel>{t("Bought any of these products")}</FieldLabel>
            <MultiSelect
              options={(products?.items ?? []).map((p) => ({ value: p.id, label: p.title }))}
              value={productIds}
              onValueChange={setProductIds}
              placeholder={t("Any product")}
            />
          </Field>
          <Field>
            <FieldLabel>{t("Or from these collections")}</FieldLabel>
            <MultiSelect
              options={collections.map((c) => ({ value: c.id, label: c.name }))}
              value={collectionIds}
              onValueChange={setCollectionIds}
              placeholder={t("Any collection")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="seg-min-orders">{t("At least this many orders")}</FieldLabel>
              <Input
                id="seg-min-orders"
                inputMode="numeric"
                value={minOrders}
                onChange={(e) => setMinOrders(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="seg-min-spent">{t("Spent at least")}</FieldLabel>
              <Input
                id="seg-min-spent"
                inputMode="decimal"
                value={minSpent}
                onChange={(e) => setMinSpent(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="seg-within">{t("Ordered in the last (days)")}</FieldLabel>
              <Input
                id="seg-within"
                inputMode="numeric"
                value={orderedWithinDays}
                onChange={(e) => setOrderedWithinDays(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="seg-lapsed">{t("No order for (days)")}</FieldLabel>
              <Input
                id="seg-lapsed"
                inputMode="numeric"
                value={notOrderedForDays}
                onChange={(e) => setNotOrderedForDays(e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>{t("Ordered on")}</FieldLabel>
            <Select
              value={channel}
              onValueChange={(value) => setChannel(value ?? ANY)}
              items={[
                { value: ANY, label: t("Any channel") },
                ...CHANNELS.map((c) => ({ value: c, label: channelLabels[c] })),
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("Any channel")}</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {channelLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="seg-name">{t("Audience name")}</FieldLabel>
              <Input
                id="seg-name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{t("Team")}</FieldLabel>
              <Select
                value={teamId}
                onValueChange={(value) => setTeamId(value ?? "")}
                items={teams.map((team) => ({ value: team.id, label: team.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Pick a team")} />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {preview.isFetching
              ? t("Counting…")
              : preview.data
                ? t("{count, plural, one {# shopper matches} other {# shoppers match}}", {
                    count: preview.data.count,
                  })
                : ""}
          </span>
          <Button
            loading={save.isPending}
            disabled={!name.trim() || !teamId || !preview.data?.count}
            onClick={() => save.mutate()}
          >
            {t("Save audience")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
