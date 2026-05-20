"use client";

import { useEffect, useMemo, useState } from "react";

import { Checkbox, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandMeta } from "@tabler/icons-react";

import { MetaLoginAssets } from "@/types/enums.ts";
import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";

import { MetaLoginButton } from "./meta-login-button.tsx";

const initFacebookSdk = () => {
  return new Promise<void>((resolve) => {
    globalThis.fbAsyncInit = function () {
      globalThis.FB.init({
        appId: import.meta.env.VITE_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
      });
      resolve();
    };
  });
};

export function ConnectMetaAccountButton() {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([
    MetaLoginAssets.WHATSAPP,
  ]);
  const assets = Object.values(MetaLoginAssets);

  useEffect(() => {
    initFacebookSdk();
  }, []);

  const configId = useMemo(() => {
    if (selectedAssets.length === 1)
      return import.meta.env.VITE_META_CONFIG_ID;
    if (assets.every((asset) => selectedAssets.includes(asset))) {
      return import.meta.env.VITE_META_CONFIG_ID_ALL;
    }
    if (
      selectedAssets.length === 2 &&
      selectedAssets.includes(MetaLoginAssets.CATALOGS)
    ) {
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
      <RateupButtonBlue
        title="Add Account"
        onClick={open}
        leftIcon={<IconBrandMeta />}
        radius="sm"
      />
      <Modal opened={opened} onClose={close} centered>
        <Stack>
          <Checkbox.Group
            defaultValue={[MetaLoginAssets.WHATSAPP]}
            label="Select assets you want to connect"
            withAsterisk
            value={selectedAssets}
            onChange={setSelectedAssets}
            error={error}
          >
            <Stack mt="xs">
              {assets.map((asset) => (
                <Checkbox
                  disabled={asset === MetaLoginAssets.WHATSAPP}
                  value={asset}
                  key={asset}
                  label={asset}
                  styles={{ label: { textTransform: "capitalize" } }}
                />
              ))}
            </Stack>
          </Checkbox.Group>
          <MetaLoginButton
            disabled={Boolean(error)}
            configId={configId}
            selectedAssets={selectedAssets}
          />
        </Stack>
      </Modal>
    </>
  );
}
