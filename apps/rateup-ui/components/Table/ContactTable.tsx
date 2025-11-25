"use client";
"use no memo";

import React, { useEffect, useMemo } from "react";

import { ActionIcon, Box, Divider, Flex, Group, Tooltip } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconCheck,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { ContactGroupType } from "@/types/enums";
import { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";

import { useRemoveMulitpleGroupParticipants } from "../../backend/campaign/campaignParticipants/campaignParticipants.query";
import {
  useDeleteManyContactGroupsMutation,
  useRemoveContactsFromGroup,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import {
  useDeleteManyContactsMutation,
  useExportContactsMutation,
} from "../../backend/campaign/contacts/contacts.query";
import { docsPath, PAGE_SIZE } from "../../utils/constants";
import { showLoadingToast, showSuccessToast } from "../../utils/notifications";
import InfoButton from "../Button/InfoButton";
import { RateupButtonBlue } from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import OpenCreateMenu from "../Contacts/OpenCreateMenu";
import {
  DETAIL_BTN,
  tabHeaderLabels,
  WhatsappTableType,
} from "../Contacts/utils/utils";
import { useVisibleColumnStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import ConfirmationModal from "../Modal/ConfirmationModal";
import FilterToggles from "./Filter/FilterToggle";
import TableLayout from "./TableContent";
import styles from "./TanstackTable.module.css";

function ContactTable({
  data,
  columns,
  enableFilter = true,
  enablePagination = true,
  enableColumnSelection = true,
  tab = WhatsappTableType.CONTACTS,
  open = () => {},
  groupId = "",
  btnTitle = "",
  toggle,
  refetch,
  pagination,
  setPagination,
  sorting,
  setSorting,
  totalCount,
  columnFilters,
  setColumnFilters,
  detailBtn = false,
  isPending = false,
  leftSection = null,
  contactGroupType = ContactGroupType.NORMAL,
}: Readonly<{
  data: any;
  columns: ColumnDef<any, any>[];
  enableFilter?: boolean;
  enablePagination?: boolean;
  enableColumnSelection?: boolean;
  tab?: string;
  open?: () => void;
  groupId?: string;
  btnTitle?: string;
  toggle?: () => void;
  refetch: () => void;
  pagination?;
  setPagination?;
  sorting;
  setSorting;
  totalCount?: number;
  columnFilters;
  setColumnFilters;
  detailBtn?: boolean;
  isPending?: boolean;
  leftSection?: React.ReactNode;
  contactGroupType?: ContactGroupType;
}>) {
  const [columnVisibility, setColumnVisibility] = React.useState({
    [DETAIL_BTN]: false,
  });
  const [filterVisibility, setFilterVisibility] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState({});
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const translations = useTranslations();
  const [
    dialogOpened,
    { toggle: toggleConfirmationModal, close: closeDialog },
  ] = useDisclosure(false);
  const deleteManyContactsMutation = useDeleteManyContactsMutation();
  const exportContact = useExportContactsMutation();

  const deleteManyContactGroupsMutation = useDeleteManyContactGroupsMutation(
    () => {
      setRowSelection({});
    },
  );
  const removeContactsMutation = useRemoveContactsFromGroup(groupId);
  const removeMulitpleGroupParticipants = useRemoveMulitpleGroupParticipants(
    groupId,
    () => {
      setRowSelection({});
    },
  );

  const tempVisibleColumnArray = useMemo(() => [], []);

  useEffect(() => {
    if (tempVisibleColumnArray)
      useVisibleColumnStore
        .getState()
        .updateVisibleColumnArray(tempVisibleColumnArray);
  }, [tempVisibleColumnArray]);
  let initialState = {};
  if (!pagination) {
    initialState = {
      pagination: {
        pageSize: Number(PAGE_SIZE[0]),
      },
    };
  }
  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      sorting,
      columnFilters,
      rowSelection,
      ...(pagination ? { pagination } : {}),
    },
    initialState,
    rowCount: totalCount,
    manualPagination: !!pagination,
    manualSorting: !!pagination,
    manualFiltering: !!pagination,
    ...(pagination ? { onPaginationChange: setPagination } : {}),
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
  });
  const { headerLabel, headerTitle, tooltipMsg } = tabHeaderLabels[tab] || {};
  return (
    <Box className={styles["tanstack-table-root-div"]}>
      <Flex
        className={styles["filter-and-other-btns-container"]}
        gap={"md"}
        justify={"space-between"}
        px={"xs"}
        direction={largeScreen ? "row" : "column"}
      >
        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={closeDialog}
          headerLabel={headerLabel}
          headerTitle={headerTitle}
          confirmLabel="Delete"
          onConfirm={() => {
            const selectedIds = Object.keys(rowSelection)?.map(
              (index) => data?.[parseInt(index)]?.id,
            );
            switch (tab) {
              case WhatsappTableType.CONTACTS:
                showLoadingToast(
                  translations("Contacts getting deleted"),
                  "contact-delete",
                  true,
                  "Deleting Contacts",
                );
                deleteManyContactsMutation?.mutate(selectedIds);
                break;
              case WhatsappTableType.GROUPS:
                showLoadingToast(
                  translations("Contact groups getting deleted"),
                  "contact-group-delete",
                  true,
                  translations("Deleting Contact Groups"),
                );
                deleteManyContactGroupsMutation.mutate(selectedIds);
                break;
              case WhatsappTableType.MEMBERS:
                showLoadingToast(
                  translations("Members getting removed"),
                  "contact-group-remove",
                  true,
                  translations("Removing Members"),
                );
                removeContactsMutation.mutate({
                  contactIds: selectedIds,
                  groupId,
                });
                break;
              case WhatsappTableType.PARTICIPANTS:
                showLoadingToast(
                  translations("Participants getting removed"),
                  "campaign-mulitiple-participants-remove",
                  true,
                  translations("Removing Participants"),
                );
                removeMulitpleGroupParticipants.mutate({
                  data: selectedIds,
                  campaignId: groupId,
                });
                break;
              default:
                break;
            }
          }}
        />
        <Group mr={"auto"}>
          {leftSection ? (
            leftSection
          ) : (
            <>
              {" "}
              {Object.keys(rowSelection)?.length > 0 ? (
                <Tooltip
                  label={` ${translations("Click to")} ${tooltipMsg}`}
                  onClick={toggleConfirmationModal}
                >
                  <ActionIcon variant="light">
                    <IconTrash />
                  </ActionIcon>
                </Tooltip>
              ) : (
                <Tooltip label={translations("Select an item to delete")}>
                  <ActionIcon variant="light" disabled>
                    <IconTrash />
                  </ActionIcon>
                </Tooltip>
              )}
              {toggle ? (
                <Group>
                  <RateupButtonBlue
                    title={btnTitle}
                    rightIcon={<IconPlus />}
                    onClick={toggle}
                  />
                  <ActionIcon
                    onClick={refetch}
                    variant="light"
                    loading={isPending}
                  >
                    <IconRefresh />
                  </ActionIcon>
                </Group>
              ) : (
                <Group gap={"sm"}>
                  <OpenCreateMenu
                    tab={tab}
                    toggle={open}
                    isPending={isPending}
                    type={contactGroupType}
                  />
                  <Tooltip label={translations("Refresh")}>
                    <ActionIcon
                      variant="light"
                      onClick={async () => {
                        showLoadingToast(
                          translations("Data getting loaded"),
                          "contacts",
                          true,
                          translations("Loading"),
                        );
                        await refetch();
                        showSuccessToast(
                          translations("Data updated"),
                          "contacts",
                          <IconCheck />,
                          true,
                        );
                      }}
                    >
                      <IconRefresh stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>
                  <InfoButton docUrl={`${docsPath}/whatsappSurvey/contacts`} />
                </Group>
              )}
            </>
          )}
        </Group>
        <FilterToggles
          enableFilter={enableFilter}
          filterVisibility={filterVisibility}
          table={table}
          tempVisibleColumnArray={tempVisibleColumnArray}
          enableColumnSelection={enableColumnSelection}
          setFilterVisibility={setFilterVisibility}
          enableExport={tab === WhatsappTableType.CONTACTS}
          onExport={exportContact}
        />
      </Flex>
      <Divider />
      <TableLayout
        enableFilter={enableFilter}
        enablePagination={enablePagination}
        filterVisibility={filterVisibility}
        table={table}
        tempVisibleColumnArray={tempVisibleColumnArray}
        detailBtn={detailBtn}
        isPending={isPending}
      />
    </Box>
  );
}
export default ContactTable;
