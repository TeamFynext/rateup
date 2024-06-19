import { useContext, useState } from "react";

import { Group } from "@mantine/core";

import WheelComponent from "../WheelComponent";
import { Wop } from "../../../../../types/global";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { DEFAULT_WOP } from "../util";

const WOPForm = ({
  isPreview = false,
  wop,
}: {
  isPreview: boolean;
  wop: Wop;
}) => {
  const [price, setPrice] = useState("");
  const { updateResponse } = useContext(CurrentResponsesContext);

  let wopData = wop
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
      />
      {!isPreview && price && `You have won ${price}`}
    </Group>
  );
};

export default WOPForm;
