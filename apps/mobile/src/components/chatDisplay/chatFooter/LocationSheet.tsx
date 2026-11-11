import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { MapPin, X } from "lucide-react-native";
import { MapPreview } from "@/components/common/MapPreview";
import { Colors } from "@/constants/colors";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { logger } from "@/utils/logger";

/** What the API takes for a location message: every field a string, all four required. */
export type SharedLocation = {
  latitude: string;
  longitude: string;
  name: string;
  address: string;
};

type Place = { name: string; address: string };
type Status = "locating" | "ready" | "denied" | "error";

/** "40 m" or "1.8 km": approximate (Android) fixes are often a kilometre or more out. */
function formatDistance(metres: number) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** A name and an address for the customer's WhatsApp to show under the pin. */
function describe(
  g: Location.LocationGeocodedAddress | undefined,
  lat: number,
  lng: number,
): Place {
  const street = [g?.streetNumber, g?.street].filter(Boolean).join(" ");
  const address =
    g?.formattedAddress ||
    [street, g?.district, g?.city, g?.region, g?.postalCode, g?.country].filter(Boolean).join(", ");
  const name = (g?.name && g.name !== g.streetNumber ? g.name : street) || g?.district || g?.city;
  return {
    name: name || "Shared location",
    address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

/**
 * Shares the agent's current location: asks for permission, finds the phone's position
 * and its street address, shows them on a map, and sends on confirm. The contents mount
 * fresh on every open, so each one starts by finding the location again.
 */
export default function LocationSheet({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (location: SharedLocation) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible ? <LocationSheetContent onClose={onClose} onSend={onSend} /> : null}
    </Modal>
  );
}

function LocationSheetContent({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (location: SharedLocation) => void;
}) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [status, setStatus] = useState<Status>("locating");
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Runs on open, and again on "Try again" (which resets the status first).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (!permission.granted) {
        setCanAskAgain(permission.canAskAgain);
        setStatus("denied");
        return;
      }
      // A recent fix shows the map at once; a fresh one then replaces it.
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 }).catch(() => null);
      if (cancelled) return;
      if (last) {
        setCoords(last.coords);
        setStatus("ready");
      }
      const current = await Location.getCurrentPositionAsync({
        // Android: approximate only. Google Play requires a declaration for precise
        // location (ACCESS_FINE_LOCATION, blocked in app.json), and sharing where the
        // agent is does not need it. iOS asks for precise; the user can still choose
        // approximate there.
        accuracy: Platform.OS === "android" ? Location.Accuracy.Balanced : Location.Accuracy.High,
      });
      if (cancelled) return;
      setCoords(current.coords);
      setStatus("ready");
      const [geocoded] = await Location.reverseGeocodeAsync(current.coords).catch(() => []);
      if (cancelled) return;
      setPlace(describe(geocoded, current.coords.latitude, current.coords.longitude));
    })().catch((err) => {
      logger.warn("Could not get the current location:", err);
      // A fix already on screen is still worth sending.
      if (!cancelled) setStatus((s) => (s === "ready" ? s : "error"));
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setStatus("locating");
    setAttempt((n) => n + 1);
  };

  const send = () => {
    if (!coords) return;
    const { latitude, longitude } = coords;
    const { name, address } = place ?? describe(undefined, latitude, longitude);
    onSend({ latitude: String(latitude), longitude: String(longitude), name, address });
    onClose();
  };

  const mapWidth = width - 32;
  const mapHeight = 180;

  return (
    <>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <View
        style={{
          backgroundColor: t.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: insets.bottom + 16,
          gap: 14,
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ color: t.fg1, fontSize: 17, fontFamily: "Figtree_800ExtraBold" }}>
            Share location
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <X size={22} color={t.fg3} />
          </Pressable>
        </View>

        {status === "ready" && coords ? (
          <>
            <View style={{ borderRadius: 14, overflow: "hidden" }}>
              <MapPreview
                latitude={coords.latitude}
                longitude={coords.longitude}
                width={mapWidth}
                height={mapHeight}
                zoom={16}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <MapPin size={20} color={t.fg3} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: t.fg1, fontSize: 15, fontFamily: "InstrumentSans_600SemiBold" }}
                >
                  {place?.name ?? "Your current location"}
                </Text>
                <Text numberOfLines={2} style={{ color: t.fg3, fontSize: 13, marginTop: 2 }}>
                  {place?.address ?? "Finding the address…"}
                  {coords.accuracy ? ` · within about ${formatDistance(coords.accuracy)}` : ""}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={send}
              accessibilityRole="button"
              style={{
                backgroundColor: Colors.brand.blue,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: "#fff", fontSize: 15, fontFamily: "InstrumentSans_600SemiBold" }}
              >
                Send current location
              </Text>
            </Pressable>
          </>
        ) : (
          <View
            style={{
              height: mapHeight,
              borderRadius: 14,
              backgroundColor: t.surface2,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
              gap: 12,
            }}
          >
            {status === "locating" ? (
              <>
                <ActivityIndicator color={t.fg3} />
                <Text style={{ color: t.fg3, fontSize: 14 }}>Finding your location…</Text>
              </>
            ) : (
              <>
                <Text style={{ color: t.fg1, fontSize: 14, textAlign: "center" }}>
                  {status === "denied"
                    ? "RateUp needs location access to share where you are."
                    : "Couldn't get your location. Check that location is turned on."}
                </Text>
                <Pressable
                  onPress={() =>
                    status === "denied" && !canAskAgain ? void Linking.openSettings() : retry()
                  }
                  accessibilityRole="button"
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: t.border1,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{ color: t.fg1, fontSize: 14, fontFamily: "InstrumentSans_600SemiBold" }}
                  >
                    {status === "denied" && !canAskAgain ? "Open Settings" : "Try again"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </>
  );
}
