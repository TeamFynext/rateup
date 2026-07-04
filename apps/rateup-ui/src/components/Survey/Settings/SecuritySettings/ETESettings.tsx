import { ActionIcon, Badge, Box, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconKey } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAllResponses } from "@/backend/surveys/response/response.query";
import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import RateupSwitch from "@/components/Switch/RateupSwitch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";

import { updateEndToEndEncryption } from "../updateSettings.ts";

// end to end encryption settings module
interface ETESettingsInterface {
  survey: Survey;
}
export default function ETESettings(props: ETESettingsInterface) {
  const { survey } = props;
  const { user } = useUser();
  const navigate = useNavigate();
  const [endtoendencryption, setEndToEndEncryption] = useState(survey?.isEncrypted);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();
  const editSurvey = useEditSurveyMutation(survey?.id);
  const { data: responses } = useAllResponses(survey?.id);
  async function onSwitched(e) {
    if (e.target.checked) {
      if (!user?.encryptionKeys) {
        toast.error(
          translations(
            "You need to generate encryptionKeys first , head on to settings to generate your keys",
          ),
        );
      } else {
        const shouldEnable = await confirm({
          title: translations("End-to-End Encryption"),
          description: translations(
            "Are you sure you want to enable end-to-end encryption? Once enabled it cannot be disabled.",
          ),
          confirmText: translations("Confirm"),
        });

        if (!shouldEnable) return;

        updateEndToEndEncryption(
          setEndToEndEncryption,
          user?.encryptionKeys?.publicKey,
          editSurvey,
        );
      }
    }
  }
  return (
    <>
      <Stack gap={0}>
        <Group justify="space-between">
          <Group>
            <RateupSwitch
              offMessage={translations("Click here to encrypt the response data")}
              onMessage={translations("Click here to disable End-to-End Encryption")}
              disabled={
                (endtoendencryption && !!user?.encryptionKeys) ||
                responses
                  ?.map((responses) => responses?.responses?.length)
                  .some((value) => value > 0)
              }
              checked={endtoendencryption}
              onChange={onSwitched}
            />
            <Box className={"switch-heading-and-desc-container"}>
              <h3>
                <Group>
                  {translations("End-to-End Encryption")}
                  <Badge size="xs" variant="light" color={endtoendencryption ? "lime" : "red"}>
                    {endtoendencryption ? "Enabled" : "Disabled"}
                  </Badge>
                </Group>
              </h3>
              <p>Encrypts the response data</p>
            </Box>
          </Group>

          {!user?.encryptionKeys && (
            <Tooltip
              position="left-end"
              label={translations(
                "You need to generate encryptionKeys first , head on to settings to generate your keys",
              )}
            >
              <ActionIcon
                color="red"
                onClick={() =>
                  navigate({
                    to: "/dashboard/settings/account",
                  })
                }
              >
                <IconKey />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <Text
          mt={"0.3125rem"}
          c={
            responses
              ?.map((responses) => responses?.responses?.length)
              .some((value) => value > 0) && !survey?.isEncrypted
              ? "red"
              : "green"
          }
          size="xs"
          fw={900}
        >
          {responses?.map((responses) => responses?.responses?.length).some((value) => value > 0) &&
          !survey?.isEncrypted
            ? translations("Reset responses to enable end to end encryption")
            : null}
        </Text>
      </Stack>
    </>
  );
}
