import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconEdit,
  IconSearch,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  useAddNewContactFromCSVMutation,
  useContactGroupById,
  useDeleteGroupMutation,
} from "../../../backend/campaign/contactGroup/contactGroup.query";
import { useGetContactTags } from "../../../backend/whatsapp/settings/waSettings.query";
import AddCustomerModal from "../../../components/Contacts/AddCustomerModal";
import CreateGroupModal from "../../../components/Contacts/CreateGroupModal";
import { ParticipantMenu } from "../../../components/Contacts/GroupParticipant";
import {
  WhatsappTableType,
  contactColumn,
} from "../../../components/Contacts/utils/utils";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import ContactTable from "../../../components/Table/ContactTable";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useRouteParams } from "../../../context/RouteParamsContext";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import ContactImportErrorModal from "../../../components/Contacts/ContactImportErrorModal";

export default function ContactGroup() {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { groupId } = router.query;
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const { update } = useRouteParams();
  const { isPending, data: cTags } = useGetContactTags();
  const createNewContactsFromCSV = useAddNewContactFromCSVMutation(
    groupId?.toString(),
  );

  const {
    isPending: isLoading,
    data: groupDetails,
    error: groupByIderror,
    refetch: refetchgroupById,
  } = useContactGroupById(groupId?.toString());

  const deleteGroupMutation = useDeleteGroupMutation();

  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Delete Group",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this group? This action is destructive
          and you will have to contact support to restore your data.
        </Text>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () => deleteContactGroup(),
    });
  };
  const deleteContactGroup = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        router.push("/dashboard/contacts?tab=groups");
      },
    });
  };

  useEffect(() => {
    update({ groupId: groupDetails?.name });
  }, [groupDetails?.name]);

  const filteredCustomerList = searchTerm
    ? groupDetails?.contacts?.filter((contact) => {
        return (
          contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact?.phone?.startsWith(searchTerm)
        );
      })
    : groupDetails?.contacts;
  const column: ColumnDef<any>[] = [
    ...contactColumn(cTags?.contactTags ?? []),
    {
      header: () => "Action",
      accessorFn: (row) => row,
      enableSorting: false,
      enableColumnFilter: false,
      id: "action",
      cell: (info) => (
        <ParticipantMenu
          contactId={info.row.original.id}
          groupId={groupDetails?.id}
        />
      ),
    },
  ];

  return (
    <>
      {isLoading || isPending ? (
        <Center>
          <Loader type="bars" />
        </Center>
      ) : (
        <Box mt={4}>
          <ContactImportErrorModal
            body={createNewContactsFromCSV?.error?.response?.data}
            isError={createNewContactsFromCSV.isError}
          />
          <Stack>
            <PaperLayout>
              <Group justify="space-between">
                <Group>
                  <Avatar
                    src={
                      groupDetails?.icon &&
                      getFileUrlFromKey(groupDetails?.icon)
                    }
                    alt="profile pic"
                    size={"xl"}
                    radius={"md"}
                  >
                    <IconUsersGroup size={40} />
                  </Avatar>
                  <Stack gap={0}>
                    <Title>{groupDetails?.name}</Title>
                    <Group>
                      <Button
                        leftSection={<IconEdit></IconEdit>}
                        onClick={openEditModal}
                        variant="default"
                      >
                        Edit Profile
                      </Button>
                      <FormModalLayout
                        centered
                        title="Edit Group"
                        opened={openedEditModal}
                        onClose={closeEditModal}
                        size="lg"
                      >
                        <CreateGroupModal
                          groupClose={closeEditModal}
                          isEdit={true}
                          groupDetails={groupDetails}
                        />
                      </FormModalLayout>

                      <Button
                        variant="light"
                        leftSection={<IconTrash></IconTrash>}
                        color="red"
                        onClick={openDeleteModal}
                      >
                        Delete this Group
                      </Button>
                    </Group>
                  </Stack>
                </Group>
                <Group gap={"xl"}>
                  <Badge
                    color="var(--tertiary-color)"
                    variant="outline"
                    size="xl"
                  >
                    {groupDetails?.team?.name}
                  </Badge>
                  <Stack gap={0}>
                    <Center>
                      <Title c="var(--tertiary-color)" order={3}>
                        {groupDetails?.contacts?.length}
                      </Title>
                    </Center>
                    <Text>members</Text>
                  </Stack>
                </Group>
              </Group>
            </PaperLayout>
            <Box mt={"xs"}>
              <Group justify="space-between">
                <Title order={2}>Members</Title>
                <TextInput
                  leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
                  radius="xl"
                  size="md"
                  placeholder={"Search member"}
                  rightSectionWidth={60}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  w={500}
                />
                <Box w={50} h={50} />
              </Group>

              <PaperLayout mt={"xs"} px={0}>
                <ContactTable
                  columns={column}
                  data={filteredCustomerList}
                  cTags={cTags?.contactTags}
                  tab={WhatsappTableType.MEMBERS}
                  topHeight={420}
                  open={open}
                  groupId={groupDetails?.id}
                  refetch={refetchgroupById}
                />
              </PaperLayout>
            </Box>
          </Stack>
          <FormModalLayout
            onClose={close}
            opened={opened}
            title={`Add members`}
            size="xl"
            centered
          >
            <AddCustomerModal
              groupId={groupDetails?.id}
              close={close}
              teamId={groupDetails?.teamId}
              existingContactIds={groupDetails?.contacts?.map((c) => c.id)}
              tags={cTags?.contactTags}
              createNewContactsFromCSV={createNewContactsFromCSV}
            />
          </FormModalLayout>
        </Box>
      )}
    </>
  );
}
