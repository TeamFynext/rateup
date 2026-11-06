import { useContext } from "react";

import { Input } from "@/components/ui/input.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { asAnswerText } from "@/utils/response.ts";

import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

export function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  return (
    <FormPaperLayout>
      <Input
        type="number"
        value={parseInt(asAnswerText(response)) === 0 ? 0 : parseInt(asAnswerText(response)) || ""}
        onChange={(e) => {
          const val = e.target.value;
          updateResponse(val === "" ? null : Number(val));
        }}
        className="h-auto w-full border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLastQuestion) {
            nextFn?.(e.currentTarget.value);
          }
        }}
        onClick={handleInputScrollIntoView}
      />
    </FormPaperLayout>
  );
}
