"use client";

import { useEffect, useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import {
  useDeleteInstagramIceBreakersMutation,
  useDeleteInstagramPersistentMenuMutation,
  useInstagramProfile,
  useSetInstagramIceBreakersMutation,
  useSetInstagramPersistentMenuMutation,
} from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

type WaSetting = WaSettings[number];

type IceBreakerDraft = {
  question: string;
  payload: string;
};

type PersistentMenuItemDraft = {
  type: "postback" | "web_url";
  title: string;
  payload: string;
  url: string;
};

export function InstagramProfileManager({
  waSetting,
}: Readonly<{
  waSetting: WaSetting;
}>) {
  const { data, isLoading } = useInstagramProfile(waSetting.id);
  const setIceBreakersMutation = useSetInstagramIceBreakersMutation(
    waSetting.id,
  );
  const deleteIceBreakersMutation = useDeleteInstagramIceBreakersMutation(
    waSetting.id,
  );
  const setPersistentMenuMutation = useSetInstagramPersistentMenuMutation(
    waSetting.id,
  );
  const deletePersistentMenuMutation = useDeleteInstagramPersistentMenuMutation(
    waSetting.id,
  );

  const [iceBreakers, setIceBreakers] = useState<IceBreakerDraft[]>([]);
  const [persistentMenuLocale, setPersistentMenuLocale] = useState("default");
  const [persistentMenuItems, setPersistentMenuItems] = useState<
    PersistentMenuItemDraft[]
  >([]);

  useEffect(() => {
    if (!data?.data) return;

    setIceBreakers(
      data.data.iceBreakers.map((item) => ({
        question: item.question,
        payload: item.payload,
      })),
    );

    const firstMenu = data.data.persistentMenu?.[0];
    setPersistentMenuLocale(firstMenu?.locale || "default");
    setPersistentMenuItems(
      (firstMenu?.call_to_actions || []).map((item) => ({
        type: item.type,
        title: item.title,
        payload: item.payload || "",
        url: item.url || "",
      })),
    );
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Loading Instagram profile settings...
      </div>
    );
  }

  const saveIceBreakers = () => {
    const payload = iceBreakers
      .map((item) => ({
        question: item.question.trim(),
        payload: item.payload.trim(),
      }))
      .filter((item) => item.question.length || item.payload.length)
      .slice(0, 4);

    setIceBreakersMutation.mutate(payload);
  };

  const savePersistentMenu = () => {
    const call_to_actions = persistentMenuItems
      .map((item) => ({
        type: item.type,
        title: item.title.trim(),
        payload: item.type === "postback" ? item.payload.trim() : undefined,
        url: item.type === "web_url" ? item.url.trim() : undefined,
      }))
      .filter((item) => item.title.length)
      .slice(0, 5);

    setPersistentMenuMutation.mutate([
      {
        locale: persistentMenuLocale.trim() || "default",
        call_to_actions,
      },
    ]);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/70">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Ice Breakers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {iceBreakers.map((item, index) => (
            <div
              key={`${index}-${item.question}`}
              className="space-y-2 rounded-lg border p-3"
            >
              <div className="grid gap-2">
                <Input
                  value={item.question}
                  placeholder="Question"
                  onChange={(event) => {
                    const next = [...iceBreakers];
                    next[index] = {
                      ...next[index],
                      question: event.target.value,
                    };
                    setIceBreakers(next);
                  }}
                />
                <Textarea
                  value={item.payload}
                  placeholder="Payload"
                  onChange={(event) => {
                    const next = [...iceBreakers];
                    next[index] = {
                      ...next[index],
                      payload: event.target.value,
                    };
                    setIceBreakers(next);
                  }}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setIceBreakers(
                      iceBreakers.filter((_, current) => current !== index),
                    )
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
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
                setIceBreakers((current) => [
                  ...current,
                  { question: "", payload: "" },
                ])
              }
              disabled={iceBreakers.length >= 4}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add question
            </Button>
            <Button
              type="button"
              onClick={saveIceBreakers}
              disabled={setIceBreakersMutation.isPending}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteIceBreakersMutation.mutate()}
              disabled={deleteIceBreakersMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Persistent Menu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Input
            value={persistentMenuLocale}
            onChange={(event) => setPersistentMenuLocale(event.target.value)}
            placeholder="Locale, e.g. default or en_US"
          />

          {persistentMenuItems.map((item, index) => (
            <div
              key={`${index}-${item.title}`}
              className="space-y-2 rounded-lg border p-3"
            >
              <div className="grid gap-2">
                <Input
                  value={item.title}
                  placeholder="Title"
                  onChange={(event) => {
                    const next = [...persistentMenuItems];
                    next[index] = { ...next[index], title: event.target.value };
                    setPersistentMenuItems(next);
                  }}
                />
                <Input
                  value={item.type}
                  placeholder="Type: postback or web_url"
                  onChange={(event) => {
                    const value = event.target.value as "postback" | "web_url";
                    const next = [...persistentMenuItems];
                    next[index] = { ...next[index], type: value };
                    setPersistentMenuItems(next);
                  }}
                />
                {item.type === "postback" ? (
                  <Textarea
                    value={item.payload}
                    placeholder="Payload"
                    onChange={(event) => {
                      const next = [...persistentMenuItems];
                      next[index] = {
                        ...next[index],
                        payload: event.target.value,
                      };
                      setPersistentMenuItems(next);
                    }}
                  />
                ) : (
                  <Input
                    value={item.url}
                    placeholder="URL"
                    onChange={(event) => {
                      const next = [...persistentMenuItems];
                      next[index] = { ...next[index], url: event.target.value };
                      setPersistentMenuItems(next);
                    }}
                  />
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPersistentMenuItems(
                      persistentMenuItems.filter(
                        (_, current) => current !== index,
                      ),
                    )
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
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
                setPersistentMenuItems((current) => [
                  ...current,
                  { type: "postback", title: "", payload: "", url: "" },
                ])
              }
              disabled={persistentMenuItems.length >= 5}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
            <Button
              type="button"
              onClick={savePersistentMenu}
              disabled={setPersistentMenuMutation.isPending}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletePersistentMenuMutation.mutate()}
              disabled={deletePersistentMenuMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
