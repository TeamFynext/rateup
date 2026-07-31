import { useContext } from "react";

import { Input } from "@/components/ui/input.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { asAnswerText } from "@/utils/response.ts";

import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

export function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  return (
    <FormPaperLayout>
      <Input
        value={asAnswerText(response)}
        onChange={(e) => updateResponse(e.target.value)}
        className="h-auto w-full max-w-[400px] rounded-full border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        onClick={handleInputScrollIntoView}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLastQuestion) {
            nextFn?.(e.currentTarget.value);
          }
        }}
      />
    </FormPaperLayout>
  );
}
