import { useState } from "react";
import { useUser } from "../../../context/UserContext";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ActionIcon, Group, Stack, Switch, Text, Tooltip } from "@mantine/core";
import { updateEndToEndEncryption } from "./updateSettings";
import { IconInfoCircle, IconKey } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import { showErrorToast } from "../../../utils/notifications";
import { useRouter } from "next/navigation";
import { useAllResponses } from "../../../backend/surveys/response/response.query";

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
  const [alertModalOpened, { open, close }] = useDisclosure(false);
  const editSurvey = useEditSurveyMutation(survey?.id);
  const { data: responses } = useAllResponses(survey?.id);
  function onSwitched(e) {
    if (e.target.checked) {
      if (!user?.encryptionKeys) {
        showErrorToast(
          "You need to generate encryptionKeys first , head on to settings to generate your keys",
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
        headerTitle="End-to-End Encryption"
        headerLabel="Are you sure you want to enable end-to-end encryption? Once enabled it cannot be disabled."
        confirmLabel="Confirm"
        onConfirm={() =>
          updateEndToEndEncryption(
            setEndToEndEncryption,
            user?.encryptionKeys?.publicKey,
            editSurvey,
          )
        }
      />
      <PaperLayout shadow="xl" p={"xl"}>
        <Stack gap={0}>
          <Group justify="space-between">
            <Switch
              disabled={
                (endtoendencryption && !!user?.encryptionKeys) ||
                responses
                  ?.map((responses) => responses?.responses?.length)
                  .some((value) => value > 0)
              }
              label={"End-to-End"}
              size="md"
              checked={endtoendencryption}
              onChange={onSwitched}
            />
            {!user?.encryptionKeys && (
              <Tooltip
                position="left-end"
                label={
                  "You need to generate encryptionKeys first , head on to settings to generate your keys"
                }
              >
                <ActionIcon
                  color="red"
                  onClick={() =>
                    router.push(
                      "/dashboard/settings?activeTab=organization&highlighted=true",
                    )
                  }
                >
                  <IconKey />
                </ActionIcon>
              </Tooltip>
            )}

            <Tooltip
              label={
                "enable end-to-end encryption, once enabled it cannot be disabled"
              }
            >
              <IconInfoCircle color="var(--tertiary-color)" />
            </Tooltip>
          </Group>
          <Text
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
              ? "reset responses to enable end to end encryption"
              : null}
          </Text>
        </Stack>
      </PaperLayout>
    </>
  );
}
