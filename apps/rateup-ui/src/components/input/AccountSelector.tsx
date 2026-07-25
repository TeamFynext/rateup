import { X } from "lucide-react";
import { useId, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { MessagePlatform } from "@/types/enums.ts";

import { Button } from "../ui/button.tsx";
import { Field, FieldLabel, FieldTitle } from "../ui/field.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { getChannelOptions } from "./channelOptions.ts";

interface AccountSelectorProps {
  onChange?: any;
  usePhoneNumber?: boolean;
  withAllOption?: boolean;
  platform?: MessagePlatform | "all";
  multiple?: boolean;
  label?: string;
  value?: any;
  hideLabel?: boolean;
  optional?: boolean;
  className?: string;
  filterIds?: string[];
  showClearButton?: boolean;
  disabled?: boolean;
}

export function AccountSelector(props: Readonly<AccountSelectorProps>) {
  const uid = useId();
  const {
    value,
    onChange,
    label = "",
    usePhoneNumber = false,
    withAllOption = false,
    platform = MessagePlatform.WHATSAPP,
    multiple = false,
    hideLabel = false,
    optional = false,
    className,
    filterIds,
    showClearButton = true,
    disabled = false,
  } = props;
  const { data, isPending, isError } = useWaSettings();

  const { t: translations } = useTranslation();
  let accountOptions: { value: string; label: string; status?: string }[] = getChannelOptions(
    data,
    {
      platform,
      usePhoneNumber,
      filterIds,
    },
  );

  if (withAllOption) {
    accountOptions = [{ value: "all", label: "All" }, ...accountOptions];
  }

  const defaultAccountOption =
    accountOptions?.find((account) => account.status !== "DISCONNECTED") ?? accountOptions?.[0];

  useEffect(() => {
    if (value) return;
    if (optional) return;
    if (defaultAccountOption?.value) {
      onChange(defaultAccountOption.value);
    }
  }, [defaultAccountOption, value, optional]);

  if (isError) {
    return <p className="text-sm text-muted-foreground">{translations("Something went wrong!")}</p>;
  }
  if (isPending) {
    return (
      <div className="flex h-10 w-full max-w-60 items-center justify-between rounded-md border px-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-5" />
      </div>
    );
  }
  if (multiple) {
    return (
      <Field className={className}>
        {!hideLabel && (
          <FieldLabel htmlFor={`${uid}-field`} className="text-xs text-muted-foreground">
            {label || translations("Account")}
          </FieldLabel>
        )}
        <MultiSelect
          id={`${uid}-field`}
          options={accountOptions}
          value={value ?? []}
          onValueChange={onChange}
          placeholder={translations("Select Account")}
          emptyIndicator={translations("No account found!")}
          disabled={disabled}
        />
      </Field>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        {!hideLabel && (
          <FieldTitle className="text-xs text-muted-foreground">
            {label ?? translations("Account")}
          </FieldTitle>
        )}
        {optional && value && showClearButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(undefined)}
          >
            <X className="h-3 w-3 mr-1" />
            {translations("Clear")}
          </Button>
        )}
      </div>
      <Select
        value={value}
        defaultValue={optional ? undefined : defaultAccountOption?.value}
        onValueChange={onChange}
        required={!optional}
        disabled={disabled}
        items={accountOptions}
      >
        <SelectTrigger
          className={`!text-xs text-muted-foreground cursor-pointer hover:bg-accent h-9 ${className}`}
        >
          <SelectValue placeholder={translations("Select Account")} />
        </SelectTrigger>
        <SelectContent>
          {accountOptions.map((account) => {
            const isDisconnected = account.status === "DISCONNECTED";
            return (
              <SelectItem
                value={account?.value}
                key={account?.value}
                disabled={isDisconnected}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{account?.label}</span>
                  {isDisconnected && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                      {translations("Disconnected")}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
