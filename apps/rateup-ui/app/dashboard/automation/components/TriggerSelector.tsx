import React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { GROUP_OPERATORS, TRIGGER_EVENTS, TriggerEvent } from "./schema";

interface TriggerSelectorProps {
  value: TriggerEvent;
  operator: "AND" | "OR";
  name: string;
  onChange: (
    triggerEvent: TriggerEvent,
    operator: "AND" | "OR",
    name: string,
  ) => void;
}

const TriggerSelector: React.FC<TriggerSelectorProps> = ({
  value,
  operator,
  name,
  onChange,
}) => (
  <div className="flex flex-col gap-4 p-2">
    <h2 className="font-semibold text-lg mb-2">Trigger & Rule Info</h2>
    <div className="flex gap-4 items-center">
      <div className="flex flex-col gap-1">
        <Label>Rule Name</Label>
        <Input
          value={name}
          onChange={(e) => onChange(value, operator, e.target.value)}
          placeholder="Rule name"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Trigger Event</Label>
        <Select
          value={value}
          onValueChange={(v) => onChange(v as TriggerEvent, operator, name)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select event" />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_EVENTS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Operator</Label>
        <Select
          value={operator}
          onValueChange={(v) => onChange(value, v as "AND" | "OR", name)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operator" />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPERATORS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

export default TriggerSelector;
