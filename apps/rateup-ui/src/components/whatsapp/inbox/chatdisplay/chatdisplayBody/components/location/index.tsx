import { Map, Marker } from "pigeon-maps";

import type { WaSendMessageBody } from "@/types/global";

const WaInboxLocation = ({ messageContent }: { messageContent: WaSendMessageBody["location"] }) => {
  const { latitude, longitude, name, address } = messageContent;

  return (
    <div
      className="flex w-full max-w-67.5 cursor-pointer flex-col gap-0.5"
      onClick={() =>
        window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, "_blank")
      }
    >
      {/* No `width`: pigeon-maps measures its container (ResizeObserver) when the
          prop is absent, so the tiles follow the bubble instead of spilling out
          of it. `defaultWidth` is only the pre-measurement guess. */}
      <div className="h-50 w-full overflow-hidden rounded-md border border-border">
        <Map defaultWidth={270} height={200} center={[latitude, longitude]}>
          <Marker />
        </Map>
      </div>
      {name && <p className="text-sm font-semibold mt-1 min-w-0">{name}</p>}
      {address && <p className="text-xs text-muted-foreground leading-snug min-w-0">{address}</p>}
    </div>
  );
};

export default WaInboxLocation;
