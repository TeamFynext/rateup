import { ColorInput } from "@mantine/core";

interface CustomColorInputProps {
  value: string;
  onChange: (value: string) => void;
}
export default function CustomColorInput({
  onChange,
  value,
}: CustomColorInputProps) {
  return <ColorInput value={value} onChange={(value) => onChange(value)} />;
}
