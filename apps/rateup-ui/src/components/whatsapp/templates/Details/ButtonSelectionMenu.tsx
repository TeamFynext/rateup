import {
  IconAdjustments,
  IconBuildingStore,
  IconBulb,
  IconChevronDown,
  IconCopy,
  IconCreditCardPay,
  IconInfoCircle,
  IconLink,
  IconPhone,
  IconPlus,
  IconShoppingBag,
  IconShoppingCart,
  IconWaveSine,
  IconWorld,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { WHATSAPP_BUTTON_TYPE } from "@/utils/constants.ts";

interface ButtonSelectionProps {
  handleMenuSelection: (value: string, text?: string) => void;
  flowBtn: boolean;
  btnLen: number;
  disabled?: boolean;
  mpmBtn: boolean;
  checkoutBtn: boolean;
  catalogBtn: boolean;
  spmBtn: boolean;
  category?: "AUTHENTICATION" | "MARKETING" | "UTILITY";
}

interface MenuEntry {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  tooltip?: string;
  onClick: () => void;
}

interface MenuSection {
  label: string;
  items: MenuEntry[];
}

/** Renders one menu item, wrapping it in a tooltip only when a blocking reason applies. */
function MenuEntryItem({ entry }: Readonly<{ entry: MenuEntry }>) {
  const item = (
    <DropdownMenuItem disabled={entry.disabled} onClick={entry.onClick}>
      {entry.icon}
      {entry.label}
    </DropdownMenuItem>
  );
  if (!entry.tooltip) return item;
  return <CustomTooltip trigger={<div>{item}</div>} content={<span>{entry.tooltip}</span>} />;
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
  category,
}: ButtonSelectionProps) => {
  const { t: translations } = useTranslation();

  /** First applicable "remove X first" reason for the given blockers, or "" when unblocked. */
  const blockedBy = (opts: {
    flow?: boolean;
    mpm?: boolean;
    checkout?: boolean;
    catalog?: boolean;
    spm?: boolean;
  }) =>
    (opts.flow && flowBtn && translations("Remove flow button to add other buttons")) ||
    (opts.mpm && mpmBtn && translations("Remove MPM button to add other buttons")) ||
    (opts.checkout && checkoutBtn && "Remove Checkout button to add other buttons") ||
    (opts.catalog && catalogBtn && "Remove View Catalog button to add other buttons") ||
    (opts.spm && spmBtn && "Remove SPM button to add other buttons") ||
    "";

  const ctaBlockers = { mpm: true, checkout: true, catalog: true, spm: true };
  const ctaBlocked = mpmBtn || checkoutBtn || catalogBtn || spmBtn;
  const iconCls = "size-3.5";

  const sections: MenuSection[] =
    category === "AUTHENTICATION"
      ? [
          {
            label: translations("Authentication Buttons"),
            items: [
              {
                icon: <IconCopy className={iconCls} />,
                label: translations("OTP (One-Time Password)"),
                disabled: btnLen > 0,
                tooltip: btnLen > 0 ? translations("Only one authentication button allowed") : "",
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.OTP),
              },
            ],
          },
        ]
      : [
          {
            label: translations("Rateup Interactive Buttons"),
            items: [
              {
                icon: <IconWaveSine className={iconCls} />,
                label: translations("Whatsapp Flow"),
                disabled: btnLen > 0 || flowBtn,
                tooltip: btnLen > 0 || flowBtn ? "Already added" : "",
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.FLOW),
              },
              {
                icon: <IconWorld className={iconCls} />,
                label: translations("Rateup Web Survey"),
                disabled: ctaBlocked,
                tooltip: blockedBy(ctaBlockers),
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.WEBSURVEY),
              },
            ],
          },
          {
            label: translations("Quick Reply Buttons"),
            items: [
              {
                icon: <IconAdjustments className={iconCls} />,
                label: translations("Custom"),
                disabled: mpmBtn || catalogBtn || spmBtn,
                tooltip: blockedBy({ mpm: true, catalog: true, spm: true }),
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.QUICK_REPLY),
              },
            ],
          },
          {
            label: translations("Call-To-Action Buttons"),
            items: [
              {
                icon: <IconPhone className={iconCls} />,
                label: translations("Call phone number"),
                disabled: ctaBlocked,
                tooltip: blockedBy(ctaBlockers),
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER),
              },
              {
                icon: <IconCopy className={iconCls} />,
                label: translations("Copy offer code"),
                disabled: ctaBlocked,
                tooltip: blockedBy(ctaBlockers),
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE),
              },
              {
                icon: <IconLink className={iconCls} />,
                label: translations("Visit website"),
                disabled: ctaBlocked,
                tooltip: blockedBy(ctaBlockers),
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE),
              },
            ],
          },
          {
            label: translations("Catalog Buttons"),
            items: [
              {
                icon: <IconBuildingStore className={iconCls} />,
                label: "View Catalog",
                disabled: btnLen > 0,
                tooltip: btnLen > 0 ? "Remove all buttons to add View catalog button" : "",
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.CATALOG, "View catalog"),
              },
              {
                icon: <IconShoppingCart className={iconCls} />,
                label: "MPM (Multi-Product)",
                disabled: btnLen > 0,
                tooltip: btnLen > 0 ? "Remove all button to add a MPM button" : "",
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.MPM, "View items"),
              },
              {
                icon: <IconShoppingBag className={iconCls} />,
                label: "SPM (Single-Product)",
                disabled: btnLen > 0,
                tooltip: btnLen > 0 ? "Remove all buttons to add SPM button" : "",
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.SPM, "View"),
              },
              {
                icon: <IconCreditCardPay className={iconCls} />,
                label: "Checkout Button",
                disabled: flowBtn || mpmBtn || catalogBtn || spmBtn,
                tooltip: blockedBy({ flow: true, mpm: true, catalog: true, spm: true }),
                onClick: () => handleMenuSelection(WHATSAPP_BUTTON_TYPE.ORDER_DETAILS, "Buy now"),
              },
            ],
          },
        ];

  const trigger = (
    <Button variant="outline" className="max-w-min rounded-xl" disabled={disabled}>
      <IconPlus size={16} />
      {translations("Add Action Button")}
      <IconChevronDown size={16} />
    </Button>
  );

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">{translations("Buttons (Optional)")}</p>
      <p className="text-[13px]">
        {translations(
          "Insert buttons so your customers can take action and engage with your message!",
        )}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            disabled ? (
              <div>
                <CustomTooltip
                  trigger={<div>{trigger}</div>}
                  content={
                    <span>
                      {category === "AUTHENTICATION"
                        ? translations("Only authentication buttons are allowed for this template")
                        : translations(
                            "Only one button is supported for this type of template. The button text is not editable.",
                          )}
                    </span>
                  }
                />
              </div>
            ) : (
              <div>{trigger}</div>
            )
          }
        />

        <DropdownMenuContent className="w-50">
          {sections.map((section, sectionIndex) => (
            <div key={section.label}>
              {sectionIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
              {section.items.map((entry) => (
                <MenuEntryItem key={entry.label} entry={entry} />
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex flex-nowrap items-center gap-2 text-sm">
        <IconBulb size={16} />
        {translations("If you add more than three buttons, they will appear in a list.")}
      </div>
      <div className="flex flex-nowrap items-center gap-2 text-sm text-blue-600">
        <IconInfoCircle size={16} />
        {translations(
          "Custom buttons must be placed either at the beginning or at the end of the button list.",
        )}
      </div>
    </div>
  );
};
