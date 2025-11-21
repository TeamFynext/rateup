// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";

// import { useDebouncedState, useDisclosure } from "@mantine/hooks";
// import { modals } from "@mantine/modals";

// import {
//   ColumnDef,
//   ColumnFiltersState,
//   SortingState,
// } from "@tanstack/react-table";
// import { useTranslations } from "next-intl";

// import {
//   useAddNewContactFromCSVMutation,
//   useContactGroupById,
//   useDeleteGroupMutation,
// } from "@/backend/campaign/contactGroup/contactGroup.query";
// import ErrorComponent from "@/components/404/ErrorComponent";
// import AddCustomerModal from "@/components/Contacts/AddCustomerModal";
// import ContactImportErrorModal from "@/components/Contacts/ContactImportErrorModal";
// import CreateGroupModal from "@/components/Contacts/CreateGroupModal";
// import { ParticipantMenu } from "@/components/Contacts/GroupParticipant";
// import {
//   CONTACT_SORT,
//   contactColumn,
//   WhatsappTableType,
// } from "@/components/Contacts/utils/utils";
// import ContactTable from "@/components/Table/ContactTable";
// import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
// import { useRouteParams } from "@/context/RouteParamsContext";
// import { PAGE_SIZE } from "@/utils/constants";
// import { getFileUrlFromKey } from "@/utils/file-upload/upload";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { ArrowLeft } from "lucide-react";

// export default function ContactGroup() {
//   const [opened, { open, close }] = useDisclosure(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
//   const [pagination, setPagination] = useState({
//     pageIndex: 0,
//     pageSize: Number(PAGE_SIZE[0]),
//   });
//   const translations = useTranslations();
//   const [columnFilters, setColumnFilters] =
//     useDebouncedState<ColumnFiltersState>([], 200);
//   const router = useRouter();
//   const params = useParams();
//   const groupId = params?.groupId as string;
//   const [openedEditModal, { open: openEditModal, close: closeEditModal }] =
//     useDisclosure(false);
//   const { update } = useRouteParams();
//   const { customFields } = useCustomFieldsContext();
//   const createNewContactsFromCSV = useAddNewContactFromCSVMutation(
//     groupId?.toString(),
//   );

//   const {
//     isPending: isLoading,
//     data: groupDetails,
//     error: groupByIderror,
//     refetch: refetchgroupById,
//     isRefetching,
//   } = useContactGroupById(
//     groupId?.toString(),
//     true,
//     pagination,
//     searchTerm,
//     sorting?.[0],
//     columnFilters,
//   );

//   const deleteGroupMutation = useDeleteGroupMutation();

//   const openDeleteModal = () => {
//     modals.openConfirmModal({
//       title: translations("Delete Group"),
//       centered: true,
//       children: (
//         <p className="text-sm">
//           {translations(
//             "Are you sure you want to delete this group? This action is destructive and you will have to contact support to restore your data.",
//           )}
//         </p>
//       ),
//       labels: { confirm: translations("Ok"), cancel: translations("cancel") },
//       confirmProps: { color: "red" },
//       onCancel: () => modals.closeAll(),
//       onConfirm: () => deleteContactGroup(),
//     });
//   };
//   const deleteContactGroup = () => {
//     deleteGroupMutation.mutate(groupId, {
//       onSuccess: () => {
//         router.push("/dashboard/contacts?tab=groups");
//       },
//     });
//   };

//   useEffect(() => {
//     update({ groupId: groupDetails?.name });
//   }, [groupDetails?.name]);

//   const column: ColumnDef<any>[] = [
//     ...contactColumn(customFields ?? []),
//     {
//       header: () => "Action",
//       accessorFn: (row) => row,
//       enableSorting: false,
//       enableColumnFilter: false,
//       id: "action",
//       cell: (info) => (
//         <ParticipantMenu
//           contactId={info.row.original.id}
//           groupId={groupDetails?.id}
//         />
//       ),
//     },
//   ];
//   const loadingState = isLoading || isRefetching;
//   if (groupByIderror) return <ErrorComponent refetch={refetchgroupById} />;

//   return (
//     <div className="h-full">
//       <ContactImportErrorModal
//         body={createNewContactsFromCSV?.error?.response?.data}
//         isError={createNewContactsFromCSV.isError}
//       />
//       <div className="flex-shrink-0">
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={() => {
//             router.push("/dashboard/groups")
//           }}
//           className="gap-2 hover:bg-gray-100 h-8"
//         >
//           <ArrowLeft className="w-4 h-4" />
//           Back to Groups
//         </Button>
//       </div>
//       <div >
//         <Card>
//           <div className="flex justify-between items-center">
//             <div className="flex gap-2">
//               <Avatar
//                 src={
//                   groupDetails?.icon && getFileUrlFromKey(groupDetails?.icon)
//                 }
//                 alt={translations("profile pic")}
//                 size={"xl"}
//                 radius={"md"}
//                 color="initials"
//                 name={groupDetails?.name}
//               />
//               <Stack gap={0}>
//                 <Title>
//                   {loadingState ? (
//                     <Skeleton width={"60%"} h={38} my={4} />
//                   ) : (
//                     groupDetails?.name
//                   )}
//                 </Title>
//                 <Group>
//                   <Button
//                     leftSection={<IconEdit></IconEdit>}
//                     onClick={openEditModal}
//                     variant="default"
//                     disabled={loadingState}
//                   >
//                     {translations("Edit")}
//                   </Button>
//                   <FormModalLayout
//                     centered
//                     title={translations("Edit Group")}
//                     opened={openedEditModal}
//                     onClose={closeEditModal}
//                     size="lg"
//                   >
//                     <CreateGroupModal
//                       groupClose={closeEditModal}
//                       isEdit={true}
//                       groupDetails={groupDetails}
//                     />
//                   </FormModalLayout>

//                   <Button
//                     variant="light"
//                     leftSection={<IconTrash></IconTrash>}
//                     color="red"
//                     onClick={openDeleteModal}
//                     disabled={loadingState}
//                   >
//                     {translations("Delete this Group")}
//                   </Button>
//                 </Group>
//               </Stack>
//             </div>
//             <Group gap={"xl"}>
//               {loadingState ? (
//                 <Skeleton width={50} h={30} radius={"lg"} />
//               ) : (
//                 <Badge
//                   color="var(--tertiary-color)"
//                   variant="outline"
//                   size="xl"
//                 >
//                   {groupDetails?.team?.name}
//                 </Badge>
//               )}
//               <Stack gap={0}>
//                 <Center>
//                   <Title c="var(--tertiary-color)" order={3}>
//                     {groupDetails?._count?.contacts ?? 0}
//                   </Title>
//                 </Center>
//                 <Text>{translations("members")}</Text>
//               </Stack>
//             </Group>
//           </div>
//         </Card>
//         <Stack flex={1} mb={"xs"}>
//           <Group justify="space-between">
//             <Title order={2}>{translations("Members")}</Title>
//             <TextInput
//               leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
//               radius="xl"
//               size="md"
//               placeholder={translations("Search member")}
//               rightSectionWidth={60}
//               defaultValue={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               w={500}
//             />
//             <Box w={50} h={50} />
//           </Group>

//           <PaperLayout p={0} flex={1} mah={800}>
//             <ContactTable
//               columns={column}
//               data={groupDetails?.contacts}
//               tab={WhatsappTableType.MEMBERS}
//               open={open}
//               groupId={groupDetails?.id}
//               refetch={refetchgroupById}
//               setSorting={setSorting}
//               pagination={pagination}
//               setPagination={setPagination}
//               sorting={sorting}
//               totalCount={groupDetails?.totalCount}
//               columnFilters={columnFilters}
//               setColumnFilters={setColumnFilters}
//               isPending={loadingState}
//             />
//           </PaperLayout>
//         </Stack>
//       </div>
//       <FormModalLayout
//         onClose={close}
//         opened={opened}
//         title={translations("Add members")}
//         size="xl"
//         centered
//       >
//         <AddCustomerModal
//           groupId={groupDetails?.id}
//           close={close}
//           existingContactIds={groupDetails?.contacts?.map((c) => c.id)}
//           createNewContactsFromCSV={createNewContactsFromCSV}
//         />
//       </FormModalLayout>
//     </div>
//   );
// }
