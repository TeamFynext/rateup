import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import styles from "./FlowCard.module.css";
import { useRouter } from "next/router";
import { useDisclosure } from "@mantine/hooks";
import { IconCopy, IconDotsVertical, IconTrash } from "@tabler/icons-react";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import {
  useCloneFlowsMutation,
  useDeleteFlowMutation,
} from "../../../../backend/whatsapp/flow/flow.query";
import { useTimeSince } from "../../../../hooks/timeSince";
import { WaFlowStatus } from "../../../../types/enums";
import { notifications } from "@mantine/notifications";

interface FlowCardProps {
  name: string;
  status: WaFlowStatus;
  dbFlowId: string;
  createdAt: Date;
}
function FlowCard({ name, status, dbFlowId, createdAt }: FlowCardProps) {
  const router = useRouter();
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [cloneDialogOpened, { toggle: toggleClone, close: closeClone }] =
    useDisclosure(false);

  const deleteMutation = useDeleteFlowMutation();
  const cloneFlowsMutation = useCloneFlowsMutation();

  const timeSince = useTimeSince(createdAt);
  return (
    <Box
      className={styles["flow-card-div"]}
      onClick={() => router.push(`/dashboard/whatsapp/flows/${dbFlowId}`)}
    >
      <Box className={styles["flow-card-content"]}>
        <Flex gap={4} mb={"xs"}>
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
              opened={cloneDialogOpened}
              onClose={closeClone}
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
                cloneFlowsMutation.mutate(dbFlowId);
                closeClone();
              }}
            />
            <Menu.Target>
              <ActionIcon
                onClick={(e) => {
                  e.stopPropagation();
                }}
                variant="subtle"
              >
                <IconDotsVertical size={20} />
              </ActionIcon>
            </Menu.Target>
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
                    onClick={toggleClone}
                    disabled={status !== WaFlowStatus.PUBLISHED}
                  >
                    Copy & Renew Flow
                  </Menu.Item>
                </Box>
              </Tooltip>
            </Menu.Dropdown>
          </Menu>
        </Flex>
        <Text c="dimmed" fz={"sm"} mb={4}>
          Created {timeSince}
        </Text>
        <Badge className={styles[`${status.toLowerCase()}-badge`]}>
          {status}
        </Badge>
      </Box>
    </Box>
  );
}

export default FlowCard;
