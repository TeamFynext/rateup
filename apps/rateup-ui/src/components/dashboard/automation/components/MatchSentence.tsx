import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

type MatchOperator = "AND" | "OR";

const MATCH_OPTIONS = [
  { value: "AND", label: "all" },
  { value: "OR", label: "any" },
] as const;

/** "Run when [all ▾] of these {noun} match", read as a sentence next to what it combines. */
export function MatchSentence({
  value,
  onChange,
  noun,
}: Readonly<{
  value: MatchOperator;
  onChange: (operator: MatchOperator) => void;
  /** What is being combined, plural: "conditions", "groups". */
  noun: string;
}>) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
      <span>Run when</span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next === "AND" || next === "OR") onChange(next);
        }}
        items={MATCH_OPTIONS}
      >
        <SelectTrigger size="sm" className="text-foreground font-medium" aria-label="Match">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MATCH_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>of these {noun} match</span>
    </div>
  );
}
