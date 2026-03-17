"use client";

import { useEffect, useState } from "react";

import {
  ActionIcon,
  Group,
  Modal,
  Skeleton,
  Stack,
  Tooltip,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useMetaAssets,
  useSyncFbPages,
  useUpsertWaSettingsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";

type WaSetting = WaSettings[number];

export function InstagramConfigModal({
  opened,
  close,
  selectedWaSettings,
}: Readonly<{
  opened: boolean;
  close: () => void;
  selectedWaSettings: WaSetting | null;
}>) {
  const { data: metaAssets, isLoading } = useMetaAssets(selectedWaSettings?.id);
  const upsertMutation = useUpsertWaSettingsMutation();
  const syncfbpageMut = useSyncFbPages(selectedWaSettings?.id);
  const translations = useExtracted();
  const initialConfig = { fbPageId: null, pageAccessToken: null, ibaId: null };
  const [config, setConfig] = useState(initialConfig);

  useEffect(() => {
    if (!selectedWaSettings) return;
    setConfig({
      fbPageId: selectedWaSettings.fbPageId,
      pageAccessToken: selectedWaSettings.pageAccessToken,
      ibaId: selectedWaSettings.ibaId,
    });
  }, [selectedWaSettings]);

  const fbPages = metaAssets
    ? metaAssets.pages.map((page) => ({ value: page.id, label: page.name }))
    : [];

  if (!selectedWaSettings) return null;
  const { id, ...rest } = selectedWaSettings;

  return (
    <Modal
      opened={opened}
      title={translations("Connected Instagram account - FB Page")}
      centered
      onClose={close}
    >
      <Stack>
        <Skeleton visible={isLoading}>
          <Group gap="xs">
            <ContainedSelection
              data={fbPages}
              value={config.fbPageId}
              placeholder={translations("Select Page")}
              nothingFoundMessage={translations("No Pages found")}
              label={translations("Instagram Connected Facebook Page")}
              onChange={(value) => {
                if (!value) {
                  setConfig(initialConfig);
                  return;
                }

                const page = metaAssets?.pages.find(
                  (item) => item.id === value,
                );
                if (!page?.instagram_business_account) {
                  toast.error(
                    translations(
                      "Instagram account not found. Try after syncing page or choose another page",
                    ),
                  );
                  return;
                }

                setConfig({
                  fbPageId: page.id,
                  pageAccessToken: page.access_token,
                  ibaId: page.instagram_business_account.id,
                });
              }}
            />
            <Tooltip label={translations("Sync FB pages")}>
              <ActionIcon
                variant="light"
                mt={20}
                onClick={() => syncfbpageMut.mutate()}
                loading={syncfbpageMut.isPending}
              >
                <IconRefresh size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Skeleton>

        <Group justify="flex-end">
          <RateupButtonBlue
            w="fit-content"
            title={
              selectedWaSettings.fbPageId?.length && !config.fbPageId
                ? translations("Disconnect")
                : translations("Connect")
            }
            onClick={() => {
              const data = {
                ...rest,
                fbPageId: config.fbPageId,
                ibaId: config.ibaId,
                pageAccessToken: config.pageAccessToken,
                teams: undefined,
              };

              if (
                !selectedWaSettings.fbPageId?.length &&
                !data.fbPageId?.length
              ) {
                toast.warning(translations("Please select a page"));
                return;
              }

              upsertMutation.mutate(data, { onSuccess: () => close() });
            }}
            loading={upsertMutation.isPending}
          />
        </Group>
      </Stack>
    </Modal>
  );
}
