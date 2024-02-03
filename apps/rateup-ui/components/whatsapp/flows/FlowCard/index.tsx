import { ActionIcon, Badge, Box, Flex, Menu, Text } from "@mantine/core";
import styles from "./FlowCard.module.css";
import { useRouter } from "next/router";
import { useDisclosure } from "@mantine/hooks";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import { useDeleteFlowMutation } from "../../../../backend/whatsapp/flow/flow.query";
import { useTimeSince } from "../../../../hooks/timeSince";

function FlowCard({ name, status, dbFlowId, createdAt }) {
  const router = useRouter();
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const deleteMutation = useDeleteFlowMutation();

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
              <Menu.Item leftSection={<IconTrash size={16} />} onClick={toggle}>
                Delete
              </Menu.Item>
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
