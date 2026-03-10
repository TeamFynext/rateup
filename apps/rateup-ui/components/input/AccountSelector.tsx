"use client";

import { useEffect } from "react";

import {
  Card,
  Group,
  MultiSelectProps,
  SelectProps,
  Skeleton,
  Text,
} from "@mantine/core";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { MessagePlatform } from "@/types/enums";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";

import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ContainedMultiSelect } from "./ContainedInput/ContainedInput";

interface CommonAccountSelectorProps {
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
}

type AccountSelectorProps =
  | (CommonAccountSelectorProps & SelectProps)
  | (CommonAccountSelectorProps & MultiSelectProps);

export function AccountSelector(props: Readonly<AccountSelectorProps>) {
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
    ...restProps
  } = props;
  const { data, isPending, isError } = useWaSettings();

  const translations = useTranslations();
  let accountOptions = [];
  for (const account of data ?? []) {
    if (platform === "all" || platform === MessagePlatform.WHATSAPP) {
      const val = usePhoneNumber
        ? account?.phone?.replace("+", "")
        : account.phoneId;

      if (!filterIds || filterIds.includes(val)) {
        accountOptions.push({
          value: val,
          label: account?.phoneDisplayName || account.phone,
          status: account.status,
        });
      }
    }
    if (platform === "all" || platform === MessagePlatform.INSTAGRAM)
      if (account.ibaId) {
        if (!filterIds || filterIds.includes(account.ibaId)) {
          accountOptions.push({
            value: account.ibaId,
            label: account.igUserName ?? account.ibaId,
            status: account.status,
          });
        }
      }
  }

  if (withAllOption) {
    accountOptions = [{ value: "all", label: "All" }, ...accountOptions];
  }

  const defaultAccountOption =
    accountOptions?.find((account) => account.status !== "DISCONNECTED") ??
    accountOptions?.[0];

  useEffect(() => {
    if (value) return;
    if (optional) return;
    if (defaultAccountOption?.value) {
      onChange(defaultAccountOption.value);
    }
  }, [defaultAccountOption, value, optional]);

  if (isError) {
    return <Text>{translations("Something went wrong!")}</Text>;
  }
  if (isPending) {
    return (
      <Card h={40} w={props?.w ?? 240} radius={"md"} withBorder p={0}>
        <Group justify="space-between" w={"100%"} my={"auto"}>
          <Skeleton w={restProps?.w ? 40 : 100} h={17} ml={"xs"} />
          <Skeleton w={20} h={17} mr={"xs"} />
        </Group>
      </Card>
    );
  }
  if (multiple) {
    return (
      <ContainedMultiSelect
        data={accountOptions}
        defaultValue={
          defaultAccountOption?.value
            ? [defaultAccountOption.value as string]
            : undefined
        }
        onChange={onChange}
        value={value}
        label={label ?? translations("Account")}
        placeholder={translations("Select Account")}
        nothingFoundMessage={translations("No account found!")}
        required
      />
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        {!hideLabel && (
          <Label className="text-xs text-muted-foreground">
            {label ?? translations("Account")}
          </Label>
        )}
        {optional && value && (
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
