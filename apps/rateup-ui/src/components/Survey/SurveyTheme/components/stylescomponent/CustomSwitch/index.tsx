import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils";

function CustomSwitch({ className = "", checked, onChange, label }) {
  return (
    <label className={cn("flex w-fit cursor-pointer items-center gap-2.5", className)}>
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={(value) => onChange?.({ target: { checked: value } })}
      />
    </label>
  );
}

export default CustomSwitch;
