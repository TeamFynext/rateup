"use client";

import { useTransition } from "react";

import { Select } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";

import { Locale } from "@/i18n/config";
import { setUserLocale } from "@/utils/service/locale";

type Props = {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
};

export default function LocaleSwitcherSelect({
  defaultValue,
  items,
  label,
}: Readonly<Props>) {
  const [isPending, startTransition] = useTransition();

  function onChange(value: string | null) {
    if (!value) return;
    const locale = value as Locale;
    startTransition(() => {
      setUserLocale(locale);
    });
  }

  return (
    <div className="relative">
      <Select
        maw={300}
        aria-label={label}
        data={items}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={isPending}
        rightSection={<IconLanguage className="h-6 w-6 text-slate-600" />}
      />
    </div>
  );
}
