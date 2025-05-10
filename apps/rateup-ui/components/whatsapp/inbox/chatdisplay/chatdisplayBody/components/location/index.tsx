import React from "react";

import { Stack, Text } from "@mantine/core";
import { Map, Marker } from "pigeon-maps";

import { WaSendMessageBody } from "@/types/global";

const WaInboxLocation = ({
  messageContent,
}: {
  messageContent: WaSendMessageBody["location"];
}) => {
  const { latitude, longitude, name, address } = messageContent;

  return (
    <Stack
      gap={2}
      onClick={() =>
        window.open(
          `https://www.google.com/maps?q=${latitude},${longitude}`,
          "_blank",
        )
      }
    >
      <Map width={200} height={200} center={[latitude, longitude]}>
        <Marker />
      </Map>
      <Text fw={500} size="sm">
        {name}
      </Text>
      <Text size="sm" c={"dimmed"}>
        {address}
      </Text>
    </Stack>
  );
};

export default WaInboxLocation;
