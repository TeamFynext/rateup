import { useContext, useState } from "react";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import type { Wop } from "@/types/global";
import { asAnswerText } from "@/utils/response.ts";

import { DEFAULT_WOP } from "../util.tsx";
import WheelComponent from "../WheelComponent.tsx";

const WOPForm = ({ isPreview = false, wop }: { isPreview: boolean; wop?: Wop }) => {
  const [price, setPrice] = useState("");
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const wopData = wop ? (wop?.segments?.length === 0 ? DEFAULT_WOP : wop) : DEFAULT_WOP;
  return (
    <div className="flex flex-wrap items-center gap-4">
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
        winningSegment={asAnswerText(response) || undefined}
      />
      {!isPreview && price && `You have won ${price}`}
      {!isPreview && response && !price && `You have won ${response}`}
    </div>
  );
};

export default WOPForm;
