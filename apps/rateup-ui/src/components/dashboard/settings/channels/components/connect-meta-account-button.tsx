import { useDisclosure } from "@mantine/hooks";
import { IconBrandMeta } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { MetaLoginAssets } from "@/types/enums.ts";

import { MetaLoginButton } from "./meta-login-button.tsx";

const FB_SDK_SCRIPT_ID = "facebook-jssdk";

const initFacebookSdk = () => {
  return new Promise<void>((resolve) => {
    if (globalThis.FB) {
      resolve();
      return;
    }

    globalThis.fbAsyncInit = function () {
      globalThis.FB.init({
        appId: import.meta.env.VITE_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
      });
      resolve();
    };

    if (document.getElementById(FB_SDK_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = FB_SDK_SCRIPT_ID;
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  });
};

export function ConnectMetaAccountButton() {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([MetaLoginAssets.WHATSAPP]);
  const assets = Object.values(MetaLoginAssets);

  useEffect(() => {
    initFacebookSdk();
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
      <Button onClick={open}>
        <IconBrandMeta />
        Connect Meta Account
      </Button>
      <Dialog open={opened} onOpenChange={(next) => (next ? open() : close())}>
        <DialogContent>
          <DialogTitle>Connect Meta account</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                Select assets you want to connect
                <span className="text-destructive"> *</span>
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {assets.map((asset) => {
                  const checked = selectedAssets.includes(asset);
                  return (
                    <Label key={asset} className="flex items-center gap-2 font-normal capitalize">
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
                    </Label>
                  );
                })}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <MetaLoginButton
              disabled={Boolean(error)}
              configId={configId}
              selectedAssets={selectedAssets}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
