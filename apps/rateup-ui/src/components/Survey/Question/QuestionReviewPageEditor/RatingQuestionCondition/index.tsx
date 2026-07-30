import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

function RatingQuestionCondition({
  currentMinRating,
  setState,
}: {
  currentMinRating: number;
  setState: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
}) {
  const [hoveredRating, setHoveredRating] = useState(-1);

  const handleChange = (newMinRating: number) => {
    setState({
      minRating: newMinRating,
    });
  };

  return (
    <div className="flex items-center gap-4">
      <span>Select minimum rating for enabling review page:</span>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => {
            const starValue = i + 1;
            const filled =
              hoveredRating !== -1 ? starValue <= hoveredRating : starValue <= currentMinRating;
            return (
              <button
                key={starValue}
                type="button"
                onClick={() => handleChange(starValue)}
                onMouseEnter={() => setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(-1)}
                className="flex items-center justify-center p-0.5"
              >
                <Star
                  className={cn(
                    "size-7",
                    filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                  )}
                />
              </button>
            );
          })}
        </div>
        <span>{`${currentMinRating} stars and above.`}</span>
      </div>
    </div>
  );
}

export default RatingQuestionCondition;
