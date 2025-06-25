import { useEffect } from "react";

import { Card, Group, SelectProps, Skeleton, Text } from "@mantine/core";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import useTranslations from "@/dictionaries/useTranslation";

import { ContainedSelection } from "./ContainedInput/ContainedInput";

interface AccountSelectorProps extends SelectProps {
  onChange?: (teamId: string) => void;
  usePhoneNumber?: boolean;
  withAllOption?: boolean;
}
export function AccountSelector({
  value,
  onChange,
  label = "",
  usePhoneNumber = false,
  withAllOption = false,
  ...props
}: Readonly<AccountSelectorProps>) {
  const { data, isPending, isError } = useWaSettings();

  const { translations } = useTranslations();

  let accountOptions = data
    ? data.map((Account) => ({
        value: usePhoneNumber
          ? Account?.phone?.replace("+", "")
          : Account.phoneId,
        label: Account.phone,
      }))
    : [];

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
    return <Text>{translations["Something went wrong!"]}</Text>;
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
      label={translations["Account"]}
      placeholder={translations["Select Account"]}
      nothingFoundMessage={translations["No account found!"]}
      required
      {...props}
    />
  );
}
