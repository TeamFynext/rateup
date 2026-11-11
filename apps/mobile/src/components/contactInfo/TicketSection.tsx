import { useState } from "react";
import { Alert, Image, Linking, Pressable, Text, View, useColorScheme } from "react-native";
import dayjs from "dayjs";
import { Megaphone, Pencil } from "lucide-react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrgModules } from "@/hooks/useOrgModules";
import { useContactLabels } from "@/api/inbox/contacts/contacts.query";
import {
  useAdReferrals,
  useContactStage,
  useConversationTags,
  useLeadBoard,
  useRemoveFromBoard,
  useSetContactLabels,
  useSetContactStage,
  useSetConversationTags,
  useUpdateConversation,
} from "@/api/inbox/tickets/tickets.query";
import { useTicketRow } from "@/components/chatDisplay/useTicketRow";
import PickerSheet, { type PickerOption } from "@/components/common/PickerSheet";
import TextEditSheet from "@/components/common/TextEditSheet";
import { InfoRow, Section } from "./InfoSection";

/** Coloured chips for tags, labels or a stage; "—" when there are none. */
export function Chips({ items }: { items: PickerOption[] }) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  if (!items.length) {
    return (
      <Text style={{ fontSize: 14, fontFamily: "InstrumentSans_600SemiBold", color: t.fg1 }}>
        —
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: t.pageBg,
            borderWidth: 1,
            borderColor: t.border1,
          }}
        >
          {item.color ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
          ) : null}
          <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_600SemiBold", color: t.fg2 }}>
            {item.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

function EditButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ padding: 6 }}
    >
      <Pencil size={16} color={t.fg3} />
    </Pressable>
  );
}

/**
 * The contact's labels, editable with `contacts.manage`. Labels belong to the customer,
 * so they show on every ticket.
 */
export function ContactLabelsRow({
  contactId,
  fallback,
}: {
  contactId: string;
  /** Labels from the contact record, when the inbox row is not cached. */
  fallback: PickerOption[];
}) {
  const row = useTicketRow(contactId);
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const { data: allLabels = [], isLoading } = useContactLabels();
  const save = useSetContactLabels();
  const current: PickerOption[] = row?.contactLabels ?? fallback;

  return (
    <>
      <InfoRow
        label="Labels"
        value={<Chips items={current} />}
        action={
          can("contacts.manage") ? (
            <EditButton label="Edit labels" onPress={() => setOpen(true)} />
          ) : undefined
        }
      />
      <PickerSheet
        visible={open}
        title="Labels"
        multi
        loading={isLoading}
        saving={save.isPending}
        options={allLabels}
        selectedIds={current.map((l) => l.id)}
        emptyText="No labels yet. Create them on the web, in Contacts."
        onClose={() => setOpen(false)}
        onSave={(ids) =>
          save.mutate(
            { contactId, labels: allLabels.filter((l) => ids.includes(l.id)) },
            { onSuccess: () => setOpen(false) },
          )
        }
      />
    </>
  );
}

/**
 * The open ticket: number, title and description, conversation tags, the customer's
 * lead stage, and the ad they came from. Each part is editable with the permission the
 * server checks for it.
 */
export default function TicketSection({ contactId }: { contactId: string }) {
  const row = useTicketRow(contactId);
  const { can } = usePermissions();
  const { isOn } = useOrgModules();
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const conversationId = row?.conversationId;

  const [editText, setEditText] = useState(false);
  const [editTags, setEditTags] = useState(false);
  const [editStage, setEditStage] = useState(false);

  const update = useUpdateConversation();
  const { data: allTags = [], isLoading: tagsLoading } = useConversationTags(editTags);
  const saveTags = useSetConversationTags();

  const showStage = isOn("pipeline") && can("pipelines.read");
  const board = useLeadBoard(showStage);
  const stage = useContactStage(contactId, showStage && !!board.board);
  const setStage = useSetContactStage();
  const removeFromBoard = useRemoveFromBoard();
  const currentStage = board.stages.find((s) => s.id === stage.data?.stageId);

  const { data: referrals = [] } = useAdReferrals(contactId);
  // The click that opened this ticket, else the latest one.
  const referral = referrals.find((r) => r.conversationId === conversationId) ?? referrals[0];
  const fromThisTicket = !!referral && referral.conversationId === conversationId;
  const freeUntil =
    referral?.sourceType === "ad" ? dayjs(referral.createdAt).add(72, "hour") : null;

  if (!conversationId) return null;

  const confirmRemove = () => {
    const loss = stage.data?.loss;
    const parts = loss
      ? [
          `${loss.notes} note${loss.notes === 1 ? "" : "s"}`,
          `${loss.tasks} task${loss.tasks === 1 ? "" : "s"}`,
          `${loss.activities} timeline entr${loss.activities === 1 ? "y" : "ies"}`,
          `${loss.assignees} assignee${loss.assignees === 1 ? "" : "s"}`,
        ]
      : [];
    Alert.alert(
      "Remove from the board?",
      `This deletes the lead and cannot be undone${parts.length ? `: ${parts.join(", ")} go with it.` : "."}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            removeFromBoard.mutate({ contactId }, { onSuccess: () => setEditStage(false) }),
        },
      ],
    );
  };

  return (
    <>
      <Section label="Ticket">
        <InfoRow label="Ticket" value={row?.ticketNumber ? `#RT-${row.ticketNumber}` : "—"} />
        <InfoRow
          label="Title"
          value={row?.ticketSubject || ""}
          multiline
          action={
            can("inbox.manage") ? (
              <EditButton label="Edit title and description" onPress={() => setEditText(true)} />
            ) : undefined
          }
        />
        <InfoRow label="Description" value={row?.ticketDescription || ""} multiline />
        <InfoRow
          label="Tags"
          value={<Chips items={row?.conversationTags ?? []} />}
          action={
            can("contacts.manage") ? (
              <EditButton label="Edit tags" onPress={() => setEditTags(true)} />
            ) : undefined
          }
          last={!(showStage && board.board)}
        />
        {showStage && board.board ? (
          <InfoRow
            label="Lead stage"
            value={
              currentStage ? (
                <Chips items={[currentStage]} />
              ) : stage.isLoading ? (
                "…"
              ) : (
                "Not on the board"
              )
            }
            action={
              can("pipelines.manage") ? (
                <EditButton label="Change lead stage" onPress={() => setEditStage(true)} />
              ) : undefined
            }
            last
          />
        ) : null}
      </Section>

      {referral ? (
        <Section label={fromThisTicket ? "Came from an ad" : "Earlier ad click"}>
          <Pressable
            disabled={!referral.sourceUrl}
            onPress={() => referral.sourceUrl && Linking.openURL(referral.sourceUrl)}
            accessibilityRole={referral.sourceUrl ? "link" : "text"}
            style={{ flexDirection: "row", gap: 12, paddingVertical: 12 }}
          >
            {referral.mediaUrl && referral.mediaType !== "video" ? (
              <Image
                source={{ uri: referral.mediaUrl }}
                style={{ width: 56, height: 56, borderRadius: 8 }}
              />
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  backgroundColor: t.surface2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Megaphone size={22} color={t.fg3} />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                numberOfLines={2}
                style={{ color: t.fg1, fontSize: 14, fontFamily: "InstrumentSans_600SemiBold" }}
              >
                {referral.headline || (referral.sourceType === "post" ? "A boosted post" : "An ad")}
              </Text>
              {referral.body ? (
                <Text numberOfLines={2} style={{ color: t.fg3, fontSize: 13 }}>
                  {referral.body}
                </Text>
              ) : null}
              <Text style={{ color: t.fg4, fontSize: 12 }}>
                Clicked {dayjs(referral.createdAt).format("D MMM, h:mm A")}
                {referrals.length > 1 ? ` · ${referrals.length} clicks` : ""}
              </Text>
              {freeUntil && freeUntil.isAfter(dayjs()) ? (
                <Text
                  style={{
                    color: t.success,
                    fontSize: 12,
                    fontFamily: "InstrumentSans_600SemiBold",
                  }}
                >
                  Free replies until {freeUntil.format("D MMM, h:mm A")}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Section>
      ) : null}

      <TextEditSheet
        visible={editText}
        title="Ticket"
        saving={update.isPending}
        fields={[
          { key: "subject", label: "Title", value: row?.ticketSubject ?? "" },
          {
            key: "description",
            label: "Description",
            value: row?.ticketDescription ?? "",
            multiline: true,
          },
        ]}
        onClose={() => setEditText(false)}
        onSave={(v) =>
          update.mutate(
            {
              contactId,
              conversationId,
              subject: v.subject.trim() || null,
              description: v.description.trim() || null,
            },
            { onSuccess: () => setEditText(false) },
          )
        }
      />

      <PickerSheet
        visible={editTags}
        title="Conversation tags"
        multi
        loading={tagsLoading}
        saving={saveTags.isPending}
        options={allTags}
        selectedIds={(row?.conversationTags ?? []).map((tag) => tag.id)}
        emptyText="No conversation tags yet. Create them on the web, in Inbox settings."
        onClose={() => setEditTags(false)}
        onSave={(tagIds) =>
          saveTags.mutate(
            { contactId, conversationId, tagIds },
            { onSuccess: () => setEditTags(false) },
          )
        }
      />

      <PickerSheet
        visible={editStage}
        title="Lead stage"
        loading={board.isLoading}
        saving={setStage.isPending}
        options={board.stages}
        selectedIds={stage.data?.stageId ? [stage.data.stageId] : []}
        onClose={() => setEditStage(false)}
        onSave={([stageId]) => {
          const picked = board.stages.find((s) => s.id === stageId);
          if (!picked || picked.id === stage.data?.stageId) {
            setEditStage(false);
            return;
          }
          setStage.mutate({ contactId, stage: picked }, { onSuccess: () => setEditStage(false) });
        }}
        footer={
          stage.data?.leadId ? (
            <Pressable
              onPress={confirmRemove}
              disabled={removeFromBoard.isPending}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: t.border1,
              }}
            >
              <Text
                style={{ color: t.danger, fontSize: 15, fontFamily: "InstrumentSans_600SemiBold" }}
              >
                Remove from the board
              </Text>
            </Pressable>
          ) : null
        }
      />
    </>
  );
}
