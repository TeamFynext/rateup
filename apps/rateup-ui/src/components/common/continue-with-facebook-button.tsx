import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { FacebookBrandButtonProps } from "@/components/common/facebook-brand-button.tsx";
import { FacebookBrandButton } from "@/components/common/facebook-brand-button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldTitle } from "@/components/ui/field.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import { loadFacebookSdk } from "@/lib/facebook-sdk";
import { MetaLoginAssets } from "@/types/enums.ts";

import { MetaLoginButton } from "./meta-login-button.tsx";

/**
 * Meta's Embedded Signup, start to finish, wherever it is dropped: the brand button
 * opens the asset picker, and {@link MetaLoginButton} runs `FB.login` and registers
 * the business client. Both the channel settings page and the setup guide host it
 * in place rather than sending people somewhere else to connect.
 */
export function ContinueWithFacebookButton({
  className,
  buttonType,
}: Readonly<{
  className?: string;
  /** "login_with" reads "Log in with Facebook"; both wordings are on brand spec. */
  buttonType?: FacebookBrandButtonProps["buttonType"];
}> = {}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t: translations } = useTranslation();
  const [selectedAssets, setSelectedAssets] = useState<string[]>([MetaLoginAssets.WHATSAPP]);
  const assets = Object.values(MetaLoginAssets);

  useEffect(() => {
    void loadFacebookSdk().catch(() => {
      // The login button reports the failure when it is clicked.
    });
  }, []);

  const configId = useMemo(() => {
    if (selectedAssets.length === 1) return import.meta.env.VITE_META_CONFIG_ID;
    if (assets.every((asset) => selectedAssets.includes(asset))) {
      return import.meta.env.VITE_META_CONFIG_ID_ALL;
    }
    if (selectedAssets.length === 2 && selectedAssets.includes(MetaLoginAssets.CATALOGS)) {
      return import.meta.env.VITE_META_CONFIG_ID_WA_CG;
    }

    if (selectedAssets.length === 3) {
      if (selectedAssets.includes(MetaLoginAssets.ADACCOUNTS)) {
        return import.meta.env.VITE_META_CONFIG_ID_WA_AD;
      }
      if (selectedAssets.includes(MetaLoginAssets.INSTAGRAM)) {
        return import.meta.env.VITE_META_CONFIG_ID_WA_IG;
      }
    }

    if (selectedAssets.length === 4) {
      if (selectedAssets.includes(MetaLoginAssets.ADACCOUNTS)) {
        if (selectedAssets.includes(MetaLoginAssets.INSTAGRAM)) {
          return import.meta.env.VITE_META_CONFIG_ID_WA_AD_IG;
        }
        if (selectedAssets.includes(MetaLoginAssets.CATALOGS)) {
          return import.meta.env.VITE_META_CONFIG_ID_WA_AD_CG;
        }
      }
      return import.meta.env.VITE_META_CONFIG_ID_WA_IG_CG;
    }

    return import.meta.env.VITE_META_CONFIG_ID;
  }, [assets, selectedAssets]);

  const error = useMemo(() => {
    if (
      (selectedAssets.includes(MetaLoginAssets.ADACCOUNTS) ||
        selectedAssets.includes(MetaLoginAssets.INSTAGRAM)) &&
      !selectedAssets.includes(MetaLoginAssets.PAGES)
    ) {
      return "Facebook Pages required";
    }
    return null;
  }, [selectedAssets]);

  return (
    <>
      <FacebookBrandButton
        onClick={open}
        buttonType={buttonType}
        className={className}
        label={buttonType === "login_with" ? undefined : translations("Continue with Facebook")}
      />
      <Dialog open={opened} onOpenChange={(next) => (next ? open() : close())}>
        <DialogContent>
          <DialogTitle>Continue with Facebook</DialogTitle>
          <Field>
            <Field>
              <p className="text-sm font-medium">
                Select assets you want to connect
                <span className="text-destructive"> *</span>
              </p>
              <Field className="mt-2">
                {assets.map((asset) => {
                  const checked = selectedAssets.includes(asset);
                  return (
                    <FieldTitle
                      key={asset}
                      className="flex items-center gap-2 font-normal capitalize"
                    >
                      <Checkbox
                        disabled={asset === MetaLoginAssets.WHATSAPP}
                        checked={checked}
                        onCheckedChange={(next) =>
                          setSelectedAssets((prev) =>
                            next ? [...prev, asset] : prev.filter((a) => a !== asset),
                          )
                        }
                      />
                      {asset}
                    </FieldTitle>
                  );
                })}
              </Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </Field>
            <MetaLoginButton
              disabled={Boolean(error)}
              configId={configId}
              selectedAssets={selectedAssets}
            />
          </Field>
        </DialogContent>
      </Dialog>
    </>
  );
}
