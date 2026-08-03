import { IconLocation, IconMapPin } from "@tabler/icons-react";
import type { Point } from "pigeon-maps";
import { Map, Marker } from "pigeon-maps";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { useMessageBodyStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/index.tsx";

const InboxLocationControl = () => {
  const [opened, setOpened] = useState(false);
  const { body, setBody } = useMessageBodyStore();
  function handleLocation(location: { latitude: number; longitude: number; address?: string }) {
    setBody({ ...body, type: "location", location });
    setOpened((o) => !o);
  }
  return (
    <Popover open={opened} onOpenChange={setOpened}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title="location"
            aria-label="location"
            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
          />
        }
      >
        <IconMapPin size={15} />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto">
        <LocationMap
          onCancel={() => {
            setOpened((o) => !o);
          }}
          onGetLocation={handleLocation}
          submitBtnTitle={"send"}
        />
      </PopoverContent>
    </Popover>
  );
};

const LocationMap = ({
  onGetLocation,
  onCancel,
  submitBtnTitle,
}: {
  onGetLocation: (location: { latitude: number; longitude: number; address?: string }) => void;
  onCancel: () => void;
  submitBtnTitle: string;
}) => {
  const [coordinates, setCoordinates] = useState<Point | []>([]);
  const [currentLocation, setCurrentLocation] = useState<Point | []>([]);
  const [permissionStatus, setPermissionStatus] = useState("");

  useEffect(() => {
    if (!currentLocation.length)
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
        if (position) setCurrentLocation([position.coords.latitude, position.coords.longitude]);
      });
    if (currentLocation.length && !coordinates.length) setCoordinates(currentLocation);
    navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      setPermissionStatus(permission.state);
    });
  }, [coordinates, currentLocation, permissionStatus]);

  function handleCancel() {
    setCoordinates(currentLocation);
    onCancel();
  }

  function handleSubmit() {
    onGetLocation({ latitude: coordinates[0] ?? 0, longitude: coordinates[1] ?? 0 });
  }

  if (permissionStatus === "denied") return <p>Browser location access denied</p>;
  if (permissionStatus === "prompt") return <p>loading...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          cancel
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          {submitBtnTitle ?? "next"}
        </Button>
      </div>
      <Map
        height={300}
        width={300}
        center={coordinates.length ? (coordinates as Point) : undefined}
        defaultCenter={[28.704, 77.1025]}
        onClick={({ latLng }) => setCoordinates(latLng)}
      >
        <Marker anchor={[coordinates[0] ?? 0, coordinates[1] ?? 0]} width={25} color="red" />
      </Map>
      <Button
        variant="ghost"
        onClick={() => {
          setCoordinates(currentLocation);
          onGetLocation({
            latitude: currentLocation[0] ?? 0,
            longitude: currentLocation[1] ?? 0,
          });
        }}
      >
        <IconLocation size={15} />
        Send Current location
      </Button>
    </div>
  );
};

export default InboxLocationControl;
