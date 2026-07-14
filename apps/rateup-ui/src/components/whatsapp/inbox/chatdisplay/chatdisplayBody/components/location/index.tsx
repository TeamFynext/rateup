import { Map, Marker } from "pigeon-maps";

import type { WaSendMessageBody } from "@/types/global";

const WaInboxLocation = ({ messageContent }: { messageContent: WaSendMessageBody["location"] }) => {
  const { latitude, longitude, name, address } = messageContent;

  return (
    <div
      className="flex flex-col gap-0.5 w-[270px] cursor-pointer"
      onClick={() =>
        window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, "_blank")
      }
    >
      <div className="w-[270px] h-[200px] overflow-hidden rounded-md border border-border">
        <Map width={270} height={200} center={[latitude, longitude]}>
          <Marker />
        </Map>
      </div>
      {name && <p className="text-sm font-semibold mt-1 min-w-0">{name}</p>}
      {address && <p className="text-xs text-muted-foreground leading-snug min-w-0">{address}</p>}
    </div>
  );
};

export default WaInboxLocation;
