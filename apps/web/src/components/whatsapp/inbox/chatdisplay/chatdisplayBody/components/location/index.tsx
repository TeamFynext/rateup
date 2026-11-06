import { Map, Marker } from "pigeon-maps";

import type { WaSendMessageBody } from "@/types/global";

const WaInboxLocation = ({ messageContent }: { messageContent: WaSendMessageBody["location"] }) => {
  const { latitude, longitude, name, address } = messageContent ?? {};

  return (
    <a
      href={`https://www.google.com/maps?q=${latitude},${longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full max-w-67.5 cursor-pointer flex-col gap-0.5"
    >
      {/* No `width`: pigeon-maps measures its container (ResizeObserver) when the
          prop is absent, so the tiles follow the bubble instead of spilling out
          of it. `defaultWidth` is only the pre-measurement guess. */}
      <div className="h-50 w-full overflow-hidden rounded-md border border-border">
        <Map defaultWidth={270} height={200} center={[latitude ?? 0, longitude ?? 0]}>
          <Marker />
        </Map>
      </div>
      {name && <p className="text-sm font-semibold mt-1 min-w-0">{name}</p>}
      {address && <p className="text-xs text-muted-foreground leading-snug min-w-0">{address}</p>}
    </a>
  );
};

export default WaInboxLocation;
