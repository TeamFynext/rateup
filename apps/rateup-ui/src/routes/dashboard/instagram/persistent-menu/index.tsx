"use client";

import { useEffect, useMemo, useState } from "react";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  useDeleteInstagramPersistentMenuMutation,
  useInstagramProfile,
  useSetInstagramPersistentMenuMutation,
  useSyncInstagramPersistentMenuMutation,
} from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { InstagramFeatureShell } from "@/components/dashboard/instagram/instagram-feature-shell.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

export const Route = createFileRoute("/dashboard/instagram/persistent-menu/")({
  component: InstagramPersistentMenuPage,
});

type DraftMenuItem = {
  id: string;
  type: "postback" | "web_url";
  title: string;
  payload: string;
  url: string;
};

function InstagramPersistentMenuPage() {
  return (
    <InstagramFeatureShell
      title="Persistent Menu"
      description="Keep a permanent menu visible inside the Instagram conversation so users can jump to your core actions."
      secondaryAction={
        <Button asChild variant="outline">
          <Link to="/dashboard/instagram">Back to hub</Link>
        </Button>
      }
    >
      {(waSetting) => <PersistentMenuEditor waSettingId={waSetting.id} />}
    </InstagramFeatureShell>
  );
}

function PersistentMenuEditor({
  waSettingId,
}: Readonly<{ waSettingId: string }>) {
  const { data } = useInstagramProfile(waSettingId);
  const setMutation = useSetInstagramPersistentMenuMutation(waSettingId);
  const syncMutation = useSyncInstagramPersistentMenuMutation(waSettingId);
  const deleteMutation = useDeleteInstagramPersistentMenuMutation(waSettingId);
  const [locale, setLocale] = useState("default");
  const [items, setItems] = useState<DraftMenuItem[]>([]);

  useEffect(() => {
    const existing = data?.data.persistentMenu?.[0];
    setLocale(existing?.locale || "default");
    setItems(
      existing?.call_to_actions?.length
        ? existing.call_to_actions.map((item) => ({
            id: crypto.randomUUID(),
            type: item.type,
            title: item.title,
            payload: item.payload || "",
            url: item.url || "",
          }))
        : [
            {
              id: crypto.randomUUID(),
              type: "postback" as const,
              title: "",
              payload: "",
              url: "",
            },
          ],
    );
  }, [data]);

  const canSave = useMemo(
    () => items.some((item) => item.title.trim().length > 0),
    [items],
  );

  const save = () => {
    const call_to_actions = items
      .map((item) => ({
        type: item.type,
        title: item.title.trim(),
        payload: item.type === "postback" ? item.payload.trim() : undefined,
        url: item.type === "web_url" ? item.url.trim() : undefined,
      }))
      .filter((item) => item.title.length > 0)
      .slice(0, 5);

    setMutation.mutate([
      {
        locale: locale.trim() || "default",
        call_to_actions,
      },
    ]);
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Menu entries</CardTitle>
        <CardDescription>
          Use postback items for actions and web URLs for off-platform journeys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <Input
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
          placeholder="Locale, e.g. default or en_US"
        />

        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-xl border p-4">
            <Input
              value={item.title}
              placeholder="Menu title"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...next[index], title: event.target.value };
                setItems(next);
              }}
            />
            <Input
              value={item.type}
              placeholder="Type"
              onChange={(event) => {
                const next = [...items];
                next[index] = {
                  ...next[index],
                  type: event.target.value as "postback" | "web_url",
                };
                setItems(next);
              }}
            />
            {item.type === "postback" ? (
              <Textarea
                value={item.payload}
                placeholder="Payload"
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...next[index], payload: event.target.value };
                  setItems(next);
                }}
              />
            ) : (
              <Input
                value={item.url}
                placeholder="https://..."
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...next[index], url: event.target.value };
                  setItems(next);
                }}
              />
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setItems(items.filter((_, current) => current !== index))
                }
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setItems((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  type: "postback",
                  title: "",
                  payload: "",
                  url: "",
                },
              ])
            }
            disabled={items.length >= 5}
          >
            <IconPlus className="mr-2 h-4 w-4" />
            Add item
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={!canSave || setMutation.isPending}
          >
            Save to DB
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            Sync with Meta
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            Clear from Meta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
