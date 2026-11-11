import { Text, View, useColorScheme } from "react-native";
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Phone,
  PlayCircle,
  Reply,
} from "lucide-react-native";
import Image from "@/components/common/Image";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { fillPlaceholders, type TemplateVariable } from "./templateVariables";

/** WhatsApp's own chat colours, so the preview reads as "what the customer sees". */
const WA = {
  light: { wall: "#EFEAE2", bubble: "#FFFFFF", text: "#111B21", meta: "#667781", link: "#027EB5" },
  dark: { wall: "#0B141A", bubble: "#202C33", text: "#E9EDEF", meta: "#8696A0", link: "#53BDEB" },
};

type Props = {
  components: any[] | undefined;
  variables: TemplateVariable[];
  values: Record<string, string>;
  /** Highlight this variable, e.g. the field being typed in. */
  activeKey?: string | null;
};

/** The template as a WhatsApp chat bubble, with the body's variables filled in. */
export default function TemplatePreview({ components, variables, values, activeKey }: Props) {
  const isDark = useColorScheme() === "dark";
  const wa = isDark ? WA.dark : WA.light;
  const t = getInboxRowTheme(isDark);

  const find = (type: string) => components?.find((c) => c?.type?.toUpperCase() === type);
  const header = find("HEADER");
  const body = find("BODY");
  const footer = find("FOOTER");
  const buttons: any[] = find("BUTTONS")?.buttons ?? [];

  const segments = fillPlaceholders(body?.text ?? "", variables, values);

  return (
    <View style={{ backgroundColor: wa.wall, borderRadius: 16, padding: 12 }}>
      <View style={{ maxWidth: "92%" }}>
        <View
          style={{
            backgroundColor: wa.bubble,
            borderRadius: 12,
            borderTopLeftRadius: 4,
            padding: 6,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          }}
        >
          <PreviewHeader header={header} textColor={wa.text} metaColor={wa.meta} />

          {segments.length > 0 && (
            <Text
              style={{
                color: wa.text,
                fontSize: 14.5,
                lineHeight: 20,
                paddingHorizontal: 4,
                paddingTop: 4,
                fontFamily: "InstrumentSans_400Regular",
              }}
            >
              {segments.map((s, i) =>
                s.variable ? (
                  <Text
                    key={i}
                    style={{
                      backgroundColor:
                        s.variable === activeKey
                          ? t.status.new.soft
                          : s.filled
                            ? "transparent"
                            : t.brandSoft,
                      color: s.filled ? wa.text : t.brand,
                      fontFamily: "InstrumentSans_600SemiBold",
                    }}
                  >
                    {s.text}
                  </Text>
                ) : (
                  <Text key={i}>{s.text}</Text>
                ),
              )}
            </Text>
          )}

          {footer?.text ? (
            <Text
              style={{
                color: wa.meta,
                fontSize: 12.5,
                paddingHorizontal: 4,
                paddingTop: 6,
                fontFamily: "InstrumentSans_400Regular",
              }}
            >
              {footer.text}
            </Text>
          ) : null}

          <Text
            style={{
              color: wa.meta,
              fontSize: 11,
              alignSelf: "flex-end",
              paddingHorizontal: 4,
              paddingTop: 2,
            }}
          >
            now
          </Text>
        </View>

        {buttons.map((b, i) => (
          <View
            key={i}
            style={{
              marginTop: 3,
              backgroundColor: wa.bubble,
              borderRadius: 10,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <ButtonIcon type={b?.type} color={wa.link} />
            <Text
              numberOfLines={1}
              style={{ color: wa.link, fontSize: 14, fontFamily: "InstrumentSans_600SemiBold" }}
            >
              {b?.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ButtonIcon({ type, color }: { type?: string; color: string }) {
  switch (type) {
    case "URL":
      return <ExternalLink size={15} color={color} />;
    case "PHONE_NUMBER":
      return <Phone size={15} color={color} />;
    case "QUICK_REPLY":
      return <Reply size={15} color={color} />;
    default:
      return null;
  }
}

function PreviewHeader({
  header,
  textColor,
  metaColor,
}: {
  header: any;
  textColor: string;
  metaColor: string;
}) {
  if (!header) return null;
  const media = header.example?.header_handle?.[0];
  switch (header.format) {
    case "TEXT":
      return (
        <Text
          style={{
            color: textColor,
            fontSize: 15,
            paddingHorizontal: 4,
            paddingTop: 2,
            fontFamily: "InstrumentSans_700Bold",
          }}
        >
          {header.text}
        </Text>
      );
    case "IMAGE":
      return media ? (
        <Image
          source={{ uri: media }}
          contentFit="cover"
          style={{ width: "100%", height: 150, borderRadius: 8 }}
        />
      ) : (
        <MediaPlaceholder label="Image" color={metaColor} icon="image" />
      );
    case "VIDEO":
      return <MediaPlaceholder label="Video" color={metaColor} icon="video" />;
    case "DOCUMENT":
      return <MediaPlaceholder label="Document" color={metaColor} icon="doc" />;
    default:
      return null;
  }
}

function MediaPlaceholder({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon: "image" | "video" | "doc";
}) {
  return (
    <View
      style={{
        height: icon === "doc" ? 56 : 120,
        borderRadius: 8,
        backgroundColor: "rgba(127,127,127,0.12)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
      }}
    >
      {icon === "doc" ? (
        <FileText size={20} color={color} />
      ) : icon === "image" ? (
        <ImageIcon size={24} color={color} />
      ) : (
        <PlayCircle size={28} color={color} />
      )}
      <Text style={{ color, fontSize: 13, fontFamily: "InstrumentSans_600SemiBold" }}>{label}</Text>
    </View>
  );
}
