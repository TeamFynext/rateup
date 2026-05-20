"use client";

import { useContext, useState } from "react";

import { Group } from "@mantine/core";

import type { Wop } from "@/types/global";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { DEFAULT_WOP } from "../util.tsx";
import WheelComponent from "../WheelComponent.tsx";

const WOPForm = ({
  isPreview = false,
  wop,
}: {
  isPreview: boolean;
  wop: Wop;
}) => {
  const [price, setPrice] = useState("");
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const wopData = wop
    ? wop?.segments?.length === 0
      ? DEFAULT_WOP
      : wop
    : DEFAULT_WOP;
  return (
    <Group>
      <WheelComponent
        segments={wopData.segments}
        segColors={wopData.segColors}
        onFinished={(winner) => {
          setPrice(winner);
          updateResponse(winner);
        }}
        primaryColor={wopData.primaryColor}
        primaryColoraround={wopData.primaryColoraround}
        contrastColor={wopData.contrastColor}
        imageSrc={wopData?.imageSrc}
        size={wopData?.size}
        isOnlyOnce={!isPreview}
        disable={!!response}
        winningSegment={response}
      />
      {!isPreview && price && `You have won ${price}`}
      {!isPreview && response && !price && `You have won ${response}`}
    </Group>
  );
};

export default WOPForm;

