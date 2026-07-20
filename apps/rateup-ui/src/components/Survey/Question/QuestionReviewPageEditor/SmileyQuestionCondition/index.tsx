import { mapSmileyIcon } from "@/components/Survey/TakeSurvey/TakeSurveyComponent/SmileyRating/index.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SmileyResponse } from "@/types/enums.ts";

function SmileyQuestionCondition({ currentSelectedEmojis, setState }) {
  const updateSmileyResponse = (value) => {
    const newState = currentSelectedEmojis?.includes(value)
      ? currentSelectedEmojis.filter((smiley) => smiley !== value)
      : [...currentSelectedEmojis, value];
    setState({ reqOptions: newState });
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">
        Select minimum rating for enabling review page
      </span>
      <div className="flex items-center gap-2">
        {Object.values(SmileyResponse).map((value) => {
          const isSelected = currentSelectedEmojis?.includes(value);
          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-pressed={isSelected}
              onClick={() => updateSmileyResponse(value)}
            >
              {mapSmileyIcon(value, isSelected ? "red" : "dark")}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default SmileyQuestionCondition;
