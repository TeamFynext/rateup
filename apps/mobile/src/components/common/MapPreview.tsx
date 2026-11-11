import { Image } from "expo-image";
import { MapPin } from "lucide-react-native";
import { Linking, Platform, Text, View } from "react-native";
import { logger } from "@/utils/logger";

/**
 * A still map with a pin, built from OpenStreetMap tiles (the web inbox's map uses the
 * same tiles), so it needs no API key and no native map SDK. OSM's tile policy asks for a
 * User-Agent naming the app and for the attribution shown in the corner.
 */
const TILE = 256;
const OSM_HEADERS = { "User-Agent": "RateUp-Mobile (https://rateup.app)" };

/** A point's position in pixels on the whole Web Mercator map at `zoom`. */
function worldPixel(latitude: number, longitude: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export function MapPreview({
  latitude,
  longitude,
  width,
  height,
  zoom = 15,
}: {
  latitude: number;
  longitude: number;
  width: number;
  height: number;
  zoom?: number;
}) {
  // The tiles that cover a `width` x `height` window centred on the point.
  const { x, y } = worldPixel(latitude, longitude, zoom);
  const left = x - width / 2;
  const top = y - height / 2;
  const count = 2 ** zoom;
  const tiles: { key: string; uri: string; left: number; top: number }[] = [];
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
      if (ty < 0 || ty >= count) continue;
      const wrapped = ((tx % count) + count) % count;
      tiles.push({
        key: `${tx}/${ty}`,
        uri: `https://tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png`,
        left: tx * TILE - left,
        top: ty * TILE - top,
      });
    }
  }

  return (
    <View style={{ width, height, overflow: "hidden", backgroundColor: "#E5E3DF" }}>
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tile.uri, headers: OSM_HEADERS }}
          cachePolicy="disk"
          transition={150}
          style={{
            position: "absolute",
            left: tile.left,
            top: tile.top,
            width: TILE,
            height: TILE,
          }}
        />
      ))}
      {/* The pin's tip sits on the point. */}
      <View style={{ position: "absolute", left: width / 2 - 16, top: height / 2 - 32 }}>
        <MapPin size={32} color="#FFFFFF" fill="#E5484D" strokeWidth={1.5} />
      </View>
      <Text
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          paddingHorizontal: 4,
          fontSize: 9,
          color: "#333",
          backgroundColor: "rgba(255,255,255,0.75)",
        }}
      >
        © OpenStreetMap
      </Text>
    </View>
  );
}

/** Opens the point in the phone's maps app: Apple Maps on iOS, the default map app on Android. */
export function openInMaps(latitude: number, longitude: number, label?: string) {
  const point = `${latitude},${longitude}`;
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${point}&q=${encodeURIComponent(label || "Location")}`
      : `geo:${point}?q=${point}${label ? `(${encodeURIComponent(label)})` : ""}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${point}`).catch((err) =>
      logger.warn("Could not open maps:", err),
    ),
  );
}
