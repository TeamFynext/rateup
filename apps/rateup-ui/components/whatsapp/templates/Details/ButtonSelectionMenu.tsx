import {
  MenuProps,
  Stack,
  Menu,
  Button,
  rem,
  Group,
  Text,
} from "@mantine/core";
import {
  IconPlus,
  IconChevronDown,
  IconAdjustments,
  IconCopy,
  IconBulb,
  IconPhone,
  IconLink,
  IconWaveSine,
} from "@tabler/icons-react";
import { WHATSAPP_BUTTON_TYPE } from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";

interface ButtonSelectionProps extends MenuProps {
  handleMenuSelection: (value: string) => void;
  disabled?: boolean;
}
export const ButtonSelection = ({
  handleMenuSelection,
  disabled,
  ...restProps
}: ButtonSelectionProps) => {
  return (
    <Stack gap={4}>
      <Text fz={14} ff={lexend500.style.fontFamily}>
        Buttons (Optional)
      </Text>
      <Text fz={13}>
        Insert buttons so your customers can take action and engage with your
        message!
      </Text>

      <Menu shadow="md" width={200} {...restProps}>
        <Menu.Target>
          <Button
            maw={180}
            variant="outline"
            radius={12}
            leftSection={<IconPlus size={16} />}
            rightSection={<IconChevronDown size={16} />}
            disabled={disabled}
          >
            Add a button
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Quick Reply Buttons</Menu.Label>
          <Menu.Item
            leftSection={
              <IconWaveSine style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={() => handleMenuSelection(WHATSAPP_BUTTON_TYPE.FLOW)}
          >
            Flow
          </Menu.Item>

          <Menu.Item
            leftSection={
              <IconAdjustments style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={() =>
              handleMenuSelection(WHATSAPP_BUTTON_TYPE.QUICK_REPLY)
            }
          >
            Custom
          </Menu.Item>
          <Menu.Divider />

          <Menu.Label>Call-to-action buttons</Menu.Label>
          <Menu.Item
            leftSection={
              <IconPhone style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={() =>
              handleMenuSelection(WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER)
            }
          >
            Call phone number
          </Menu.Item>
          <Menu.Item
            leftSection={
              <IconCopy style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={() =>
              handleMenuSelection(WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE)
            }
          >
            Copy offer code
          </Menu.Item>
          <Menu.Item
            leftSection={
              <IconLink style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={() =>
              handleMenuSelection(WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE)
            }
          >
            Visit website
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Group fz={14} gap={"xs"}>
        <IconBulb size={16} />
        If you add more than three buttons, they will appear in a list.
      </Group>
    </Stack>
  );
};
