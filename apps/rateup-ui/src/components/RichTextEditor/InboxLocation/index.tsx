import { Flex, Popover, PopoverDropdown, Stack, Text } from "@mantine/core";
import { RichTextEditorControl } from "@mantine/tiptap";
import { IconLocation, IconMapPin } from "@tabler/icons-react";
import type { Point } from "pigeon-maps";
import { Map, Marker } from "pigeon-maps";
import React, { useEffect, useState } from "react";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";
import { useMessageBodyStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/index.tsx";

const InboxLocationControl = () => {
  const [opened, setOpened] = useState(false);
  const { body, setBody } = useMessageBodyStore();
  function handleLocation(location) {
    setBody({ ...body, type: "location", location });
    setOpened((o) => !o);
  }
  return (
    <Popover position="top" opened={opened} onChange={setOpened}>
      <Popover.Target>
        <RichTextEditorControl
          title="location"
          aria-label="location"
          onClick={() => setOpened((o) => !o)}
        >
          <IconMapPin size={15} />
        </RichTextEditorControl>
      </Popover.Target>
      <PopoverDropdown>
        <LocationMap
          onCancel={() => {
            setOpened((o) => !o);
          }}
          onGetLocation={handleLocation}
          submitBtnTitle={"send"}
        />
      </PopoverDropdown>
    </Popover>
  );
};

const LocationMap = ({ onGetLocation, onCancel, submitBtnTitle }) => {
  const [coordinates, setCoordinates] = useState([]);
  const [currentLocation, setCurrentLocation] = useState([]);
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
    onGetLocation({ latitude: coordinates[0], longitude: coordinates[1] });
  }

  if (permissionStatus === "denied") return <Text>Browser location access denied</Text>;
  if (permissionStatus === "prompt") return <Text>loading...</Text>;

  return (
    <Stack>
      <Flex justify={"space-between"}>
        <RateupButtonPrimary variant="light" size="xs" title="cancel" onClick={handleCancel} />
        <RateupButtonPrimary title={submitBtnTitle ?? "next"} size="xs" onClick={handleSubmit} />
      </Flex>
      <Map
        height={300}
        width={300}
        center={coordinates as Point}
        defaultCenter={[28.704, 77.1025]}
        onClick={({ latLng }) => setCoordinates(latLng)}
      >
        <Marker anchor={[coordinates[0], coordinates[1]]} width={25} color="red" />
      </Map>
      <RateupButtonPrimary
        variant="transparent"
        leftIcon={<IconLocation size={15} />}
        title="Send Current location"
        onClick={() => {
          setCoordinates(currentLocation);
          onGetLocation({
            latitude: currentLocation[0],
            longitude: currentLocation[1],
          });
        }}
      />
    </Stack>
  );
};

export default InboxLocationControl;
