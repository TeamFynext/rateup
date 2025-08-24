import {
  Box,
  Button,
  Group,
  Menu,
  MenuProps,
  rem,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAdjustments,
  IconBuildingStore,
  IconBulb,
  IconChevronDown,
  IconCopy,
  IconCreditCardPay,
  IconLink,
  IconPhone,
  IconPlus,
  IconShoppingBag,
  IconShoppingCart,
  IconWaveSine,
  IconWorld,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { WHATSAPP_BUTTON_TYPE } from "../../../../utils/constants";

interface ButtonSelectionProps extends MenuProps {
  handleMenuSelection: (value: string, text?: string) => void;
  flowBtn: boolean;
  btnLen: number;
  disabled?: boolean;
  mpmBtn: boolean;
  checkoutBtn: boolean;
  catalogBtn: boolean;
  spmBtn: boolean;
}
export const ButtonSelection = ({
  handleMenuSelection,
  flowBtn,
  mpmBtn,
  btnLen,
  disabled,
  checkoutBtn,
  catalogBtn,
  spmBtn,
  ...restProps
}: ButtonSelectionProps) => {
  const translations = useTranslations();
  return (
    <Stack gap={4}>
      <Text fz={14} fw={500}>
        {translations("Buttons (Optional)")}
      </Text>
      <Text fz={13}>
        {translations(
          "Insert buttons so your customers can take action and engage with your message!",
        )}
      </Text>

      <Menu shadow="md" width={200} {...restProps}>
        <Menu.Target>
          <Tooltip
            label={translations(
              "Only one button is supported for this type of template. The button text is not editable.",
            )}
            disabled={!disabled}
          >
            <Button
              maw={"min-content"}
              variant="outline"
              radius={12}
              leftSection={<IconPlus size={16} />}
              rightSection={<IconChevronDown size={16} />}
              disabled={disabled}
            >
              {translations("Add Action Button")}
            </Button>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>{translations("Rateup Interactive Buttons")}</Menu.Label>
          <Tooltip
            label={(btnLen > 0 || flowBtn) && "Already added"}
            display={btnLen === 0 ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={btnLen > 0 || flowBtn}
                leftSection={
                  <IconWaveSine style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() => handleMenuSelection(WHATSAPP_BUTTON_TYPE.FLOW)}
              >
                {translations("Whatsapp Flow")}
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={
              (mpmBtn &&
                translations("Remove MPM button to add other buttons")) ||
              (checkoutBtn && "Remove Checkout button to add other buttons") ||
              (catalogBtn &&
                "Remove View Catalog button to add other buttons") ||
              (spmBtn && "Remove SPM button to add other buttons")
            }
            display={
              !mpmBtn && !checkoutBtn && !catalogBtn && !spmBtn
                ? "none"
                : "block"
            }
          >
            <Box>
              <Menu.Item
                disabled={mpmBtn || checkoutBtn || catalogBtn || spmBtn}
                leftSection={
                  <IconWorld style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.WEBSURVEY)
                }
              >
                {translations("Rateup Web Survey")}
              </Menu.Item>
            </Box>
          </Tooltip>
          <Menu.Divider />
          <Menu.Label>{translations("Quick Reply Buttons")}</Menu.Label>
          <Tooltip
            label={
              (mpmBtn &&
                translations("Remove MPM button to add other buttons")) ||
              (catalogBtn &&
                "Remove View Catalog button to add other buttons") ||
              (spmBtn && "Remove SPM button to add other buttons")
            }
            display={!mpmBtn && !catalogBtn && !spmBtn ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={mpmBtn || catalogBtn || spmBtn}
                leftSection={
                  <IconAdjustments
                    style={{ width: rem(14), height: rem(14) }}
                  />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.QUICK_REPLY)
                }
              >
                {translations("Custom")}
              </Menu.Item>
            </Box>
          </Tooltip>
          <Menu.Divider />

          <Menu.Label>{translations("Call-To-Action Buttons")}</Menu.Label>
          <Tooltip
            label={
              (mpmBtn &&
                translations("Remove MPM button to add other buttons")) ||
              (checkoutBtn && "Remove Checkout button to add other buttons") ||
              (catalogBtn &&
                "Remove View Catalog button to add other buttons") ||
              (spmBtn && "Remove SPM button to add other buttons")
            }
            display={
              !mpmBtn && !checkoutBtn && !catalogBtn && !spmBtn
                ? "none"
                : "block"
            }
          >
            <Box>
              <Menu.Item
                disabled={mpmBtn || checkoutBtn || catalogBtn || spmBtn}
                leftSection={
                  <IconPhone style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER)
                }
              >
                {translations("Call phone number")}
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={
              (mpmBtn &&
                translations("Remove MPM button to add other buttons")) ||
              (checkoutBtn && "Remove Checkout button to add other buttons") ||
              (catalogBtn &&
                "Remove View Catalog button to add other buttons") ||
              (spmBtn && "Remove SPM button to add other buttons")
            }
            display={
              !mpmBtn && !checkoutBtn && !catalogBtn && !spmBtn
                ? "none"
                : "block"
            }
          >
            <Box>
              <Menu.Item
                disabled={mpmBtn || checkoutBtn || catalogBtn || spmBtn}
                leftSection={
                  <IconCopy style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE)
                }
              >
                {translations("Copy offer code")}
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={
              (mpmBtn &&
                translations("Remove MPM button to add other buttons")) ||
              (checkoutBtn && "Remove Checkout button to add other buttons") ||
              (catalogBtn &&
                "Remove View Catalog button to add other buttons") ||
              (spmBtn && "Remove SPM button to add other buttons")
            }
            display={
              !mpmBtn && !checkoutBtn && !catalogBtn && !spmBtn
                ? "none"
                : "block"
            }
          >
            <Box>
              <Menu.Item
                disabled={mpmBtn || checkoutBtn || catalogBtn || spmBtn}
                leftSection={
                  <IconLink style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE)
                }
              >
                {translations("Visit website")}
              </Menu.Item>
            </Box>
          </Tooltip>
          <Menu.Divider />

          <Menu.Label>{translations("Catalog Buttons")}</Menu.Label>
          <Tooltip
            label={
              btnLen > 0 && "Remove all buttons to add View catalog button"
            }
            display={!btnLen ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={btnLen > 0}
                leftSection={
                  <IconBuildingStore
                    style={{ width: rem(14), height: rem(14) }}
                  />
                }
                onClick={() =>
                  handleMenuSelection(
                    WHATSAPP_BUTTON_TYPE.CATALOG,
                    "View catalog",
                  )
                }
              >
                View Catalog
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={btnLen > 0 ? "Remove all button to add a MPM button" : ""}
            display={btnLen === 0 ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={btnLen > 0}
                leftSection={
                  <IconShoppingCart
                    style={{ width: rem(14), height: rem(14) }}
                  />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.MPM, "View items")
                }
              >
                MPM (Multi-Product)
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={btnLen > 0 && "Remove all buttons to add SPM button"}
            display={!btnLen ? "none" : "block"}
          >
            <Box>
              <Menu.Item
                disabled={btnLen > 0}
                leftSection={
                  <IconShoppingBag
                    style={{ width: rem(14), height: rem(14) }}
                  />
                }
                onClick={() =>
                  handleMenuSelection(WHATSAPP_BUTTON_TYPE.SPM, "View")
                }
              >
                SPM (Single-Product)
              </Menu.Item>
            </Box>
          </Tooltip>
          <Tooltip
            label={
              flowBtn
                ? translations("Remove flow button to add other buttons")
                : mpmBtn
                  ? translations("Remove MPM button to add other buttons")
                  : catalogBtn
                    ? "Remove View catalog button to add other buttons"
                    : spmBtn
                      ? "Remove SPM button to add other buttons"
                      : ""
            }
            display={
              !flowBtn && !mpmBtn && !catalogBtn && !spmBtn ? "none" : "block"
            }
          >
            <Box>
              <Menu.Item
                disabled={flowBtn || mpmBtn || catalogBtn || spmBtn}
                leftSection={
                  <IconCreditCardPay
                    style={{ width: rem(14), height: rem(14) }}
                  />
                }
                onClick={() =>
                  handleMenuSelection(
                    WHATSAPP_BUTTON_TYPE.ORDER_DETAILS,
                    "Buy now",
                  )
                }
              >
                Checkout Button
              </Menu.Item>
            </Box>
          </Tooltip>
        </Menu.Dropdown>
      </Menu>
      <Group fz={14} gap={"xs"} wrap="nowrap">
        <IconBulb size={16} />
        {translations(
          "If you add more than three buttons, they will appear in a list.",
        )}
      </Group>
    </Stack>
  );
};
