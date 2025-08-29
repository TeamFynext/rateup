"use client";

import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Menu,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconDots, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { WaFlowStatus } from "@/types/enums";
import {
  useCloneAndDeprecateFlowsMutation,
  useCloneFlowsMutation,
  useDeleteFlowMutation,
  useDeprecateFlowMutation,
} from "@/backend/whatsapp/flow/flow.query";
import CreatedSinceText from "@/components/DateAndTime/CreatedSinceText";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import styles from "./FlowCard.module.css";

interface FlowCardProps {
  name: string;
  status: WaFlowStatus;
  dbFlowId: string;
  createdAt: Date;
  teamsData?: any;
  version: number;
}
function FlowCard({
  name,
  status,
  dbFlowId,
  createdAt,
  teamsData,
  version,
}: Readonly<FlowCardProps>) {
  const router = useRouter();
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [
    cloneAandRenewOpened,
    { toggle: toggleCloneAndRenew, close: closeCloneAndRenew },
  ] = useDisclosure(false);
  const [cloneDialogOpened, { toggle: toggleClone, close: closeClone }] =
    useDisclosure(false);
  const deleteMutation = useDeleteFlowMutation();
  const deprecateFlowMutation = useDeprecateFlowMutation();
  const cloneFlowsMutation = useCloneFlowsMutation(() => {
    closeClone();
    cloneForm.reset();
  });
  const cloneAndDeprecateFlowsMutation = useCloneAndDeprecateFlowsMutation();
  const teamOptions = teamsData?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  const cloneForm = useForm({
    initialValues: {
      teamId: "",
    },
    validate: {
      teamId: (values) => (values?.length ? null : "Must contain one team"),
    },
  });
  const translations = useTranslations();
  const onSubmit = (values: typeof cloneForm.values) => {
    notifications.show({
      id: "copy",
      loading: true,
      title: translations("Clonning Flow"),
      message: translations("Hold on, your flow is getting clonned"),
      autoClose: false,
      withCloseButton: false,
    });
    cloneFlowsMutation.mutate({
      flowId: dbFlowId,
      teamId: values.teamId,
    });
  };
  return (
    <PaperLayout
      p="md"
      shadow="lg"
      radius="lg"
      hoveractive={true}
      layoutAnimation
      onClick={() =>
        router.push(
          `/dashboard/whatsapp/flows/v${version}/${dbFlowId}${status === WaFlowStatus.PUBLISHED ? "?tab=Result" : ""}`,
        )
      }
    >
      <Stack gap={"1rem"} justify="space-between" h={"100%"}>
        <Flex gap={"1rem"}>
          <h2 className={styles["flow-name-h2"]}>{name}</h2>
          <Menu offset={0} withArrow>
            <ConfirmationModal
              forDeleteFunctionality
              opened={dialogOpened}
              onClose={closeDialog}
              headerLabel={translations("Are you sure to delete this Flow?")}
              headerTitle={translations("Delete Flow?")}
              confirmLabel={translations("Delete")}
              onConfirm={(e) => {
                if (status === WaFlowStatus.DRAFT) {
                  deleteMutation.mutate(dbFlowId);
                } else if (status !== WaFlowStatus.DEPRECATED) {
                  deprecateFlowMutation.mutate(dbFlowId);
                }
                closeDialog();
              }}
            />
            <ConfirmationModal
              forDeleteFunctionality
              opened={cloneAandRenewOpened}
              onClose={closeCloneAndRenew}
              headerLabel={translations(
                "Attention! Copying and renewing this workflow will permanently disable the original one A new, identical copy will be created, but you won't be able to use the old one anymore Think carefully before confirming!",
              )}
              headerTitle={translations("Copy & Renew Flow")}
              confirmLabel={translations("Copy & Renew Flow")}
              onConfirm={(e) => {
                notifications.show({
                  id: "copy-renew",
                  loading: true,
                  title: translations("Copy & Renew whatapp flow"),
                  message: translations(
                    "Hold your flow data is getting Coping & Renew",
                  ),
                  autoClose: false,
                  withCloseButton: false,
                });
                cloneAndDeprecateFlowsMutation.mutate(dbFlowId);
                closeCloneAndRenew();
              }}
            />
            <Menu.Target>
              <ActionIcon
                onClick={(e) => {
                  e.stopPropagation();
                }}
                variant="subtle"
              >
                <IconDots size={20} />
              </ActionIcon>
            </Menu.Target>
            <FormModalLayout
              opened={cloneDialogOpened}
              onClose={() => {
                closeClone();
                cloneForm.reset();
              }}
              title={translations("Clone Whatsapp Flow")}
              centered
              onSubmit={cloneForm.onSubmit(onSubmit)}
              buttonTitle={"Clone"}
              includeCancelButton
            >
              <Stack>
                <Text c="dimmed">
                  {translations(
                    "Select the team in which the whatsapp flow copy to be created",
                  )}
                </Text>
                <ContainedSelection
                  radius="md"
                  placeholder={translations("Select team (type in to search)")}
                  data={teamOptions}
                  searchable
                  styles={{ root: { width: "100%" } }}
                  {...cloneForm.getInputProps("teamId")}
                />
              </Stack>
            </FormModalLayout>
            <Menu.Dropdown
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Tooltip
                label={
                  status !== WaFlowStatus.DRAFT
                    ? translations(
                        "It will be deprecated and will be removed from the system",
                      )
                    : translations("Delete Flow")
                }
              >
                <Box>
                  {" "}
                  {/* HackyFix for tooltip not displaying when Menu.Item is disabled. Wrapping it with an extra element seems to fix it @_@ */}
                  <Menu.Item
                    leftSection={<IconTrash size={16} />}
                    onClick={toggle}
                  >
                    {translations("Delete")}
                  </Menu.Item>
                </Box>
              </Tooltip>
              <Tooltip label={"clone-flow"}>
                <Box>
                  <Menu.Item
                    leftSection={<IconCopy size={16} />}
                    onClick={toggleClone}
                    disabled={status === WaFlowStatus.DEPRECATED}
                  >
                    {translations("Clone")}
                  </Menu.Item>
                </Box>
              </Tooltip>
              <Tooltip
                label={
                  status !== WaFlowStatus.PUBLISHED
                    ? translations(
                        "You can only Copy & Renew Flow in PUBLISHED state",
                      )
                    : translations("Copy & Renew Flow")
                }
              >
                <Box>
                  <Menu.Item
                    leftSection={<IconCopy size={16} />}
                    onClick={toggleCloneAndRenew}
                    disabled={status !== WaFlowStatus.PUBLISHED}
                  >
                    {translations("Copy & Renew Flow")}
                  </Menu.Item>
                </Box>
              </Tooltip>
            </Menu.Dropdown>
          </Menu>
        </Flex>

        <CreatedSinceText createdAt={createdAt} />

        <Badge className={styles[`${status.toLowerCase()}-badge`]}>
          {status}
        </Badge>
      </Stack>
    </PaperLayout>
  );
}

export default FlowCard;
