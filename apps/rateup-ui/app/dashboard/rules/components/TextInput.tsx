import React from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder,
  multiline,
  className = "",
  disabled,
}) => {
  if (multiline) {
    return (
      <textarea
        className={`border rounded px-2 py-1 w-full focus:outline-none focus:ring ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
      />
    );
  }
  return (
    <input
      type="text"
      className={`border rounded px-2 py-1 w-full focus:outline-none focus:ring ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

export default TextInput;
