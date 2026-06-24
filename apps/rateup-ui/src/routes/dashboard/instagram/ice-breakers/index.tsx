import { IconPlus, IconTrash } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  useDeleteInstagramIceBreakersMutation,
  useInstagramProfile,
  useSetInstagramIceBreakersMutation,
  useSyncInstagramIceBreakersMutation,
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

export const Route = createFileRoute("/dashboard/instagram/ice-breakers/")({
  component: InstagramIceBreakersPage,
});

type DraftItem = {
  id: string;
  question: string;
  payload: string;
};

function InstagramIceBreakersPage() {
  return (
    <InstagramFeatureShell
      title="Ice Breakers"
      description="Create up to four starter questions that appear when users open your Instagram DM experience."
      secondaryAction={
        <Button asChild variant="outline">
          <Link to="/dashboard/instagram">Back to hub</Link>
        </Button>
      }
    >
      {(waSetting) => <IceBreakerEditor waSettingId={waSetting.id} />}
    </InstagramFeatureShell>
  );
}

function IceBreakerEditor({ waSettingId }: Readonly<{ waSettingId: string }>) {
  const { data } = useInstagramProfile(waSettingId);
  const setMutation = useSetInstagramIceBreakersMutation(waSettingId);
  const syncMutation = useSyncInstagramIceBreakersMutation(waSettingId);
  const deleteMutation = useDeleteInstagramIceBreakersMutation(waSettingId);
  const [items, setItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    setItems(
      data?.data.iceBreakers?.length
        ? data.data.iceBreakers.map((item) => ({
            id: crypto.randomUUID(),
            question: item.question,
            payload: item.payload,
          }))
        : [{ id: crypto.randomUUID(), question: "", payload: "" }],
    );
  }, [data]);

  const canSave = useMemo(
    () => items.some((item) => item.question.trim() || item.payload.trim()),
    [items],
  );

  const save = () => {
    const payload = items
      .map((item) => ({
        question: item.question.trim(),
        payload: item.payload.trim(),
      }))
      .filter((item) => item.question.length || item.payload.length)
      .slice(0, 4);

    setMutation.mutate(payload);
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Ice breaker questions</CardTitle>
        <CardDescription>Meta allows a maximum of four ice breakers for Instagram.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-xl border p-4">
            <Input
              value={item.question}
              placeholder="Question shown to the user"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...next[index], question: event.target.value };
                setItems(next);
              }}
            />
            <Textarea
              value={item.payload}
              placeholder="Payload sent back when this question is tapped"
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...next[index], payload: event.target.value };
                setItems(next);
              }}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setItems(items.filter((_, current) => current !== index))}
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
                { id: crypto.randomUUID(), question: "", payload: "" },
              ])
            }
            disabled={items.length >= 4}
          >
            <IconPlus className="mr-2 h-4 w-4" />
            Add question
          </Button>
          <Button type="button" onClick={save} disabled={!canSave || setMutation.isPending}>
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
