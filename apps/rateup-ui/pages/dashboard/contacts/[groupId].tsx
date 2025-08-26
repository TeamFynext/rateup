import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconEdit,
  IconSearch,
  IconTrash,
  IconUsersGroup,
} from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import {
  useAddNewContactFromCSVMutation,
  useContactGroupById,
  useDeleteGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { useGetContactTags } from "@/backend/whatsapp/settings/waSettings.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import AddCustomerModal from "@/components/Contacts/AddCustomerModal";
import ContactImportErrorModal from "@/components/Contacts/ContactImportErrorModal";
import CreateGroupModal from "@/components/Contacts/CreateGroupModal";
import { ParticipantMenu } from "@/components/Contacts/GroupParticipant";
import {
  CONTACT_SORT,
  contactColumn,
  WhatsappTableType,
} from "@/components/Contacts/utils/utils";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import { useRouteParams } from "@/context/RouteParamsContext";
import { PAGE_SIZE } from "@/utils/constants";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

export default function ContactGroup() {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const translations = useTranslations();
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
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
    isRefetching,
  } = useContactGroupById(
    groupId?.toString(),
    true,
    pagination,
    searchTerm,
    sorting?.[0],
    columnFilters,
  );

  const deleteGroupMutation = useDeleteGroupMutation();

  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: translations("Delete Group"),
      centered: true,
      children: (
        <Text size="sm">
          {translations(
            "Are you sure you want to delete this group? This action is destructive and you will have to contact support to restore your data.",
          )}
        </Text>
      ),
      labels: { confirm: translations("Ok"), cancel: translations("cancel") },
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
  const loadingState = isLoading || isPending || isRefetching;
  if (groupByIderror) return <ErrorComponent refetch={refetchgroupById} />;

  return (
    <Box h={"100%"}>
      <ContactImportErrorModal
        body={createNewContactsFromCSV?.error?.response?.data}
        isError={createNewContactsFromCSV.isError}
      />
      <Stack h={"100%"} mx={"xs"}>
        <PaperLayout mt={2}>
          <Group justify="space-between">
            <Group>
              <Avatar
                src={
                  groupDetails?.icon && getFileUrlFromKey(groupDetails?.icon)
                }
                alt={translations("profile pic")}
                size={"xl"}
                radius={"md"}
                color="initials"
                name={groupDetails?.name}
              />
              <Stack gap={0}>
                <Title>
                  {loadingState ? (
                    <Skeleton width={"60%"} h={38} my={4} />
                  ) : (
                    groupDetails?.name
                  )}
                </Title>
                <Group>
                  <Button
                    leftSection={<IconEdit></IconEdit>}
                    onClick={openEditModal}
                    variant="default"
                    disabled={loadingState}
                  >
                    {translations("Edit")}
                  </Button>
                  <FormModalLayout
                    centered
                    title={translations("Edit Group")}
                    opened={openedEditModal}
                    onClose={closeEditModal}
                    size="lg"
                  >
                    <CreateGroupModal
                      groupClose={closeEditModal}
                      isEdit={true}
                      groupDetails={groupDetails}
                      gTags={cTags?.contactGroupTags}
                    />
                  </FormModalLayout>

                  <Button
                    variant="light"
                    leftSection={<IconTrash></IconTrash>}
                    color="red"
                    onClick={openDeleteModal}
                    disabled={loadingState}
                  >
                    {translations("Delete this Group")}
                  </Button>
                </Group>
              </Stack>
            </Group>
            <Group gap={"xl"}>
              {loadingState ? (
                <Skeleton width={50} h={30} radius={"lg"} />
              ) : (
                <Badge
                  color="var(--tertiary-color)"
                  variant="outline"
                  size="xl"
                >
                  {groupDetails?.team?.name}
                </Badge>
              )}
              <Stack gap={0}>
                <Center>
                  <Title c="var(--tertiary-color)" order={3}>
                    {groupDetails?._count?.contacts ?? 0}
                  </Title>
                </Center>
                <Text>{translations("members")}</Text>
              </Stack>
            </Group>
          </Group>
        </PaperLayout>
        <Stack flex={1} mb={"xs"}>
          <Group justify="space-between">
            <Title order={2}>{translations("Members")}</Title>
            <TextInput
              leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={translations("Search member")}
              rightSectionWidth={60}
              defaultValue={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              w={500}
            />
            <Box w={50} h={50} />
          </Group>

          <PaperLayout p={0} flex={1} mah={800}>
            <ContactTable
              columns={column}
              data={groupDetails?.contacts}
              tags={cTags}
              tab={WhatsappTableType.MEMBERS}
              open={open}
              groupId={groupDetails?.id}
              refetch={refetchgroupById}
              setSorting={setSorting}
              pagination={pagination}
              setPagination={setPagination}
              sorting={sorting}
              totalCount={groupDetails?.totalCount}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              isPending={loadingState}
            />
          </PaperLayout>
        </Stack>
      </Stack>
      <FormModalLayout
        onClose={close}
        opened={opened}
        title={translations("Add members")}
        size="xl"
        centered
      >
        <AddCustomerModal
          groupId={groupDetails?.id}
          close={close}
          existingContactIds={groupDetails?.contacts?.map((c) => c.id)}
          tags={cTags?.contactTags}
          createNewContactsFromCSV={createNewContactsFromCSV}
        />
      </FormModalLayout>
    </Box>
  );
}
