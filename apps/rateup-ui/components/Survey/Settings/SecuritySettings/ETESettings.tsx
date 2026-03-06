"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconKey } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import RateupSwitch from "@/components/Switch/RateupSwitch";

import { useAllResponses } from "../../../../backend/surveys/response/response.query";
import { useEditSurveyMutation } from "../../../../backend/surveys/surveys.query";
import { useUser } from "../../../../context/UserContext";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import { updateEndToEndEncryption } from "../updateSettings";
import styles from "./SecuritySettings.module.css";

//end to end encryption settings module
interface ETESettingsInterface {
  survey: Survey;
}
export default function ETESettings(props: ETESettingsInterface) {
  const { survey } = props;
  const { user } = useUser();
  const router = useRouter();
  const [endtoendencryption, setEndToEndEncryption] = useState(
    survey?.isEncrypted,
  );
  const translations = useTranslations();
  const [alertModalOpened, { open, close }] = useDisclosure(false);
  const editSurvey = useEditSurveyMutation(survey?.id);
  const { data: responses } = useAllResponses(survey?.id);
  function onSwitched(e) {
    if (e.target.checked) {
      if (!user?.encryptionKeys) {
        toast.error(
          translations(
            "You need to generate encryptionKeys first , head on to settings to generate your keys",
          ),
        );
      } else {
        open();
      }
    }
  }
  return (
    <>
      <ConfirmationModal
        opened={alertModalOpened}
        onClose={close}
        headerTitle={translations("End-to-End Encryption")}
        headerLabel={translations(
          "Are you sure you want to enable end-to-end encryption? Once enabled it cannot be disabled",
        )}
        confirmLabel={translations("Confirm")}
        onConfirm={() =>
          updateEndToEndEncryption(
            setEndToEndEncryption,
            user?.encryptionKeys?.publicKey,
            editSurvey,
          )
        }
      />
      <Stack gap={0}>
        <Group justify="space-between">
          <Group>
            <RateupSwitch
              offMessage={translations(
                "Click here to encrypt the response data",
              )}
              onMessage={translations(
                "Click here to disable End-to-End Encryption",
              )}
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
                  <Badge
                    size="xs"
                    variant="light"
                    color={endtoendencryption ? "lime" : "red"}
                  >
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
                onClick={() => router.push("/dashboard/settings/account")}
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
          {responses
            ?.map((responses) => responses?.responses?.length)
            .some((value) => value > 0) && !survey?.isEncrypted
            ? translations("Reset responses to enable end to end encryption")
            : null}
        </Text>
      </Stack>
    </>
  );
}
