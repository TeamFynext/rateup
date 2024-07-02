import {
  MenuProps,
  Stack,
  Menu,
  Button,
  rem,
  Group,
  Text,
  Tooltip,
  Box,
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
  IconWorld,
} from "@tabler/icons-react";
import { WHATSAPP_BUTTON_TYPE } from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";

interface ButtonSelectionProps extends MenuProps {
  handleMenuSelection: (value: string) => void;
  flowBtn: boolean;
  btnLen: number;
  disabled?: boolean;
}
export const ButtonSelection = ({
  handleMenuSelection,
  flowBtn,
  btnLen,
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
            maw={"min-content"}
            variant="outline"
            radius={12}
            leftSection={<IconPlus size={16} />}
            rightSection={<IconChevronDown size={16} />}
            disabled={disabled}
          >
            Add Action Button
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Rateup Interactive Buttons</Menu.Label>
          <Tooltip
            label={
              (btnLen > 0 || flowBtn) &&
              "Remove all button to add a flow button"
            }
            display={!flowBtn || btnLen === 0 ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={btnLen > 0 || flowBtn}
                leftSection={
                  <IconWaveSine style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() => handleMenuSelection(WHATSAPP_BUTTON_TYPE.FLOW)}
              >
                Flow Button
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={flowBtn && "Remove flow button to add other buttons"}
            display={!flowBtn ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={flowBtn}
                leftSection={
                  <IconWorld style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.WEBSURVEY)
                }
              >
                Rateup Web Survey
              </Menu.Item>
            </Box>
          </Tooltip>
          <Menu.Divider />
          <Menu.Label>Quick Reply Buttons</Menu.Label>
          <Tooltip
            label={flowBtn && "Remove flow button to add other buttons"}
            display={!flowBtn ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={flowBtn}
                leftSection={
                  <IconAdjustments
                    style={{ width: rem(14), height: rem(14) }}
                  />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.QUICK_REPLY)
                }
              >
                Custom
              </Menu.Item>
            </Box>
          </Tooltip>
          <Menu.Divider />

          <Menu.Label>Call-To-Action Buttons</Menu.Label>
          <Tooltip
            label={flowBtn && "Remove flow button to add other buttons"}
            display={!flowBtn ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={flowBtn}
                leftSection={
                  <IconPhone style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER)
                }
              >
                Call phone number
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={flowBtn && "Remove flow button to add other buttons"}
            display={!flowBtn ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={flowBtn}
                leftSection={
                  <IconCopy style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE)
                }
              >
                Copy offer code
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={flowBtn && "Remove flow button to add other buttons"}
            display={!flowBtn ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={flowBtn}
                leftSection={
                  <IconLink style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE)
                }
              >
                Visit website
              </Menu.Item>
            </Box>
          </Tooltip>
        </Menu.Dropdown>
      </Menu>
      <Group fz={14} gap={"xs"} wrap="nowrap">
        <IconBulb size={16} />
        If you add more than three buttons, they will appear in a list.
      </Group>
    </Stack>
  );
};
