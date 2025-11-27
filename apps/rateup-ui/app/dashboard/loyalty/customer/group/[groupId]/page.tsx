"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { ContactGroupType, LoyaltyActionType } from "@/types/enums";
import {
  useAddNewContactFromCSVMutation,
  useDeleteGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import {
  useAddNewCustomersFromCSVMutation,
  useCustomerGroupById,
} from "@/backend/loyalty/customerGroup/customerGroup.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import AddCustomerModal from "@/components/Contacts/AddCustomerModal";
import ContactImportErrorModal from "@/components/Contacts/ContactImportErrorModal";
import CreateGroupModal from "@/components/Contacts/CreateGroupModal";
import {
  CONTACT_SORT,
  WhatsappTableType,
} from "@/components/Contacts/utils/utils";
import LoyaltyCustomerAction from "@/components/LoyaltyComponents/Customer/LoyaltyCustomerAction";
import LoyaltyCustomerRedeems from "@/components/LoyaltyComponents/Customer/LoyaltyCustomerRedeems";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
import { useRouteParams } from "@/context/RouteParamsContext";
import { PAGE_SIZE } from "@/utils/constants";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { RedeemStatus } from "../../../redeem/page";
import { generateColumns } from "../../page";

export default function ContactGroup() {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const [openedActions, { open: openActions, close: closeActions }] =
    useDisclosure(false);
  const [openedRedeems, { open: openRedeems, close: closeRedeems }] =
    useDisclosure(false);
  const [customerActions, setCustomerActions] = useState([]);
  const [customerRedeems, setCustomerRedeems] = useState([]);
  const translations = useTranslations();
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;

  const [openedEditModal, setOpenEditModal] = useState(false);
  const { update } = useRouteParams();
  const createNewContactsFromCSV = useAddNewContactFromCSVMutation(
    groupId?.toString(),
  );

  const {
    isPending: isLoading,
    data: groupDetails,
    error: groupByIderror,
    refetch: refetchgroupById,
    isRefetching,
  } = useCustomerGroupById(
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

  const column = generateColumns(
    openActions,
    openRedeems,
    setCustomerActions,
    setCustomerRedeems,
  );
  const data = useMemo(() => {
    return groupDetails?.loyaltyCustomers?.map((c) => {
      const actionObj = {};
      Object.values(LoyaltyActionType).map((a) => (actionObj[a] = []));
      return {
        id: c.id,
        name: c.Contact.name,
        phone: c.Contact.phone,
        email: c.email,
        createdAt: c.createdAt,
        ...actionObj,
        referralCodes: c.referralCodes?.map((r) => r.referralCode),
        redeems: c.redeems?.filter((r) => r.status === RedeemStatus.COMPLETED),
        totalPoints: c.totalEarnedPoints,
        balancePoints: c.totalEarnedPoints - c.redeemedPoints,
      };
    });
  }, [groupDetails?.loyaltyCustomers]);

  const addNewCustomersFromCSVMutation = useAddNewCustomersFromCSVMutation(
    groupId?.toString(),
  );

  const loadingState = isLoading || isRefetching;
  if (groupByIderror) return <ErrorComponent refetch={refetchgroupById} />;

  return (
    <Box h={"100%"}>
      <ContactImportErrorModal
        body={createNewContactsFromCSV?.error?.response?.data}
        isError={createNewContactsFromCSV.isError}
      />
      <Stack h={"100%"}>
        <PaperLayout style={{ overflow: "visible" }}>
          <Group justify="space-between">
            <Group>
              <Avatar
                src={
                  groupDetails?.icon && getFileUrlFromKey(groupDetails?.icon)
                }
                alt={translations("profile pic")}
                size={"xl"}
                radius={"md"}
              >
                <IconUsersGroup size={40} />
              </Avatar>
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
                    onClick={() => setOpenEditModal(true)}
                    variant="default"
                    disabled={loadingState}
                  >
                    {translations("Edit Profile")}
                  </Button>
                  <CreateGroupModal
                    opened={openedEditModal}
                    setOpened={setOpenEditModal}
                    isEdit={true}
                    groupDetails={groupDetails}
                    type={ContactGroupType.LOYALTY}
                  />
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
                    {groupDetails?._count.LoyaltyCustomerMap ?? 0}
                  </Title>
                </Center>
                <Text>{translations("members")}</Text>
              </Stack>
            </Group>
          </Group>
        </PaperLayout>
        <Stack mt={"xs"} flex={1}>
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
              data={data ?? []}
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
              toggle={open}
              btnTitle={translations("Add Customer")}
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
          existingContactIds={[]}
          createNewContactsFromCSV={addNewCustomersFromCSVMutation}
          type={ContactGroupType.LOYALTY}
        />
      </FormModalLayout>
      <FormModalLayout
        opened={openedActions}
        onClose={closeActions}
        title=""
        centered
        size="lg"
      >
        <LoyaltyCustomerAction actions={customerActions} />
      </FormModalLayout>
      <FormModalLayout
        opened={openedRedeems}
        onClose={closeRedeems}
        title=""
        centered
        size="lg"
      >
        <LoyaltyCustomerRedeems redeems={customerRedeems} />
      </FormModalLayout>
    </Box>
  );
}
