import { useEffect } from "react";

import { Card, Group, SelectProps, Skeleton, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

import { MessagePlatform } from "@/types/enums";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";

import { ContainedSelection } from "./ContainedInput/ContainedInput";

interface AccountSelectorProps extends SelectProps {
  onChange?: (teamId: string) => void;
  usePhoneNumber?: boolean;
  withAllOption?: boolean;
  platform?: MessagePlatform | "all";
}
export function AccountSelector({
  value,
  onChange,
  label = "",
  usePhoneNumber = false,
  withAllOption = false,
  platform = MessagePlatform.WHATSAPP,
  ...props
}: Readonly<AccountSelectorProps>) {
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
          <Skeleton w={props?.w ? 40 : 100} h={17} ml={"xs"} />
          <Skeleton w={20} h={17} mr={"xs"} />
        </Group>
      </Card>
    );
  }

  return (
    <ContainedSelection
      allowDeselect={false}
      data={accountOptions}
      defaultValue={accountOptions?.length && accountOptions[0]?.value}
      onChange={onChange}
      value={value}
      label={translations("Account")}
      placeholder={translations("Select Account")}
      nothingFoundMessage={translations("No account found!")}
      required
      {...props}
    />
  );
}
