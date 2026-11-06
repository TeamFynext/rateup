import dayjs from "dayjs";
import { ActivityIndicator, View, useColorScheme } from "react-native";
import { Cake, FileText, Mail, MapPin, Sparkles, Tag, User, Users } from "lucide-react-native";

import { useContactFullDetails } from "@/api/inbox/contacts/merge.query";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { genderText } from "@/utils/contactIdentity";

import { InfoRow, Pill, Section, SectionNote } from "./InfoSection";

type Row = {
  key: string;
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  multiline?: boolean;
};

/**
 * Everything else the dashboard keeps about a contact: email, address, birthday, gender,
 * lifecycle stage, audiences, custom fields and notes, from `GET /api/contact/:id/details`.
 * Empty fields are left out, so the card is only as long as what is known.
 */
export default function ContactDetailsSection({ contactId }: Readonly<{ contactId: string }>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const canRead = usePermissions().can("contacts.read");
  const { data, isLoading, isError } = useContactFullDetails(contactId, canRead);
  const icon = (Icon: typeof Mail) => <Icon size={16} color={t.fg3} />;

  const rows: Row[] = [];
  if (data) {
    if (data.email)
      rows.push({ key: "email", label: "Email", value: data.email, icon: icon(Mail) });
    if (data.address) {
      rows.push({
        key: "address",
        label: "Address",
        value: data.address,
        icon: icon(MapPin),
        multiline: true,
      });
    }
    if (data.dob && dayjs(data.dob).isValid()) {
      rows.push({
        key: "dob",
        label: "Birthday",
        value: dayjs(data.dob).format("D MMM YYYY"),
        icon: icon(Cake),
      });
    }
    const gender = genderText(data.gender);
    if (gender) rows.push({ key: "gender", label: "Gender", value: gender, icon: icon(User) });
    if (data.Lifecycle?.name) {
      rows.push({
        key: "lifecycle",
        label: "Lifecycle stage",
        value: data.Lifecycle.name,
        icon: icon(Sparkles),
      });
    }
    const audiences = (data.contactGroups ?? [])
      .map((g) => g.contactGroup)
      .filter((g): g is { id: string; name: string } => !!g?.name);
    if (audiences.length) {
      rows.push({
        key: "audiences",
        label: "Audiences",
        icon: icon(Users),
        value: (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {audiences.map((group) => (
              <Pill key={group.id} text={group.name} />
            ))}
          </View>
        ),
      });
    }
    for (const custom of data.customFields ?? []) {
      if (!custom.value) continue;
      rows.push({
        key: `custom:${custom.fieldId}`,
        label: custom.field?.name ?? "Custom field",
        value:
          custom.field?.type?.toLowerCase() === "date" && dayjs(custom.value).isValid()
            ? dayjs(custom.value).format("D MMM YYYY")
            : custom.value,
        icon: icon(Tag),
        multiline: true,
      });
    }
    if (data.notes?.trim()) {
      rows.push({
        key: "notes",
        label: "Notes",
        value: data.notes.trim(),
        icon: icon(FileText),
        multiline: true,
      });
    }
  }

  if (!canRead) return null;
  return (
    <Section label="Details">
      {isLoading ? (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <SectionNote text="Could not load the details." />
      ) : rows.length === 0 ? (
        <SectionNote text="No other details yet." />
      ) : (
        rows.map((row, index) => (
          <InfoRow
            key={row.key}
            label={row.label}
            value={row.value}
            icon={row.icon}
            multiline={row.multiline}
            last={index === rows.length - 1}
          />
        ))
      )}
    </Section>
  );
}
