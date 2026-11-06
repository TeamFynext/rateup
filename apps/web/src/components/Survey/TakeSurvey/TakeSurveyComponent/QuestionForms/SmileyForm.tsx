import { useContext } from "react";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";

import SmileyRating from "../SmileyRating/index.tsx";

export function SmileyForm({ features }: { features?: Record<string, unknown> }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <div className="flex items-center gap-2.5">
      <SmileyRating updateResponse={updateResponse} response={response} features={features} />
    </div>
  );
}
