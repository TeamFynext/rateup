import { IconLanguage } from "@tabler/icons-react";
import { useState, useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import i18n from "@/i18n.ts";

type Locale = "en" | "ar" | "de" | "fr" | "hi";

interface Props {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
}

export default function LocaleSwitcherSelect({ defaultValue, items, label }: Readonly<Props>) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);

  function onChange(next: string | null) {
    if (!next) return;
    setValue(next);
    const locale = next as Locale;
    startTransition(() => {
      document.cookie = `i18next=${locale}; path=/; max-age=31536000`;
      void i18n.changeLanguage(locale);
    });
  }

  return (
    <div className="relative">
      <Select value={value} onValueChange={onChange} items={items} disabled={isPending}>
        <SelectTrigger aria-label={label} className="w-full max-w-75">
          <SelectValue />
          <IconLanguage className="h-6 w-6 text-slate-600" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
