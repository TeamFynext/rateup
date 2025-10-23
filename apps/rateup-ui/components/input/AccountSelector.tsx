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
import { useTranslations } from "next-intl";

import { MessagePlatform } from "@/types/enums";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ContainedMultiSelect,
  ContainedSelection,
} from "./ContainedInput/ContainedInput";

interface CommonAccountSelectorProps {
  onChange?: any;
  usePhoneNumber?: boolean;
  withAllOption?: boolean;
  platform?: MessagePlatform | "all";
  multiple?: boolean;
  label?: string;
  value?: any;
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
    ...restProps
  } = props;
  const { data, isPending, isError } = useWaSettings();

  const translations = useTranslations();
  let accountOptions = [];
  for (const account of data ?? []) {
    if (platform === "all" || platform === MessagePlatform.WHATSAPP)
      accountOptions.push({
        value: usePhoneNumber
          ? account?.phone?.replace("+", "")
          : account.phoneId,
        label: account.phone,
      });
    if (platform === "all" || platform === MessagePlatform.INSTAGRAM)
      if (account.ibaId) {
        accountOptions.push({
          value: account.ibaId,
          label: account.igUserName ?? account.ibaId,
        });
      }
  }

  if (withAllOption) {
    accountOptions = [{ value: "all", label: "All" }, ...accountOptions];
  }

  useEffect(() => {
    if (value) return;
    if (accountOptions.length > 0) {
      onChange(accountOptions[0].value);
    }
  }, [accountOptions, value]);

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
          accountOptions?.length && [accountOptions[0]?.value as string]
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
    <div className="flex flex-col">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <Select
        value={value}
        defaultValue={accountOptions?.length && accountOptions[0]?.value}
        onValueChange={onChange}
        required
      >
        <SelectTrigger className="w-[180px] !text-xs text-muted-foreground cursor-pointer hover:bg-accent">
          <SelectValue placeholder={translations("Select Account")} />
        </SelectTrigger>
        <SelectContent>
          {accountOptions.map((account) => (
            <SelectItem value={account?.value} key={account?.value}>
              {account?.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  return (
    <ContainedSelection
      allowDeselect={false}
      data={accountOptions}
      defaultValue={accountOptions?.length && accountOptions[0]?.value}
      onChange={onChange}
      value={value}
      label={label ?? translations("Account")}
      placeholder={translations("Select Account")}
      nothingFoundMessage={translations("No account found!")}
      required
      // {...props}
    />
  );
}
