import React from "react";

interface DropdownProps {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  className = "",
  disabled,
}) => (
  <select
    className={`border rounded px-2 py-1 focus:outline-none focus:ring ${className}`}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

export default Dropdown;
