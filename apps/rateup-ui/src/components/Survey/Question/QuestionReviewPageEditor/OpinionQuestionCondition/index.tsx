import { Button } from "@/components/ui/button.tsx";

function OpinionQuestionCondition({ currentMinOpinion, setState }) {
  const handleChange = (newMinOpinion) => {
    return () => {
      setState({
        minOpinion: newMinOpinion,
      });
    };
  };

  return (
    <div className="flex items-center gap-4">
      <span>Select minimum scale value for enabling review page:</span>
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
            <Button
              key={i}
              type="button"
              size="sm"
              variant={currentMinOpinion === i ? "default" : "outline"}
              className="rounded-full"
              onClick={handleChange(i)}
            >
              {i}
            </Button>
          ))}
        </div>
        <span>{`For ${currentMinOpinion} and above.`}</span>
      </div>
    </div>
  );
}

export default OpinionQuestionCondition;
