import { Button } from "@/components/ui/button";

export default function ChipGroup({
  value,
  handleChange,
  chipsData,
  multiple = false,
}) {
  const isSelected = (chipValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(chipValue);
    }
    return value === chipValue;
  };

  const onClick = (chipValue) => {
    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      const idx = arr.indexOf(chipValue);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(chipValue);
      }
      handleChange(arr);
    } else {
      if (value === chipValue) {
        return;
      }
      handleChange(chipValue);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-center w-full">
      {chipsData.map((chip) => {
        const active = isSelected(chip.value);
        return (
          <Button
            variant={active ? "default" : "outline"}
            key={chip.value}
            type="button"
            onClick={() => onClick(chip.value)}
            className="min-w-24 w-full sm:max-w-[17vw]"
          >
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}
