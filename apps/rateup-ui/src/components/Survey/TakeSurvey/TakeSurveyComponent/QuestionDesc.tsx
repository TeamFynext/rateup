import { useContext } from "react";
import type { CSSProperties } from "react";

import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { cn } from "@/lib/utils";

function QuestionDesc({
  largeScreen,
  themeStyles,
}: {
  largeScreen: boolean;
  themeStyles?: CSSProperties;
}) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
    <p
      className={cn("mt-2.5 leading-[1.2]", largeScreen ? "text-[15px]" : "text-base")}
      style={themeStyles}
    >
      {selectedQ.description[selectedLanguage]}
    </p>
  );
}

export default QuestionDesc;
