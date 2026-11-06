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
import type { Locale } from "@/utils/locale.ts";

interface Props {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
  /** Called with the new locale after the cookie and i18n are updated. */
  onLocaleChange?: (locale: Locale) => void;
}

export default function LocaleSwitcherSelect({
  defaultValue,
  items,
  label,
  onLocaleChange,
}: Readonly<Props>) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);

  function onChange(next: string | null) {
    if (!next) return;
    setValue(next);
    const locale = next as Locale;
    startTransition(() => {
      document.cookie = `i18next=${locale}; path=/; max-age=31536000`;
      void i18n.changeLanguage(locale);
      onLocaleChange?.(locale);
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
