import { IconPlus, IconTrash } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  useDeleteInstagramPersistentMenuMutation,
  useInstagramProfile,
  useSetInstagramPersistentMenuMutation,
  useSyncInstagramPersistentMenuMutation,
} from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { InstagramFeatureShell } from "@/components/dashboard/instagram/instagram-feature-shell.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
      description="Create a menu of your business's main features — always visible in the Instagram conversation so users can jump to core actions anytime."
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

function PersistentMenuEditor({ waSettingId }: Readonly<{ waSettingId: string }>) {
  const { data } = useInstagramProfile(waSettingId);
  const setMutation = useSetInstagramPersistentMenuMutation(waSettingId);
  const syncMutation = useSyncInstagramPersistentMenuMutation(waSettingId);
  const deleteMutation = useDeleteInstagramPersistentMenuMutation(waSettingId);
  const locale = "default";
  const [items, setItems] = useState<DraftMenuItem[]>([]);

  useEffect(() => {
    const existing = data?.data.persistentMenu?.[0];
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

  const canSave = useMemo(() => items.some((item) => item.title.trim().length > 0), [items]);

  const updateItem = (index: number, patch: Partial<DraftMenuItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

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
        locale,
        call_to_actions,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          The persistent menu is not updated in real time — existing conversations must refresh
          their inbox to see changes. Limit menu items to 5 for the best user experience. Use
          descriptive titles that highlight your core features. Requires Messenger API support for
          Instagram v226+ on iOS or Android.
        </AlertDescription>
      </Alert>

      <Card className="border-border/70">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Menu entries</CardTitle>
          <CardDescription>
            Use <strong>postback</strong> items for in-conversation actions (triggers a webhook with
            the payload you define) and <strong>web URL</strong> items for off-platform links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-muted-foreground text-xs">{items.length}/5 menu items</p>

          {items.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">Item {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                  disabled={items.length <= 1}
                >
                  <IconTrash className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={item.type}
                  onValueChange={(value: "postback" | "web_url") =>
                    updateItem(index, { type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postback">Postback — triggers a webhook</SelectItem>
                    <SelectItem value="web_url">Web URL — opens a link</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={item.title}
                  placeholder="e.g. Talk to an agent"
                  onChange={(event) => updateItem(index, { title: event.target.value })}
                />
              </div>

              {item.type === "postback" ? (
                <div className="space-y-1.5">
                  <Label>Payload</Label>
                  <Textarea
                    value={item.payload}
                    placeholder="e.g. CARE_HELP"
                    onChange={(event) => updateItem(index, { payload: event.target.value })}
                  />
                  <p className="text-muted-foreground text-xs">
                    Sent to your webhook when the user taps this item. You have 24 hours to respond.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>URL</Label>
                  <Input
                    value={item.url}
                    placeholder="https://www.example.com/"
                    type="url"
                    onChange={(event) => updateItem(index, { url: event.target.value })}
                  />
                </div>
              )}
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
    </div>
  );
}
