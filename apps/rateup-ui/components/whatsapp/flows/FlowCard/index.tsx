import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconClock, IconCopy, IconDots, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import {
  useCloneAndDeprecateFlowsMutation,
  useCloneFlowsMutation,
  useDeleteFlowMutation,
} from "../../../../backend/whatsapp/flow/flow.query";
import { useTimeSince } from "../../../../hooks/timeSince";
import { WaFlowStatus } from "../../../../types/enums";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import FormModalLayout from "../../../Modal/FormModalLayout";
import { ContainedSelection } from "../../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import styles from "./FlowCard.module.css";

interface FlowCardProps {
  name: string;
  status: WaFlowStatus;
  dbFlowId: string;
  createdAt: Date;
  teamsData?: any;
}
function FlowCard({
  name,
  status,
  dbFlowId,
  createdAt,
  teamsData,
}: FlowCardProps) {
  const router = useRouter();
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [
    cloneAandRenewOpened,
    { toggle: toggleCloneAndRenew, close: closeCloneAndRenew },
  ] = useDisclosure(false);
  const [cloneDialogOpened, { toggle: toggleClone, close: closeClone }] =
    useDisclosure(false);
  const deleteMutation = useDeleteFlowMutation();
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

  const timeSince = useTimeSince(createdAt);
  const onSubmit = (values: typeof cloneForm.values) => {
    notifications.show({
      id: "copy",
      loading: true,
      title: "Clonning Flow..",
      message: `Hold on, your flow is getting clonned...`,
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
      onClick={() =>
        router.push(
          `/dashboard/whatsapp/flows/${dbFlowId}${status === WaFlowStatus.PUBLISHED ? "?tab=Result" : ""}`,
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
              headerLabel="Are you sure to delete this Flow?"
              headerTitle="Delete Flow?"
              confirmLabel="Delete"
              onConfirm={(e) => {
                deleteMutation.mutate(dbFlowId);
                closeDialog();
              }}
            />
            <ConfirmationModal
              forDeleteFunctionality
              opened={cloneAandRenewOpened}
              onClose={closeCloneAndRenew}
              headerLabel="Attention! Copying and renewing this workflow will permanently disable the original one. A new, identical copy will be created, but you won't be able to use the old one anymore. Think carefully before confirming!"
              headerTitle="Copy & Renew Flow"
              confirmLabel="Copy & Renew Flow"
              onConfirm={(e) => {
                notifications.show({
                  id: "copy-renew",
                  loading: true,
                  title: "Copy & Renew whatapp flow",
                  message: `Hold.. your flow data is getting Coping & Renew...`,
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
              title={"Clone Whatsapp Flow"}
              centered
              onSubmit={cloneForm.onSubmit(onSubmit)}
              buttonTitle={"Clone"}
              includeCancelButton
            >
              <Stack>
                <Text c="dimmed">
                  Select the team in which the whatsapp flow copy to be created.
                </Text>
                <ContainedSelection
                  radius="md"
                  placeholder="Select team (type in to search)"
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
                    ? "You can only delete flows in DRAFT state"
                    : "Delete Flow"
                }
              >
                <Box>
                  {" "}
                  {/* HackyFix for tooltip not displaying when Menu.Item is disabled. Wrapping it with an extra element seems to fix it @_@ */}
                  <Menu.Item
                    leftSection={<IconTrash size={16} />}
                    onClick={toggle}
                    disabled={status !== WaFlowStatus.DRAFT}
                  >
                    Delete
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
                    Clone
                  </Menu.Item>
                </Box>
              </Tooltip>
              <Tooltip
                label={
                  status !== WaFlowStatus.PUBLISHED
                    ? "You can only Copy & Renew Flow in PUBLISHED state"
                    : "Copy & Renew Flow"
                }
              >
                <Box>
                  <Menu.Item
                    leftSection={<IconCopy size={16} />}
                    onClick={toggleCloneAndRenew}
                    disabled={status !== WaFlowStatus.PUBLISHED}
                  >
                    Copy & Renew Flow
                  </Menu.Item>
                </Box>
              </Tooltip>
            </Menu.Dropdown>
          </Menu>
        </Flex>

        <Stack>
          <Group className={styles["creation-time-text-and-icon-div"]}>
            <Box className={styles["clock-icon-container"]}>
              <IconClock />
            </Box>
            <p>Created {timeSince}</p>
          </Group>
          <Badge className={styles[`${status.toLowerCase()}-badge`]}>
            {status}
          </Badge>
        </Stack>
      </Stack>
    </PaperLayout>
  );
}

export default FlowCard;
